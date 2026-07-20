# Deploying Acuria Platform

One git repo, **one host: Vercel**. The whole monorepo (`frontend/` + `backend/`) is deployed on Vercel.

| Part | Role on Vercel |
|---|---|
| **`frontend/`** — React + Vite SPA | Static build (CDN), SPA rewrites |
| **`backend/`** — Express API | Node server / serverless entry exposing `/api` (OAuth callbacks, Make brokers, auth) |

They should share the **same site origin** in production (e.g. `https://app.acuria.com` for the SPA and `https://app.acuria.com/api` for the API). That keeps the refresh cookie first-party and avoids the third-party-cookie trap of splitting hosts across different platforms.

Config / reference in the repo:
- [`frontend/vercel.json`](frontend/vercel.json) — SPA routing (used when the project root is `frontend`, or as a starting point for monorepo rewrites)
- [`backend/.env.example`](backend/.env.example) — authoritative list of backend env vars
- [`frontend/.env.example`](frontend/.env.example) — `VITE_*` build-time vars
- [`render.yaml`](render.yaml) — **obsolete** (legacy Render blueprint; do not use for new deploys)

> ### Auth cookie
> Login stores the refresh token in an **HttpOnly cookie set by the API**. Prefer a **same-origin** layout (`/api` on the same hostname as the SPA) so the cookie is never third-party.
>
> If you temporarily split SPA and API on two hostnames, put both under one parent domain (e.g. `app.acuria.com` + `api.acuria.com`) — never mix unrelated platform domains.

---

## Prerequisites

