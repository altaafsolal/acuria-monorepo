# Per-tenant email OAuth — setup & testing

Each tenant (cabinet) connects **either** their Microsoft 365 mailbox (Graph
`sendMail`) **or** their Gmail account (Gmail API `messages.send`) as the sending
identity for the platform's transactional email. Recipients see mail from the
tenant's real address, never a shared sender.

This mirrors the SharePoint integration: OAuth on the platform, tokens stored
encrypted, a token broker Make.com calls. It is **independent** of SharePoint — a
tenant can send email from Gmail while storing documents in Microsoft SharePoint.

> **Why not SMTP?** Microsoft disabled Basic Auth for SMTP AUTH (March 2026) and
> Gmail has required App Passwords/OAuth for SMTP since 2022. This integration uses
> OAuth 2.0 + each provider's native send API, no SMTP.

Both providers redirect to **one** callback — `{API_BASE_URL}/oauth/email/callback` —
and the signed `state` carries which provider it was.

---

## 1. Extend the existing Azure app (Microsoft 365 email)

Microsoft email **reuses the same multitenant Azure app** you set up for SharePoint
(`docs/sharepoint-oauth-setup.md`). Two additions:

### 1.1 Add the Mail.Send permission

Entra ID → App registrations → your app → **API permissions → Add a permission →
Microsoft Graph → Delegated** → add **`Mail.Send`**. (You already have
`offline_access`; `openid`/`email` are default OIDC scopes and need no explicit
grant.)

Delegated, not Application — we send *as the admin who consented*, from their
mailbox, not as a tenant-wide daemon.

### 1.2 Register the email redirect URI

Authentication → Platform configurations → **Web → Redirect URIs → Add**:
```
{API_BASE_URL}/oauth/email/callback
```
e.g. `https://acuria-monorepo.onrender.com/api/oauth/email/callback`. This is a
*second* redirect URI on the same app, alongside the SharePoint one. Exact match,
type **Web**, no trailing slash.

### 1.3 Re-consent is required — and detected automatically

