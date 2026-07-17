# Make.com — sending email through the per-tenant token broker

Build this once in a Make scenario. It works for **every** tenant regardless of
whether they connected Microsoft 365 or Gmail — the broker tells you which, and a
Router branches to the right send API. Make never holds Microsoft or Google
credentials; it only ever calls our broker.

## Module sequence

```
[1] Webhook (trigger)
      → receives: tenant_id, to, subject, body_html (or body_text), [attachments]
[2] HTTP · Make a request  → GET our token broker
[3] Router
      ├─ Route A  (filter: {{2.provider}} = "microsoft")  → [4A] Graph sendMail
      └─ Route B  (filter: {{2.provider}} = "google")     → [4B] Gmail messages.send
[5] Error handler on [2]'s 409 → notify Acuria (Slack/email), stop
```

---

### [1] Webhook trigger

Your platform/backend posts the email job here. Expected fields:
`tenant_id`, `to`, `subject`, `body_html`, and optionally attachments. The
`tenant_id` is what the broker needs.

### [2] HTTP → Make a request (token broker)

| Field | Value |
|---|---|
| URL | `{API_BASE_URL}/tenants/{{1.tenant_id}}/email/token` |
| Method | `GET` |
| Headers | `Authorization` = your `WEBHOOK_SECRET` |
| Parse response | **Yes** |

Response (parsed → available as `{{2.…}}`):
```json
{ "provider": "microsoft" | "google", "access_token": "…", "sender_address": "…", "expires_at": "…" }
```
No caching needed — the broker returns a valid token and refreshes server-side.

### [3] Router — branch on provider

Add a **Router**. On each route set a filter:
- **Route A** condition: `{{2.provider}}` **equals** `microsoft`
- **Route B** condition: `{{2.provider}}` **equals** `google`

---

### [4A] Microsoft — Graph `sendMail`

**HTTP → Make a request:**

| Field | Value |
|---|---|
| URL | `https://graph.microsoft.com/v1.0/me/sendMail` |
| Method | `POST` |
| Headers | `Authorization` = `Bearer {{2.access_token}}` |
| Body content type | `application/json` (Custom → `application/json`) |

**Body** — Graph takes structured JSON (not raw MIME):
```json
{
  "message": {
    "subject": "{{1.subject}}",
    "body": {
      "contentType": "HTML",
      "content": "{{1.body_html}}"
    },
    "toRecipients": [
      { "emailAddress": { "address": "{{1.to}}" } }
    ]
  },
  "saveToSentItems": true
}
```
- `contentType`: `"HTML"` or `"Text"`.
- Multiple recipients → add more objects to `toRecipients`.
- The sender is implicit (`/me` = the connected mailbox). `{{2.sender_address}}` is
  informational / for logging.
- Success = **HTTP 202** (no body).

#### Attaching a file (Microsoft)

Say your file comes from a **Google Docs → Download a Document** module (module **2**
here — its file bytes are `{{2.data}}`). Add an `attachments` array inside `message`.
Copy-paste body **with an attachment**:

```json
{
  "message": {
    "subject": "{{1.subject}}",
    "body": { "contentType": "HTML", "content": "{{1.body_html}}" },
    "toRecipients": [ { "emailAddress": { "address": "{{1.to}}" } } ],
    "attachments": [
      {
        "@odata.type": "#microsoft.graph.fileAttachment",
        "name": "Document.pdf",
        "contentType": "application/pdf",
        "contentBytes": "{{base64(2.data)}}"
      }
    ]
  },
  "saveToSentItems": true
}
```

- `name` = the filename the recipient sees.
- `contentBytes` = the file turned into base64 text: **`{{base64(2.data)}}`** — replace
  `2` with your Download module's number.
- More files → add more objects to the `attachments` array.
- That's it. Graph handles the rest.

### [4B] Gmail — `messages.send`

**The mental model:** unlike Graph (where you fill in subject/body/to as separate
JSON fields), Gmail makes you hand it the **entire raw email as one blob** — the
`To`/`Subject`/`Content-Type` headers AND the HTML body, all together as a single
text, then scrambled into a URL-safe encoding called base64url. That's the only
"weird" part; it's three small modules.

#### Step B-1 — write the raw email as plain text