- Repo pushed to GitHub (Vercel deploys from it).
- A [Baserow](https://baserow.io) account with the platform database provisioned
  (`BASEROW_MAIN_DATABASE_ID`, tokens, etc.).
- Azure app registration — see [docs/sharepoint-oauth-setup.md](docs/sharepoint-oauth-setup.md).
- Google OAuth client if Gmail is offered — see [docs/email-oauth-setup.md](docs/email-oauth-setup.md).
- Node 22 locally to run `npm run setup` against Baserow (§4).

---

## 1. Create the Vercel project (monorepo)

1. **Vercel → Add New → Project**, import this repo.
2. Configure for the **monorepo** (target layout):
   - Root of the Git repo (not only `frontend/`).
   - Frontend build: install workspaces, build the Vite app from `frontend/`.
   - Backend: compile TypeScript (`backend` → `tsc`) and expose the Express app under `/api`.
   - Rewrites: `/api/*` → API handler; all other routes → SPA `index.html` (deep links).
3. Until the root monorepo `vercel.json` / server entry is wired in CI, you may still deploy **frontend-only** with Root Directory = `frontend` (current [`frontend/vercel.json`](frontend/vercel.json)) and point `VITE_API_URL` at a separately hosted API on the **same Vercel account** (second project) — still Vercel-only, no Render.

### Recommended production URLs

| Use | Example |
|---|---|
| App + API (same origin) | `https://app.acuria.com` and `https://app.acuria.com/api` |
| Preview | `https://<project>-<hash>.vercel.app` |

Health check: `https://app.acuria.com/api/health` → `200`.

---

## 2. Frontend environment (Vercel)

`VITE_*` vars are inlined at **build time** — changing them requires a **redeploy**.

| Name | Value | Notes |
|---|---|---|
| `VITE_API_URL` | `/api` (same origin) **or** `https://app.acuria.com/api` | **Must end in `/api`.** Same-origin relative `/api` is preferred. |
| `VITE_WS_URL` | `wss://app.acuria.com/api/ws` | Super-admin realtime dashboard. Omit in local dev (Vite proxies). |
| `VITE_DER_TEMPLATE_URL` | optional | Hides DER template link if unset. |

---

## 3. Backend environment (Vercel)

Set these on the Vercel project that runs the API (same project as the SPA in the monorepo target, or the API project if split). Full comments: [`backend/.env.example`](backend/.env.example).

After the public URL exists:

| Variable | Example | Purpose |
|---|---|---|
| `APP_URL` | `https://app.acuria.com` | OAuth success redirect + password-set email links |
| `CORS_ORIGINS` | `https://app.acuria.com` | Browser calls with credentials (comma-separate previews if needed) |
| `API_BASE_URL` | `https://app.acuria.com/api` | Default OAuth redirect URI base |
| `AZURE_REDIRECT_URI` | `https://app.acuria.com/api/oauth/sharepoint/callback` | Must match Azure **Web** redirect URI |
| `EMAIL_REDIRECT_URI` | `https://app.acuria.com/api/oauth/email/callback` | Same URL on Azure **and** Google OAuth client |

Also register those redirect URIs in the Azure Portal (and Google if Gmail is offered).

**You must provide** (summary):

| Group | Variables |
|---|---|
| URLs | `APP_URL`, `CORS_ORIGINS`, `API_BASE_URL` |
| Auth | `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (generate strong random values; keep stable across deploys) |
| Encryption / webhooks | `TOKEN_ENCRYPTION_KEY` (64 hex chars), `WEBHOOK_SECRET`, optional `FCC_PREFILL_SECRET` |
| Super admin | `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`, `SUPER_ADMIN_NAME` — create via `npm run setup`; rotate password later with `npm run set-super-admin-password --workspace=backend` |
| Baserow | `BASEROW_MAIN_DATABASE_ID`, `BASEROW_DATABASE_TOKEN`, `BASEROW_EMAIL`, `BASEROW_PASSWORD`, `BASEROW_WORKSPACE_ID`, `BASEROW_USERS_TABLE_ID`, `BASEROW_TENANTS_TABLE_ID` |
| SharePoint OAuth | `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_REDIRECT_URI` |
| Email OAuth | `EMAIL_REDIRECT_URI`; Gmail: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| Make.com | `MAKE_WEBHOOK_DER`, `MAKE_WEBHOOK_DER_DOCUSIGN`, `MAKE_WEBHOOK_LDM`, `MAKE_WEBHOOK_PREVIEW`, `MAKE_WEBHOOK_FCC_SEND`, `MAKE_WEBHOOK_FCC_SUBMIT`, `MAKE_WEBHOOK_FCC_DOCUSIGN`, `MAKE_WEBHOOK_NOTE_UPLOAD`, `MAKE_WEBHOOK_PASSWORD_SET`, `MAKE_WEBHOOK_OTP` |
| Google Docs templates | `GOOGLE_DOC_DER_ID`, `GOOGLE_DOC_LDM_PP_SANS`, `GOOGLE_DOC_LDM_PP_AVEC`, `GOOGLE_DOC_LDM_PM_SANS`, `GOOGLE_DOC_LDM_PM_AVEC` |

Generate `TOKEN_ENCRYPTION_KEY`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 4. One-time setup: provision Baserow + seed the super admin

Run once after the first successful API deploy (idempotent; also how you apply later migrations).

**Locally** (recommended), with production Baserow credentials in `backend/.env`:

```bash
npm run setup --workspace=backend
```

This runs migrations in `backend/baserow/migrations/`, seeds the super admin from `SUPER_ADMIN_*`, and provisions tenant tables as configured.

Log in at your Vercel app URL with the super-admin credentials.

---

## 5. Custom domains

1. **Vercel** → Project → Settings → Domains → add `app.acuria.com` (CNAME as instructed).
2. Point env vars (§2–§3) at that domain; redeploy so `VITE_*` pick up the new API URL if absolute.
3. Update Azure / Google redirect URIs to `https://app.acuria.com/api/oauth/...`.

Same-origin on `app.acuria.com` keeps the refresh cookie first-party.

---

## 6. Continuous deployment

- Push to the production branch → Vercel rebuilds the monorepo (SPA + API) and serves preview URLs per PR.
- Add preview origins to `CORS_ORIGINS` if preview frontends must call the production API (or use preview API + matching env).
- After new Baserow migration files land: redeploy, then run `npm run setup --workspace=backend` locally against the same Baserow.

---

## 7. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Logged out after ~15 min / refresh fails | Cookie treated as third-party | Same-origin `/api`, or both hosts under one parent domain (§5) |
| `CORS` error | `CORS_ORIGINS` ≠ SPA origin | Match scheme + host exactly, no trailing slash; redeploy |
| Login OK but every API call 401s | `VITE_API_URL` wrong / missing `/api` | Fix on Vercel, **redeploy** (build-time) |
| Realtime dashboard never updates | `VITE_WS_URL` missing/wrong, or WS not supported on that runtime | Set `wss://…/api/ws`; confirm WebSocket support on the Vercel runtime you use for the API |
| OAuth `invalid_state` / provider error | Redirect URI mismatch | Vercel `AZURE_REDIRECT_URI` / `EMAIL_REDIRECT_URI` byte-identical to IdP registration |
| API 503 on SharePoint / email routes | `TOKEN_ENCRYPTION_KEY` / `AZURE_*` / `GOOGLE_*` unset | Set on Vercel (§3) |
| Deep link 404 on refresh | SPA rewrite missing | Ensure all non-`/api` paths rewrite to `index.html` |
| Build fails resolving workspace deps | Wrong Root Directory / install scope | Install from repo root so npm workspaces resolve |

---

## 8. Obsolete: Render

Do **not** deploy the API to Render. [`render.yaml`](render.yaml) is kept only as historical reference and should not be applied for new environments. Hosting target is **Vercel only**.
