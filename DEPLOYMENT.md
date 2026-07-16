# Deploying Acuria Platform

One git repo, two deploy targets:

| Part | Host | Why |
|---|---|---|
| **`frontend/`** — React + Vite SPA | **Vercel** | Static build, global CDN, instant rollbacks. |
| **`backend/`** — Express API | **Render** | Needs a long-lived process: WebSockets (super-admin realtime dashboard), in-memory caches (JWT / tenant-context / SharePoint token-refresh de-dup), and filesystem route loading. Vercel's serverless model breaks all three. |

They talk over HTTPS. The frontend is told the API's URL at build time via `VITE_API_URL` / `VITE_WS_URL`; the API allows the frontend's origin via `CORS_ORIGINS`.

Config files in the repo:
- [`render.yaml`](render.yaml) — Render Blueprint for the API.
- [`frontend/vercel.json`](frontend/vercel.json) — Vercel build + SPA routing.
- [`backend/.env.example`](backend/.env.example) — the authoritative list of backend env vars.

> ### ⚠️ Read this before you pick URLs: the auth cookie needs a shared parent domain
> Login stores the refresh token in an **HttpOnly cookie set by the API's domain**. The
> browser then sends it back on cross-origin refresh calls. On the raw platform domains
> (`your-app.vercel.app` ↔ `your-api.onrender.com`) that cookie is a **third-party
> cookie** — Safari blocks it outright and Chrome is phasing it out, so users get logged
> out the moment their 15-minute access token expires.
>
> **Fix: put both behind one parent domain** — e.g. `app.acuria.com` (Vercel) and
> `api.acuria.com` (Render). Same registrable domain (`acuria.com`) ⇒ the cookie is no
> longer third-party ⇒ refresh works in every browser. Custom domains are covered in
> §5; treat them as required for production, not optional.

---

## Prerequisites

