# SharePoint OAuth setup (Microsoft Entra ID)

Per-tenant SharePoint connection for document libraries (DER, LdM, FCC, notes).  
One **multitenant** Azure app registration; each cabinet admin consents inside their own Microsoft 365 org.

Product flow and token broker: see root [`README.md`](../README.md) §1.  
Deploy redirect URIs: [`DEPLOYMENT.md`](../DEPLOYMENT.md).

---

## 1. Create the Entra ID app

1. [Azure Portal](https://portal.azure.com) → **Microsoft Entra ID** → **App registrations** → **New registration**.
2. Name: e.g. `Acuria Platform`.
3. **Supported account types**:  
   **Accounts in any organizational directory (Any Microsoft Entra ID tenant — Multitenant)**.  
   Single-tenant will only allow *your* org to connect — cabinets cannot consent.
4. Redirect URI — platform **Web**:
   - Local: `http://localhost:3001/api/oauth/sharepoint/callback`
   - Prod: `https://api.<your-domain>/api/oauth/sharepoint/callback`  
   (must match `AZURE_REDIRECT_URI` / default `${API_BASE_URL}/oauth/sharepoint/callback`)
5. Register.

## 2. Client secret

1. App → **Certificates & secrets** → **New client secret**.
2. Copy the **Value** (not the Secret ID) into `AZURE_CLIENT_SECRET`.
3. Note `Application (client) ID` → `AZURE_CLIENT_ID`.

## 3. API permissions

**API permissions** → **Add a permission** → **Microsoft Graph** → **Delegated**:

| Permission | Why |
|---|---|
| `Sites.ReadWrite.All` | Resolve `/sites/root` and write to the document library |
| `offline_access` | Refresh token for Make.com background uploads |

Do **not** rely on `Files.ReadWrite.All` alone — site resolution needs Sites.

No admin-consent button is required on *your* tenant for multitenant delegated use: each customer admin consents when they connect. Some orgs still require *their* admin to approve unknown apps (`admin_consent_required` in the UI).

## 4. Env vars (API)

```bash
AZURE_CLIENT_ID=...
AZURE_CLIENT_SECRET=...
API_BASE_URL=https://api.example.com/api   # or http://localhost:3001/api
AZURE_REDIRECT_URI=                        # optional if default is correct
TOKEN_ENCRYPTION_KEY=                      # 64 hex chars — encrypts tokens at rest
APP_URL=https://app.example.com            # post-OAuth redirect to SPA
WEBHOOK_SECRET=                            # Make → GET .../sharepoint/token
```

Generate encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Rotating `TOKEN_ENCRYPTION_KEY` invalidates all stored tokens — tenants must reconnect.

## 5. Connect a cabinet

1. Log in as `tenant_admin`.
2. Open **Intégrations** (or the onboarding gate).
3. **Connecter SharePoint** → Microsoft account picker → consent.
4. Callback stores encrypted tokens + root site / drive on the `tenants` row.
5. Status shows connected; Make can call the token broker.

Optional: `PUT /api/tenants/:id/sharepoint/config` overrides site/drive if the root site is wrong (UI site picker is still a known gap — defaults to root).

## 6. Make.com token broker

```
GET /api/tenants/:tenantId/sharepoint/token
Authorization: <WEBHOOK_SECRET>
```

Response (shape): `{ access_token, site_id, drive_id, expires_at }`.  
Platform outbound webhooks that upload files include `tenant_id` via `sharepointBrokerFields()`.

## 7. Troubleshooting

| Symptom | Fix |
|---|---|
| `invalid_state` | Restart connect from the app; check clock skew; don’t open callback in another browser |
| Redirect URI mismatch | Azure Web URI byte-identical to `AZURE_REDIRECT_URI` |
| `admin_consent_required` | Customer’s M365 admin must approve the app |
| API 503 on SharePoint routes | Set `AZURE_*` + `TOKEN_ENCRYPTION_KEY` |
| Uploads fail after key rotate | Tenants reconnect SharePoint |
