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
- **Attachments**: add a `message.attachments` array of
  `{"@odata.type":"#microsoft.graph.fileAttachment","name":"…","contentBytes":"<base64>"}`.
- Success = **HTTP 202** (no body).

### [4B] Gmail — `messages.send`

Gmail is meaningfully different: it does **not** take structured JSON. You send a
**base64url-encoded raw RFC 5322 MIME message** in a `raw` field.

**Step B-1 — build the MIME string.** Add a **Tools → Set variable** (or a text
aggregator) named `mime`:
```
To: {{1.to}}
From: {{2.sender_address}}
Subject: {{1.subject}}
Content-Type: text/html; charset="UTF-8"
MIME-Version: 1.0

{{1.body_html}}
```
> The blank line between headers and body is **required** by MIME. Keep the header
> lines exactly as shown (each `Header: value` on its own line).

**Step B-2 — base64url-encode it.** Gmail needs *base64url* (`+`→`-`, `/`→`_`),
which differs from standard base64. In Make, use the function:
```
{{replace(replace(base64(<mime variable>); "+"; "-"); "/"; "_")}}
```
(Trailing `=` padding is tolerated by Gmail; you may strip it with another
`replace(...; "="; "")` if you prefer.)

**Step B-3 — HTTP → Make a request:**

| Field | Value |
|---|---|
| URL | `https://gmail.googleapis.com/gmail/v1/users/me/messages/send` |
| Method | `POST` |
| Headers | `Authorization` = `Bearer {{2.access_token}}` |
| Body content type | `application/json` |

**Body:**
```json
{ "raw": "{{the base64url string from B-2}}" }
```
- Success = **HTTP 200** with a message resource `{ "id": "...", ... }`.
- **Attachments**: build a `multipart/mixed` MIME body with boundaries instead of
  the simple single-part message above. (Start with plain HTML; add multipart only
  when you need attachments.)

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