- The repo pushed to GitHub (Render and Vercel both deploy from it).
- A [Baserow](https://baserow.io) account with the platform database provisioned
  (`BASEROW_MAIN_DATABASE_ID`, tokens, etc.).
- The Azure app registration done — see [docs/sharepoint-oauth-setup.md](docs/sharepoint-oauth-setup.md).
- Node 22 locally if you want to run the one-time setup script (§4).

You'll deploy the **API first** (so you know its URL), then the **frontend**, then come
back and fill in the cross-references.

---

## 1. Deploy the API to Render

### Option A — Blueprint (recommended)

1. **Render Dashboard → New → Blueprint**, and select this repo.
2. Render reads [`render.yaml`](render.yaml), shows the `acuria-api` service, and lists
   every `sync: false` variable as an empty field. Fill them in — the full reference is
   in §6. You can leave `APP_URL`, `CORS_ORIGINS`, `API_BASE_URL`, and `AZURE_REDIRECT_URI`
   blank for now; you'll set them in §3 once the URLs exist.
3. **Apply**. Render runs `npm install && npm run build` (which is `tsc`) in `backend/`,
   then starts it with `node dist/src/index.js`.
4. When it's live, note the URL, e.g. `https://acuria-api.onrender.com`.
5. Check health: `https://acuria-api.onrender.com/api/health` → `200`.

### Option B — Manual (no Blueprint)

**New → Web Service** → this repo, then:

| Setting | Value |
|---|---|
| Root Directory | `backend` |
| Runtime | Node |
| Build Command | `npm install && npm run build` |
| Start Command | `npm run start` |
| Health Check Path | `/api/health` |
| Plan | Starter or higher (**not Free** — see note below) |

Add every variable from §6 under **Environment**.

> **Don't use the Free plan for the API.** Free services sleep after inactivity, which
> drops WebSocket connections and defeats the in-memory token-refresh de-dup (the process
> is torn down between requests). Starter keeps one warm instance.

---

## 2. Deploy the frontend to Vercel

1. **Vercel → Add New → Project**, import this repo.
2. **Set Root Directory to `frontend`.** This is the important step — it tells Vercel the
   app lives in a subfolder of the monorepo. Vercel detects the Vite preset and reads
   [`frontend/vercel.json`](frontend/vercel.json) for the SPA rewrite (all paths →
   `index.html`, so deep links like `/dashboard/clients` work on refresh).
3. Add **Environment Variables** (Production scope), pointing at your Render API from §1:

   | Name | Value | Notes |
   |---|---|---|
   | `VITE_API_URL` | `https://acuria-api.onrender.com/api` | **Must end in `/api`.** |
   | `VITE_WS_URL` | `wss://acuria-api.onrender.com/api/ws` | `wss://`, not `https://`. Powers the super-admin realtime dashboard. |

   > Vite inlines `VITE_*` vars at **build time**, so changing either requires a
   > redeploy, not just a restart.
4. **Deploy.** Note the URL, e.g. `https://acuria-app.vercel.app`.

---

## 3. Wire the two together

Now that both URLs exist, set these on **Render** (Environment → edit → save triggers a
redeploy):

| Variable | Value | Purpose |
|---|---|---|
| `APP_URL` | `https://acuria-app.vercel.app` | Where the OAuth callback and password-set emails send users. |
| `CORS_ORIGINS` | `https://acuria-app.vercel.app` | Lets the browser call the API with credentials. Comma-separate if you have more than one origin (e.g. a preview domain). |
| `API_BASE_URL` | `https://acuria-api.onrender.com/api` | The API's own public base — used to build the default OAuth redirect URI. |
| `AZURE_REDIRECT_URI` | `https://acuria-api.onrender.com/api/oauth/sharepoint/callback` | Must **exactly** match a redirect URI registered on the Azure app. |

Then in the **Azure Portal** (Entra ID → your app → Authentication), add that same
`AZURE_REDIRECT_URI` as a **Web** redirect URI if it isn't already there.

Use your real custom domains here instead of the platform domains if you've set them up
(§5) — and you should, per the cookie warning at the top.

---

## 4. One-time setup: provision Baserow + seed the super admin

The API needs its Baserow schema created and the super-admin user seeded. Run the setup
script **once**, after the first successful API deploy. It is idempotent (safe to re-run;
it's also how you apply future migrations — including the SharePoint one).

**From the Render Shell** (Dashboard → acuria-api → Shell):

```bash
npm run setup
```

This runs all migrations in `backend/baserow/migrations/` (creating the tenants/users
tables, the SharePoint OAuth columns, etc.), then seeds the super admin from
`SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD`.

> You can also run it locally against the production Baserow by copying the same env vars
> into `backend/.env` and running `npm run setup --workspace=backend`. The target is
> Baserow, not Render — the script just needs the Baserow credentials.

After it finishes, log in at your frontend URL with the super-admin credentials.

---

## 5. Custom domains (do this for production)

Because of the third-party-cookie issue (top of this doc), production should run both
apps under one parent domain.

1. **Vercel** → Project → Settings → Domains → add `app.acuria.com`. Follow the DNS
   instructions (a CNAME to Vercel).
2. **Render** → Service → Settings → Custom Domains → add `api.acuria.com`. Add the CNAME
   it gives you. Render provisions TLS automatically.
3. Update the cross-references from §2 and §3 to the custom domains:
   - Vercel: `VITE_API_URL=https://api.acuria.com/api`, `VITE_WS_URL=wss://api.acuria.com/api/ws` → redeploy.
   - Render: `APP_URL=https://app.acuria.com`, `CORS_ORIGINS=https://app.acuria.com`,
     `API_BASE_URL=https://api.acuria.com/api`,
     `AZURE_REDIRECT_URI=https://api.acuria.com/api/oauth/sharepoint/callback`.
   - Azure: add the new redirect URI.

Now `app.acuria.com` and `api.acuria.com` share `acuria.com`, and the refresh cookie
works in every browser.

---

## 6. Backend environment variable reference

The authoritative list with inline docs is [`backend/.env.example`](backend/.env.example).
Grouped summary of what Render needs:

**Set by `render.yaml` automatically:** `NODE_VERSION`, `NODE_ENV`, and the two JWT
secrets (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, generated by Render).

**You must provide:**

| Group | Variables |
|---|---|
| URLs (§3) | `APP_URL`, `CORS_ORIGINS`, `API_BASE_URL` |
| Encryption / secrets | `TOKEN_ENCRYPTION_KEY` (64 hex chars — `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`), `WEBHOOK_SECRET` |
| Super admin seed | `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`, `SUPER_ADMIN_NAME` |
| Baserow | `BASEROW_MAIN_DATABASE_ID`, `BASEROW_DATABASE_TOKEN`, `BASEROW_EMAIL`, `BASEROW_PASSWORD`, `BASEROW_WORKSPACE_ID`, `BASEROW_USERS_TABLE_ID`, `BASEROW_TENANTS_TABLE_ID` (`BASEROW_API_URL` defaults to `https://api.baserow.io`) |
| SharePoint OAuth | `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_REDIRECT_URI` |
| Make.com | `MAKE_WEBHOOK_DER`, `MAKE_WEBHOOK_DER_DOCUSIGN`, `MAKE_WEBHOOK_LDM`, `MAKE_WEBHOOK_PREVIEW`, `MAKE_WEBHOOK_FCC_SEND`, `MAKE_WEBHOOK_FCC_SUBMIT`, `MAKE_WEBHOOK_FCC_DOCUSIGN`, `MAKE_WEBHOOK_NOTE_UPLOAD`, `MAKE_WEBHOOK_PASSWORD_SET`, `MAKE_WEBHOOK_OTP` |
| Google Docs templates | `GOOGLE_DOC_DER_ID`, `GOOGLE_DOC_LDM_PP_SANS`, `GOOGLE_DOC_LDM_PP_AVEC`, `GOOGLE_DOC_LDM_PM_SANS`, `GOOGLE_DOC_LDM_PM_AVEC` |

**Frontend (Vercel):** only `VITE_API_URL` and `VITE_WS_URL` (§2).

---

## 7. Continuous deployment

Both platforms auto-deploy on push to `master` by default:
- **Render** rebuilds the API when files change (whole repo triggers it; the build only
  touches `backend/`).
- **Vercel** rebuilds the frontend on every push and gives each PR a preview URL.

If you add a Vercel **preview** deployment you want to hit the API, add its origin to the
API's `CORS_ORIGINS` (comma-separated), or preview auth calls will be blocked.

Schema changes ship as new migration files in `backend/baserow/migrations/`; after the
API redeploys, run `npm run setup` again in the Render Shell to apply them.

---

## 8. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Logged out after ~15 min / refresh fails | Third-party cookie blocked | Use custom domains under one parent (§5). |
| `CORS` error in browser console | `CORS_ORIGINS` doesn't match the frontend origin exactly | Match scheme + host exactly, no trailing slash. Redeploy the API. |
| Login works but every API call 401s | `VITE_API_URL` wrong or missing `/api` | Fix on Vercel, **redeploy** (build-time var). |
| Realtime dashboard never updates | `VITE_WS_URL` missing/wrong, or API on Free plan (asleep) | Set `wss://…/api/ws`; move API off Free. |
| OAuth callback → "invalid_state" or Azure error | `AZURE_REDIRECT_URI` mismatch | Make Render's value and the Azure-registered URI byte-identical (§3). |
| API 503 on SharePoint routes | `TOKEN_ENCRYPTION_KEY` / `AZURE_*` unset | Set them on Render (§6). |
| Deep link (e.g. `/dashboard/clients`) 404s on refresh | SPA rewrite missing | Ensure `frontend/vercel.json` is present and Root Directory is `frontend`. |
| Build fails on Vercel: can't resolve workspace deps | Root Directory not set to `frontend` | Set it in Project → Settings → General. |
