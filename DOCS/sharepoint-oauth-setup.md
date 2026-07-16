# Per-tenant SharePoint OAuth — setup & testing

Each tenant (cabinet) connects their **own** Microsoft 365 org. The platform holds
one multitenant Entra ID app registration; every tenant's admin consents to it
inside their own org, and we store that tenant's refresh token separately. Make.com
scenarios never hold Microsoft credentials — they ask our token broker for a fresh
access token, then call Graph themselves.

---

## 1. Register the Azure app (do this once, by hand)

You need a Microsoft account with permission to create app registrations. Everything
below happens in the [Azure Portal](https://portal.azure.com) → **Microsoft Entra ID**.

### 1.1 Create the registration

**Entra ID → App registrations → New registration.**

- **Name**: anything — `Acuria Platform` is fine. Customers see this on the consent
  screen, so use something they'll recognise.
- **Supported account types**: choose
  **"Accounts in any organizational directory (Any Microsoft Entra ID tenant — Multitenant)"**.

  This is the one choice you cannot get wrong. The default ("Single tenant") means
  only *your* Microsoft org can ever sign in — every customer would fail with
  `AADSTS50020`. If you pick wrong you can change it later under
  *Authentication → Supported account types*, but change it before any tenant tries
  to connect.

  Ignore the fourth option ("…and personal Microsoft accounts"). Personal accounts
  have no SharePoint sites, so it only widens the attack surface.

- **Redirect URI**: platform **Web**, value:
  ```
  {API_BASE_URL}/oauth/sharepoint/callback
  ```
  In local dev that is `http://localhost:3001/api/oauth/sharepoint/callback`.
  In production it is your Render backend URL + `/api/oauth/sharepoint/callback`.

  It must match `AZURE_REDIRECT_URI` **exactly** — Microsoft does a literal string
  comparison, so a trailing slash or `http` vs `https` will fail with
  `AADSTS50011`. Add both the local and production URIs to the same registration so
  one app covers both.

  Must be type **Web**, not "Single-page application". SPA redirect URIs enforce
  PKCE and reject the client-secret exchange we do on the server.

### 1.2 Add Graph permissions

**API permissions → Add a permission → Microsoft Graph → Delegated permissions.**

Add exactly two:

| Permission | Why |
|---|---|
| `Sites.ReadWrite.All` | Read the org's site list and read/write files in its document libraries. |
| `offline_access` | Returns a refresh token. Without it we get a one-hour access token and nothing else — background uploads would be impossible. |

**Delegated**, not Application. Delegated means we act *as the admin who consented*,
constrained by their own permissions. Application permissions would grant us blanket
tenant-wide access independent of any user — far more power than this needs, and it
requires admin consent in every org regardless.

**Do not** substitute `Files.ReadWrite.All`. It looks narrower but isn't a
replacement: it covers drive items and not site resolution, so `GET /sites/root`
(how we auto-detect the tenant's site) would fail. `Sites.ReadWrite.All` is the
minimum that actually works for this flow.

You do **not** need to click "Grant admin consent" here — that button only affects
*your* org. Each customer's admin consents in their own org when they run the flow.

> **Expect admin consent to be required.** `Sites.ReadWrite.All` is a
> high-privilege scope; most orgs require a Microsoft 365 admin to approve it. A
> non-admin user hits `AADSTS65001`, which the callback maps to a specific "your
> Microsoft admin must approve" message. If a customer reports it, the fix is on
> their side: an admin either runs the connect flow themselves, or pre-approves the
> app at `https://login.microsoftonline.com/{their-tenant}/adminconsent?client_id={AZURE_CLIENT_ID}`.

### 1.3 Create the client secret

**Certificates & secrets → Client secrets → New client secret.** Pick the longest
expiry offered (24 months).

Copy the **Value** column immediately — not the "Secret ID". The Value is shown once
and is unrecoverable after you leave the page; the Secret ID is useless to us.

**Put a calendar reminder for the expiry date.** When a secret expires, every
tenant's connection breaks at once, and the failure looks like a mass token-refresh
error rather than anything obviously secret-related.

### 1.4 Collect the values

From **Overview**, copy the **Application (client) ID**. Then set in `backend/.env`:

```bash
AZURE_CLIENT_ID=<Application (client) ID>
AZURE_CLIENT_SECRET=<the secret Value from 1.3>
AZURE_REDIRECT_URI=http://localhost:3001/api/oauth/sharepoint/callback
API_BASE_URL=http://localhost:3001/api

# Encrypts every tenant's OAuth tokens at rest.
TOKEN_ENCRYPTION_KEY=<64 hex chars — see below>
```

Generate the encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Ignore the "Directory (tenant) ID" on the Overview page — that's *your* org, and this
integration deliberately never uses it. We authorize against `/common/` because we
don't know which org a user belongs to until they sign in; from then on each tenant's
own `tid` (captured from the token response) is used for their refreshes.

**Endpoints** are fixed and already hardcoded in `services/sharepoint/oauth.ts`:

| Purpose | URL |
|---|---|
| Authorize | `https://login.microsoftonline.com/common/oauth2/v2.0/authorize` |
| Token (initial exchange) | `https://login.microsoftonline.com/common/oauth2/v2.0/token` |
| Token (refresh) | `https://login.microsoftonline.com/{their-tid}/oauth2/v2.0/token` |

---

## 2. Get a free test tenant (Microsoft 365 Developer Program)

You need a *second* Microsoft org to test properly — connecting your own org proves
the code runs but proves nothing about multitenancy.

1. Go to <https://developer.microsoft.com/microsoft-365/dev-program> and **Join now**
   with any Microsoft account.
2. Answer the profile questions. For "What are you interested in building?" pick
   anything; it only affects sample content.
3. Choose **Instant sandbox** (not "Configurable"). Instant gives you a ready E5 org
   with SharePoint provisioned and 16 fake users.
4. Pick a domain prefix — you get `yourprefix.onmicrosoft.com` — and set an admin
   password. Save these; there is no recovery flow.
5. Wait for provisioning (a few minutes), then visit
   `https://yourprefix.sharepoint.com` to confirm SharePoint is live.

The sandbox renews automatically for as long as you keep using it, and its admin is a
real Global Administrator — so you can test the admin-consent path, which is the one
most likely to bite real customers.

> Microsoft has periodically restricted new Developer Program signups. If Instant
> sandbox isn't offered, a Microsoft 365 Business Standard trial works too — it's a
> real org with SharePoint, free for a month.

---

## 3. Manual test checklist

Prerequisites: `backend/.env` filled in per §1.4, `npm run setup --workspace=backend`
run once, `npm run dev` running.

### 3.1 Schema

- [ ] `npm run setup --workspace=backend` → migration 16 logs the ten new
      `sharepoint_*` fields and `✓ deleted field "sharepoint_path_base"`.
- [ ] Run it a **second** time → same fields report "already exists", delete reports
      "not found, skipping". (There is no migration ledger — every migration re-runs
      on every setup, so idempotency is load-bearing.)

### 3.2 The removed path field

- [ ] Log in as **super_admin** → Tenants → "Personnaliser le tenant" → the
      "Chemin SharePoint" field is gone; saving branding still works.
- [ ] `GET /api/platform/tenants` returns `sharepoint: { connected, siteId, … }` per
      tenant and **no** `sharepointPathBase`.

### 3.3 The gate

- [ ] Log in as a **tenant_admin** of an unconnected tenant → the connect screen
      blocks the dashboard; sidebar navigation cannot escape it.
- [ ] Log in as a **standard_user** of the same tenant → "contact your administrator"
      screen; no Connect button.
- [ ] Log in as **super_admin** → dashboard loads normally, no gate.

### 3.4 Connect

- [ ] Click "Connecter SharePoint" → redirected to Microsoft.
- [ ] Sign in with the **sandbox admin** → consent screen lists "Read and write items
      in all site collections" → Accept.
- [ ] Redirected to `/dashboard/integrations?sharepoint=connected`; success toast;
      site display name shown; Site ID and Drive ID prefilled; the dashboard is now
      reachable.
- [ ] **Consent denial**: disconnect, reconnect, click *Cancel* on the Microsoft
      consent screen → back at `?sharepoint=error&reason=consent_denied` with a
      French message, not a raw error.
- [ ] **Non-admin path**: connect as a *non-admin* sandbox user → expect
      `reason=admin_consent_required` and the "your Microsoft admin must approve"
      message.

### 3.5 Tokens are encrypted

- [ ] Open the tenant's row in Baserow directly. `sharepoint_access_token` and
      `sharepoint_refresh_token` must both start with `v1:` and be unreadable.
- [ ] `curl` the tenant list as super_admin and grep the response for the raw token —
      **must not appear anywhere**:
      ```bash
      curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
        http://localhost:3001/api/platform/tenants | grep -c "sharepoint_access_token"
      # expect 0
      ```

### 3.6 Token broker + a real upload

- [ ] Fetch a token as Make would:
      ```bash
      curl -s -H "Authorization: $WEBHOOK_SECRET" \
        http://localhost:3001/api/tenants/{tenantId}/sharepoint/token
      # → { "access_token": "...", "site_id": "...", "drive_id": "...", "expires_at": "..." }
      ```
- [ ] Upload a file to the tenant's SharePoint with that token:
      ```bash
      echo "hello from acuria" > test.txt
      curl -X PUT \
        -H "Authorization: Bearer {access_token}" \
        -H "Content-Type: text/plain" \
        --data-binary @test.txt \
        "https://graph.microsoft.com/v1.0/sites/{site_id}/drive/root:/test.txt:/content"
      # → 201, and test.txt appears in the sandbox's Documents library
      ```
- [ ] No auth header → **401**. Wrong secret → **401**.

### 3.7 Refresh

- [ ] In Baserow, set `sharepoint_token_expires_at` to a past ISO date
      (e.g. `2020-01-01T00:00:00.000Z`). Call the broker again → a **different**
      `access_token` comes back and the expiry column has advanced ~1 hour.
- [ ] **Concurrency**: reset the expiry to the past, then fire two calls at once:
      ```bash
      curl -s -H "Authorization: $WEBHOOK_SECRET" \
        http://localhost:3001/api/tenants/{tenantId}/sharepoint/token &
      curl -s -H "Authorization: $WEBHOOK_SECRET" \
        http://localhost:3001/api/tenants/{tenantId}/sharepoint/token &
      wait
      ```
      Both must return the **same** token — one refresh, shared. (Microsoft rotates
      refresh tokens; two concurrent refreshes would race and one would persist a
      dead token.)
- [ ] **Dead refresh token**: paste garbage into `sharepoint_refresh_token`, expire
      the access token, call the broker → **409** with
      `code: "SHAREPOINT_REAUTH_REQUIRED"`, and the tenant's gate reappears in the UI.

### 3.8 Make webhook payloads

Point the six webhook env vars at a request bin (e.g. <https://webhook.site>), then
trigger each flow and inspect the captured body for `tenant_id` and `client_name`:

| Env var | How to trigger |
|---|---|
| `MAKE_WEBHOOK_DER` | Client → envoyer le DER |
| `MAKE_WEBHOOK_DER_DOCUSIGN` | Client → DER → DocuSign |
| `MAKE_WEBHOOK_LDM` | Client → envoyer la Lettre de Mission |
| `MAKE_WEBHOOK_FCC_DOCUSIGN` | Client → FCC → DocuSign |
| `MAKE_WEBHOOK_FCC_SUBMIT` | Submit the public FCC form at `/fcc/pp` |
| `MAKE_WEBHOOK_NOTE_UPLOAD` | Client → Notes → add a note **with an attachment** |

- [ ] All six payloads carry `tenant_id` and `client_name`.
- [ ] **The multi-tenancy test**: connect a *second* tenant to a *different*
      Microsoft org, then hit the broker for each `tenant_id` and confirm the
      returned `site_id`/`drive_id` differ. A single tenant working proves nothing.

### 3.9 Disconnect

- [ ] Integrations → Déconnecter → confirm → all ten `sharepoint_*` columns cleared
      in Baserow.
- [ ] The gate reappears for that tenant's admin.
- [ ] Broker now returns **409** `code: "SHAREPOINT_NOT_CONNECTED"`.
- [ ] Reconnecting works from a clean state.

> Disconnect intentionally does not revoke on Microsoft's side — there is no
> programmatic revocation for this flow. It drops our copy of the tokens, which is
> what stops the platform from acting on their behalf. A tenant who wants the grant
> fully revoked must also remove the app at <https://myapps.microsoft.com> → the
> app's "..." menu → Manage → Revoke.

---

## 4. Migrating your Make.com scenarios off the fixed NM Prime connection

The old scenarios upload with Make's built-in **Microsoft 365 / SharePoint** module,
which is bound to a single connection (NM Prime's account). That's exactly what the
per-tenant flow replaces. In every document-writing scenario you swap that one module
for **two HTTP modules**: one that fetches a token for *this webhook's* tenant, and
one that PUTs the file to Graph with it.

Each webhook body carries `tenant_id` (and `client_name`). The `tenant_id` is the
one field Make needs — it fetches the access token *and* the site/drive from the
broker with it. Site/drive are intentionally NOT in the payload; the broker is the
single source of truth.

### Step 1 — get a token for this tenant (new HTTP module, before the upload)

**HTTP → Make a request:**

| Field | Value |
|---|---|
| URL | `{API_BASE_URL}/tenants/{{tenant_id}}/sharepoint/token` |
| Method | `GET` |
| Headers | `Authorization` = your `WEBHOOK_SECRET` value |
| Parse response | **Yes** |

`{{tenant_id}}` maps from the webhook trigger's body. The response is
`{ access_token, site_id, drive_id, expires_at }`.

You don't need to cache or refresh anything in Make — the broker returns a token
that's valid for at least two more minutes, refreshing on its side when needed.

### Step 2 — upload to Graph (replaces the old SharePoint module)

**HTTP → Make a request:**

| Field | Value |
|---|---|
| URL | `https://graph.microsoft.com/v1.0/drives/{{drive_id}}/root:/{{folder}}/{{filename}}:/content` |
| Method | `PUT` |
| Headers | `Authorization` = `Bearer {{access_token}}` (from step 1) |
| Body content type | **Custom** (see below) |
| Content type | `application/pdf` (or the webhook's `{{mimeType}}` for note attachments) |
| Request content | the **binary** file from the earlier module |

- **Body content type = `Custom`.** Make's HTTP module has no "raw/binary" option;
  `Custom` is how you send a raw body with your own content type, which is what the
  Graph `/content` endpoint expects. It then shows a *Content type* field (set the
  MIME type) and a *Request content* field (the body).
- **The body must be binary, not base64.** If an earlier module already produced a
  binary file (e.g. a Google Docs → PDF export), map its file/`data` output directly.
  If the file arrived as base64 in the webhook (the FCC submit flow sends
  `pdf_base64`), decode it first: `{{toBinary(1.pdf_base64)}}` — Graph rejects raw
  base64 text.
- `{{drive_id}}` and `{{access_token}}` come from step 1's parsed response — the
  broker returns both, so the webhook payload doesn't (and no longer) ship them.
- `{{folder}}` is yours to choose — this is where the old `sharepoint_path_base`
  decision now lives. E.g. `Documents Réglementaires/{{client_name}}` (the webhook
  now always sends `client_name`). Graph creates intermediate folders automatically.
- Simple PUT handles files up to 250 MB, which covers every DER/LdM/FCC PDF. No
  upload session needed.

If you'd rather address by site than by drive, the equivalent URL is
`https://graph.microsoft.com/v1.0/sites/{{site_id}}/drive/root:/{{folder}}/{{filename}}:/content`.

### Step 3 — delete the old module and its connection

Remove the built-in Microsoft 365 / SharePoint upload module. Its stored connection
(NM Prime) is no longer used by these scenarios — leave it in Make only if some other
scenario still needs it.

### Step 4 — handle a broken connection

Put an error handler on the **step 1** call. A **409** means this tenant's SharePoint
isn't usable — branch to a notification (email the back office, post to Slack…)
rather than letting the scenario fail silently:

| `code` in the 409 body | Meaning | Suggested action |
|---|---|---|
| `SHAREPOINT_NOT_CONNECTED` | Never connected, or no site/drive chosen. | Notify the cabinet's admin to connect it in the dashboard. |
| `SHAREPOINT_REAUTH_REQUIRED` | Refresh token revoked or expired. | Notify the admin to reconnect; the platform already re-raises their connect screen. |

### Which scenarios need this

All six that write to SharePoint: **DER**, **DER→DocuSign**, **LdM**,
**FCC→DocuSign**, **FCC submit**, and **note attachment upload**. Do them one at a
time and re-run §3.6/§3.8 against each after editing.

> **One app, every tenant.** You do *not* create a Make connection per tenant. Make
> never authenticates to Microsoft at all now — it only ever calls our broker, which
> holds each tenant's tokens. That's the whole point of the broker: Make stays
> tenant-agnostic and the same scenario serves every cabinet.