Adding `Mail.Send` means tenants must re-authorize before we can send on their
behalf. **The email connection is a separate grant from SharePoint**, so in practice
a tenant simply connects email for the first time (there's nothing to "upgrade").

The one edge the platform guards against: if a Microsoft grant somehow lacks
`Mail.Send`, the token broker returns `409 EMAIL_SCOPE_MISSING` and the dashboard
shows a "reconnect to grant email permission" banner. This is driven by the
`email_scopes_granted` column (we store the scopes Microsoft actually returned) —
no manual tracking needed.

No new environment variables for Microsoft — it reuses `AZURE_CLIENT_ID` /
`AZURE_CLIENT_SECRET`. Only `EMAIL_REDIRECT_URI` is new (shared with Google).

---

## 2. New Google Cloud OAuth app (Gmail)

Google has no Azure-style "any organization" multitenancy, so Gmail needs its **own**
Google Cloud project and OAuth client. Any Google Workspace or consumer Gmail user
then consents to *your* app individually.

### 2.1 Project + Gmail API

1. [Google Cloud Console](https://console.cloud.google.com) → create a project
   (e.g. `acuria-email`).
2. **APIs & Services → Library →** search **Gmail API → Enable**. (Only the Gmail
   API — you do not need any other.)

### 2.2 OAuth consent screen

3. **APIs & Services → OAuth consent screen.** User type **External** (so any
   tenant's Google account can consent, not just your org).
4. Fill in app name, support email, developer contact. Add your **privacy policy
   URL** and **homepage** — required for verification (see 2.5).
5. **Scopes → Add** exactly one:
   ```
   https://www.googleapis.com/auth/gmail.send
   ```
   Least privilege — we send only, never read. (`openid`/`email` are added
   automatically as basic OIDC scopes; we use the `email` claim to resolve the
   sender address.)

### 2.3 Credentials

6. **APIs & Services → Credentials → Create credentials → OAuth client ID →
   Application type: Web application.**
7. **Authorized redirect URIs → Add:**
   ```
   {API_BASE_URL}/oauth/email/callback
   ```
   The **same** URL registered on the Azure app. Exact match.
8. Copy the **Client ID** and **Client secret** → `GOOGLE_CLIENT_ID` /
   `GOOGLE_CLIENT_SECRET`.

### 2.4 Test users (before verification)

While the consent screen is in **Testing** mode, only explicitly-added test users can
connect — up to 100. **OAuth consent screen → Audience/Test users → Add users** →
add your own Gmail test address (and any pilot tenants). Un-added accounts get
"Access blocked: … has not completed the Google verification process."

### 2.5 Verification — start this NOW, in parallel

`gmail.send` is a **sensitive/restricted scope**, so Google requires app verification
before you exceed the 100 test-user cap or leave Testing mode. Review can take **days
to weeks** — begin it early so it isn't the thing blocking launch.

Prepare, then submit from the OAuth consent screen ("Publish app" → "Prepare for
verification"):
- **Privacy policy URL** on your domain, describing email data use.
- **Scope justification**: explain that `gmail.send` sends transactional compliance
  emails on the connected user's behalf; you never read mail.
- **Demo video**: the OAuth consent → connect → send-a-test-email flow end to end.
- Domain ownership verified in Google Search Console.

Development continues with test users while verification is pending.

---

## 3. Environment variables

Add to `backend/.env` (and Render — see `DEPLOYMENT.md`):

```bash
# Microsoft email reuses the Azure app — no new MS creds, just the shared callback.
GOOGLE_CLIENT_ID=<from step 2.3>
GOOGLE_CLIENT_SECRET=<from step 2.3>
EMAIL_REDIRECT_URI=https://acuria-monorepo.onrender.com/api/oauth/email/callback
```

`TOKEN_ENCRYPTION_KEY` and `WEBHOOK_SECRET` are already set for SharePoint and are
reused here. Run `npm run setup` once after deploying to apply migration 17 (adds the
`email_*` columns).

---

## 4. Testing

### 4.1 Microsoft — reuse your SharePoint test tenant

The **same Microsoft 365 Developer Program tenant** you use for SharePoint covers
email too — connecting email just requests the extra `Mail.Send` scope on the same
org. No second Microsoft account needed.

### 4.2 Gmail — add yourself as a test user

Per 2.4, add your own Gmail address under the consent screen's test users. Then you
can run the full connect + send flow against your own inbox while the app is still in
Testing mode.

### 4.3 Manual test checklist

- [ ] `npm run setup` → migration 17 logs the nine `email_*` fields; re-run to prove
      idempotency.
- [ ] Log in as **tenant_admin** of a tenant with SharePoint already connected → the
      onboarding gate now shows the **"choose Microsoft 365 or Gmail"** email screen
      and blocks the dashboard.
- [ ] **Connect Microsoft**: click Connect Microsoft 365 → consent → back to
      `?email=connected&provider=microsoft`, sender address shown, dashboard reachable.
- [ ] **Connect Gmail** (fresh tenant, or after disconnect): click Connect Gmail →
      consent with a test-user Gmail → back to `?email=connected&provider=google`.
- [ ] **standard_user** of an email-less tenant → "your admin must connect" screen.
- [ ] Tokens in Baserow (`email_access_token` / `email_refresh_token`) are `v1:`
      ciphertext; `GET /api/platform/tenants` never contains either.
- [ ] **Broker (Microsoft)**:
      ```bash
      curl -s -H "Authorization: $WEBHOOK_SECRET" \
        {API}/api/tenants/{tenantId}/email/token
      # → { "provider":"microsoft", "access_token":"...", "sender_address":"...", "expires_at":"..." }
      ```
      Then send with it:
      ```bash
      curl -X POST "https://graph.microsoft.com/v1.0/me/sendMail" \
        -H "Authorization: Bearer {access_token}" \
        -H "Content-Type: application/json" \
        -d '{"message":{"subject":"Test Acuria","body":{"contentType":"Text","content":"Hello"},"toRecipients":[{"emailAddress":{"address":"you@example.com"}}]},"saveToSentItems":true}'
      # → 202 Accepted, email arrives
      ```
- [ ] **Broker (Gmail)**: same broker call returns `provider":"google"`. Send with the
      raw-MIME body shown in `docs/make-email-integration.md`.
- [ ] **Forced refresh**: set `email_token_expires_at` to a past ISO date, call the
      broker → new `access_token`, expiry advanced. Two concurrent calls → one
      refresh (in-flight de-dup).
- [ ] **Reauth**: paste garbage into `email_refresh_token`, expire the access token,
      call broker → `409 EMAIL_REAUTH_REQUIRED`, tokens cleared, gate re-appears.
- [ ] **Disconnect** → all `email_*` columns cleared, gate re-appears, broker returns
      `409 EMAIL_NOT_CONNECTED`.
- [ ] Broker with no/ wrong secret → `401`.
