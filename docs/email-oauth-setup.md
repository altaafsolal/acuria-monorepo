# Email OAuth setup (Microsoft 365 or Gmail)

Per-tenant transactional email. Each cabinet connects **either** Microsoft 365 (`Mail.Send`) **or** Gmail (`gmail.send`) — not both at once.

SharePoint and email are independent connections. Onboarding requires both SharePoint **and** email before the dashboard unlocks.

Architecture: root [`README.md`](../README.md). SharePoint Azure app: [`sharepoint-oauth-setup.md`](sharepoint-oauth-setup.md).

---

## Shared callback

Both providers redirect to the **same** backend URL:

```
${API_BASE_URL}/oauth/email/callback
```

Override with `EMAIL_REDIRECT_URI` if needed. Register this exact URL on **both** the Azure app and the Google OAuth client. The signed OAuth `state` carries `provider: microsoft | google`.

---

## A. Microsoft 365 email

Reuses the **same** Entra ID app as SharePoint (`AZURE_CLIENT_ID` / `AZURE_CLIENT_SECRET`). No second Microsoft app.

### Extra steps on the Azure app

1. **Authentication** → add Web redirect URI:  
   `https://api.<domain>/api/oauth/email/callback`  
   (and local `http://localhost:3001/api/oauth/email/callback` if you test locally).
2. **API permissions** → Microsoft Graph → **Delegated** → add:
   - `Mail.Send`
   - `openid`, `email`, `offline_access` (usually available / granted with the OIDC stack)

The app requests scopes: `openid email offline_access https://graph.microsoft.com/Mail.Send`.  
Sender address and Microsoft `tid` come from the `id_token` — no `User.Read` scope.

### Env

Same Azure vars as SharePoint, plus:

```bash
EMAIL_REDIRECT_URI=   # optional; defaults to ${API_BASE_URL}/oauth/email/callback
TOKEN_ENCRYPTION_KEY= # required (shared with SharePoint)
```

---

## B. Gmail

Google has no Azure-style multitenancy — create a **separate** OAuth client in Google Cloud.

### Steps

1. [Google Cloud Console](https://console.cloud.google.com) → create / select a project.
2. **APIs & Services** → enable **Gmail API**.
3. **OAuth consent screen** (External or Internal as appropriate).
   - Scopes: `openid`, `email`, `https://www.googleapis.com/auth/gmail.send` only.
4. **Credentials** → **Create credentials** → **OAuth client ID** → type **Web application**.
5. Authorized redirect URIs — exact match:
   - `http://localhost:3001/api/oauth/email/callback`
   - `https://api.<domain>/api/oauth/email/callback`
6. Copy Client ID / Client secret → `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.

The authorize URL uses `access_type=offline` and `prompt=consent` so Google returns a refresh token on first consent.

### Env

```bash
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
EMAIL_REDIRECT_URI=   # optional if default is correct
TOKEN_ENCRYPTION_KEY=
```

---

## Connect from the product

1. `tenant_admin` → **Intégrations** (or onboarding gate).
2. Choose **Microsoft 365** or **Gmail** → consent.
3. Callback encrypts tokens on the `tenants` row and stores `sender_address`.
4. Disconnect / reconnect to switch provider.

---

## Make.com token broker

```
GET /api/tenants/:tenantId/email/token
Authorization: <WEBHOOK_SECRET>
```

Response (shape): `{ provider, access_token, sender_address, expires_at }`.

Special case: tenant id sentinel `SUPER_ADMIN` returns platform email metadata without tokens (Make uses its own mailbox).

### Error codes (API / UI)

| Code | Meaning |
|---|---|
| `EMAIL_NOT_CONNECTED` | Cabinet has not completed OAuth |
| `EMAIL_SCOPE_MISSING` | Token lacks send scope — reconnect |
| `EMAIL_REAUTH_REQUIRED` | Refresh failed — admin must reconnect |

---

## Checklist

- [ ] Azure redirect URI for **email** callback registered (if using M365)
- [ ] Graph delegated `Mail.Send` on the Azure app (if using M365)
- [ ] Google OAuth client + Gmail API + redirect URI (if offering Gmail)
- [ ] `TOKEN_ENCRYPTION_KEY` set
- [ ] `WEBHOOK_SECRET` set for Make
- [ ] `APP_URL` points at the SPA (success/error redirect after callback)