Add a **Tools → Set variable** module. Name it `rawEmail`. Paste this as its value
(it's just text — the header lines, then a **blank line**, then your HTML):

```
To: {{1.to}}
From: {{2.sender_address}}
Subject: Nouvelle FCC reçue - {{1.client_name}}
Content-Type: text/html; charset="UTF-8"
MIME-Version: 1.0

<p>Un nouveau formulaire "Connaissance Client" a été soumis.</p><table ...>…your one-line HTML…</table>
```

Rules that matter (this is where it usually goes wrong):
- **The blank line between the headers and the HTML is mandatory.** No blank line =
  Gmail treats your whole HTML as more headers and the email arrives empty.
- Each header is its own `Name: value` line. Don't indent them.
- The HTML body can stay on one line (like the version you already flattened).
- **Quotes in your HTML are fine here** — this is plain text, *not* JSON, so you do
  NOT escape the `"` in `style="…"`.

#### Step B-2 — encode it (base64url)

Gmail wants *base64url*, which is normal base64 with two characters swapped
(`+`→`-`, `/`→`_`). You don't compute this by hand — in the **next module's `raw`
field**, wrap the variable from B-1 with this exact Make formula:

```
{{replace(replace(base64(3.rawEmail); "+"; "-"); "/"; "_")}}
```

Reading it inside-out: `base64(...)` encodes the email → the inner `replace` swaps
`+` for `-` → the outer `replace` swaps `/` for `_`. (Replace `3.rawEmail` with the
actual module number of your Set variable.)

#### Step B-3 — send it (HTTP → Make a request)

| Field | Value |
|---|---|
| URL | `https://gmail.googleapis.com/gmail/v1/users/me/messages/send` |
| Method | `POST` |
| Headers | `Authorization` = `Bearer {{2.access_token}}` |
| Body content type | `application/json` |

**Body** — this one *is* JSON, and it's tiny (the whole email is already inside the
encoded string):
```json
{ "raw": "{{replace(replace(base64(3.rawEmail); \"+\"; \"-\"); \"/\"; \"_\")}}" }
```

Success = **HTTP 200** with `{ "id": "...", ... }`.

> **Accented subjects need one extra step.** A raw `Subject:` header with `é`/`ç`
> (like "reçue") can arrive as garbled text, because email headers are meant to be
> ASCII. Encode just the subject value:
> `Subject: =?UTF-8?B?{{base64("Nouvelle FCC reçue - " + 1.client_name)}}?=`
> The HTML body is unaffected — `charset="UTF-8"` already covers it. This only bites
> the Subject line.

#### Attaching a file (Gmail)

Gmail has no attachments field — the file goes **inside** the raw email as a second
section. In **Step B-1**, replace your `rawEmail` variable with this template (file
from a Google Docs → Download module, module **2**, bytes `{{2.data}}`):

```
From: {{2.sender_address}}
To: {{1.to}}
Subject: =?UTF-8?B?{{base64("Nouvelle FCC reçue")}}?=
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="ACURIABOUNDARY"

--ACURIABOUNDARY
Content-Type: text/html; charset="UTF-8"

<p>Un nouveau formulaire…</p><table>…your one-line HTML…</table>
--ACURIABOUNDARY
Content-Type: application/pdf; name="Document.pdf"
Content-Transfer-Encoding: base64
Content-Disposition: attachment; filename="Document.pdf"

{{base64(2.data)}}
--ACURIABOUNDARY--
```

Then Steps **B-2** and **B-3** are unchanged — the whole thing still gets base64url'd
into `{ "raw": … }`.

Exactly what each piece is (and the parts people forget):
- `boundary="ACURIABOUNDARY"` is just a separator label you invent. It appears in the
  header **and** before each section.
- Every section starts with `--ACURIABOUNDARY` on its own line. The very end is
  `--ACURIABOUNDARY--` (note the **two extra dashes** at the end — this is required).
- **A blank line after each section's own headers**, before its content — same rule
  as before, once per section.
- The attachment content is `{{base64(2.data)}}` — the file as base64 text. Change `2`
  to your Download module's number, and `Document.pdf` / `application/pdf` to match
  your file.
- More files → repeat the `--ACURIABOUNDARY` … block for each, before the final
  `--ACURIABOUNDARY--`.

---

### [5] Error handling — the broker's 409s

Attach an **error handler** to module **[2]**. A `409` means this tenant can't send —
branch to a notification (email/Slack to Acuria back office) rather than failing
silently or retrying forever. The body's `code` tells you which:

| `code` | Meaning | Action |
|---|---|---|
| `EMAIL_NOT_CONNECTED` | No email provider connected. | Ask the cabinet's admin to connect one in the dashboard. |
| `EMAIL_SCOPE_MISSING` | Microsoft grant lacks Mail.Send. | Ask the admin to reconnect Microsoft (the dashboard already prompts this). |
| `EMAIL_REAUTH_REQUIRED` | Refresh token revoked/expired. | Ask the admin to reconnect; the platform already re-raised their gate. |

Also handle non-200/202 from the send modules ([4A]/[4B]) — e.g. a transient Graph/
Gmail error — with a retry or alert as you see fit.

> **One scenario, every tenant.** You never build a per-tenant Make connection and
> Make never authenticates to Microsoft or Google. The broker holds each tenant's
> tokens and hands back a short-lived access token per call — that's what keeps this
> single scenario serving every cabinet.
