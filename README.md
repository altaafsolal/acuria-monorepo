# Acuria Platform — README technique

Plateforme multi-tenant de KYC / conformité pour cabinets de gestion de patrimoine.

Ce document décrit l’**architecture actuelle** (React + Express + Baserow + Make, OAuth SharePoint & email), les **dépendances**, et les **procédures de déploiement**. Il remplace l’ancienne stack Netlify / HTML statique.

| Document | Contenu |
|---|---|
| **Ce README** | Architecture, dépendances, dev local, aperçu déploiement & OAuth |
| [`DEPLOYMENT.md`](DEPLOYMENT.md) | Procédure détaillée déploiement Vercel (monorepo, env, domaines) |
| [`docs/Procedure_Gestion_Incident_Acuria.docx`](docs/Procedure_Gestion_Incident_Acuria.docx) | Procédure de gestion d’incident |
| [`backend/baserow/README.md`](backend/baserow/README.md) | Schéma Baserow, migrations, provisioners |
| [`docs/sharepoint-oauth-setup.md`](docs/sharepoint-oauth-setup.md) | App Azure / Entra ID pour SharePoint |
| [`docs/email-oauth-setup.md`](docs/email-oauth-setup.md) | OAuth email Microsoft 365 ou Gmail |

---

## 1. Architecture

### Vue d’ensemble

```
┌──────────────────────────────── Vercel (monorepo) ────────────────────────────────┐
│  ┌─────────────────────┐         HTTPS / WSS          ┌─────────────────────┐   │
│  │  Frontend (SPA)     │ ──── /api (same origin) ───► │  Backend (API)      │   │
│  │  React 19 + Vite 6  │                              │  Express 5          │   │
│  │  :4001 (dev)        │ ◄── JWT + refresh cookie ─── │  :3001 (dev)        │   │
│  └─────────────────────┘                              └──────────┬──────────┘   │
└──────────────────────────────────────────────────────────────────┼──────────────┘
                                                                   │
                     ┌─────────────────────────────────────────────┼──────────────────────┐
                     ▼                                             ▼                      ▼
            ┌─────────────────┐                         ┌─────────────────┐     ┌─────────────────┐
            │  Baserow        │                         │  Make.com       │     │  OAuth IdPs     │
            │  Main DB        │                         │  Webhooks KYC / │     │  Entra ID       │
            │  + 1 DB / tenant│                         │  email / upload │     │  Google Cloud   │
            └─────────────────┘                         └────────┬────────┘     └─────────────────┘
                                                                 │
                                                                 ▼
                                                        SharePoint / Gmail / DocuSign
                                                        (via token brokers API)
```

| Composant | Techno | Hébergement | Rôle |
|---|---|---|---|
| **Frontend** | React 19, Vite 6, TanStack Query, Tailwind 4, React Router 7 | **Vercel** | SPA cabinets + super-admin |
| **Backend** | Express 5, TypeScript, Zod, JWT, WebSocket (`ws`) | **Vercel** (même monorepo) | API REST `/api`, brokers OAuth, realtime |
| **Données** | Baserow (API REST, pas de SQL applicatif) | Baserow Cloud | DB plateforme + DB isolée par tenant |
| **Automatisations** | Make.com | Make | DER/LdM/FCC, DocuSign, emails, upload SharePoint |
| **Documents cabinet** | Microsoft Graph (SharePoint) | Org du client | Bibliothèque docs par tenant |
| **Email transactionnel** | Graph `Mail.Send` **ou** Gmail `gmail.send` | Org du client | Expéditeur par tenant |

Cible d’hébergement : **Vercel uniquement** pour le monorepo (SPA + API). En production, préférer la **même origine** (`https://app.acuria.com` + `/api`) pour que le cookie de refresh reste first-party.

### Monorepo (npm workspaces)

```
acuria-platform/
├── frontend/          # SPA React (port 4001)
├── backend/           # API Express (port 3001)
│   ├── src/routes/    # Routes filesystem → /api/...
│   ├── src/services/  # Baserow, Make, SharePoint, email OAuth
│   ├── baserow/       # Migrations / seeds / provisioners
│   └── cli/           # setup, migrate:airtable, provision
├── frontend/vercel.json   # SPA (point de départ monorepo Vercel)
├── render.yaml            # OBSOLÈTE — ne plus utiliser
├── DEPLOYMENT.md
└── docs/                  # OAuth + procédure d’incident
```

### Multi-tenancy Baserow

```
Main DB (BASEROW_MAIN_DATABASE_ID)
├── users
├── tenants          ← tokens OAuth chiffrés (SharePoint + email)
└── audit_logs

Per-tenant DB (tenants.database_id + database_token)
├── clients, gestionnaires, kyc_documents, notes
├── relations, tasks, fcc_clients, audit_logs
```

1. Le JWT d’accès porte le `tenantId` de l’utilisateur.
2. Les routes tenant appellent `requireTenant(req)` puis `resolveTenantDbContext(tenantId)`.
3. Le token Baserow du tenant est mis en cache ; le super-admin utilise le token de la DB principale.

Noms de tables / champs : `backend/baserow/schema.ts`.

### Rôles

| Rôle | Périmètre |
|---|---|
| `super_admin` | Plateforme : tenants, utilisateurs, audit global, dashboard realtime |
| `tenant_admin` | Cabinet : users, audit, **intégrations OAuth** (SharePoint + email) |
| `standard_user` | Cabinet : clients, KYC, tâches |

`OnboardingGate` bloque le dashboard tant que SharePoint **et** l’email ne sont pas connectés (sauf `super_admin`).

### Auth

- Access token JWT (~15 min) en `localStorage` / header `Authorization: Bearer`
- Refresh token (~7 j) en cookie HttpOnly `acuria_refresh_token`
- Refresh via `POST /api/auth/refresh` ; le client HTTP frontend retente une fois sur 401
- **Production** : frontend et API sous le **même domaine parent** (`app.*` + `api.*`) pour que le cookie de refresh ne soit pas traité comme third-party — détail dans [`DEPLOYMENT.md`](DEPLOYMENT.md)

### OAuth SharePoint (par cabinet)

Chaque tenant connecte **son** org Microsoft 365. Une seule app Entra ID **multitenant** côté Acuria ; le consentement se fait dans l’org du cabinet.

```
Tenant admin → GET /api/tenants/:id/sharepoint/connect
            → Microsoft /common/oauth2/v2.0/authorize
              (scopes: Sites.ReadWrite.All + offline_access)
            → GET /api/oauth/sharepoint/callback
            → tokens AES-256-GCM → row tenants
Make.com    → GET /api/tenants/:id/sharepoint/token  (+ WEBHOOK_SECRET)
            → access_token + site_id + drive_id
```

### OAuth email (Microsoft 365 **ou** Gmail)

Connexion indépendante de SharePoint. Un cabinet choisit **un** provider.

| Provider | App | Scopes |
|---|---|---|
| Microsoft 365 | **Même** app Azure que SharePoint (+ `Mail.Send`) | `openid email offline_access Mail.Send` |
| Gmail | Client OAuth Google Cloud **séparé** | `openid email gmail.send` |

Callback unique : `GET /api/oauth/email/callback` (le provider est dans le `state` signé).  
Broker Make : `GET /api/tenants/:id/email/token` → `{ provider, access_token, sender_address, expires_at }`.

Guides pas à pas : [`docs/sharepoint-oauth-setup.md`](docs/sharepoint-oauth-setup.md), [`docs/email-oauth-setup.md`](docs/email-oauth-setup.md).

### Make.com

Scénarios sortants (webhooks) : DER, LdM, FCC, DocuSign, upload notes, emails auth (set-password / OTP).  
Appels entrants Make → API : header `Authorization: <WEBHOOK_SECRET>`.  
Les scénarios qui écrivent dans SharePoint / envoient un email reçoivent un `tenant_id` et récupèrent le token via les brokers ci-dessus.

---

## 2. Dépendances

### Runtime / services externes

| Service | Usage |
|---|---|
| **Node.js 22** (voir `.nvmrc`) | Runtime FE + BE |
| **Baserow** (`api.baserow.io`) | Base de données |
| **Vercel** | Hébergement monorepo (frontend + API) |
| **Make.com** | Orchestration documents / emails / DocuSign |
| **Microsoft Entra ID** | OAuth SharePoint + optionnellement email M365 |
| **Google Cloud OAuth** | OAuth Gmail (optionnel selon cabinets) |
| **Google Docs** | Templates DER / LdM (IDs en env) |
| **DocuSign** | Via Make (pas de SDK direct) |
| **Airtable** | Import one-shot CLI (`migrate:airtable`) — optionnel |

### Packages npm (principaux)

**Root** — `concurrently` (dev FE + BE).

**Frontend** — `react` / `react-dom` 19, `react-router-dom` 7, `@tanstack/react-query` 5, `vite` 6, `tailwindcss` 4, `chart.js`, `dayjs`, `xlsx`, `clsx`, `react-icons`.

**Backend** — `express` 5, `axios`, `jsonwebtoken`, `bcryptjs`, `zod`, `cookie-parser`, `cors`, `helmet`, `express-rate-limit`, `multer`, `ws`, `dotenv`, `dayjs`, `form-data`.

Listes complètes : `frontend/package.json`, `backend/package.json`.

---

## 3. Développement local

### Prérequis

- Node **22**
- Compte Baserow + token database + credentials email/password (setup)
- (Optionnel pour OAuth local) app Azure + client Google — voir `docs/`

### Installation

```bash
npm install
cp backend/.env.example backend/.env
# Remplir au minimum : JWT_*, BASEROW_*, SUPER_ADMIN_*, CORS_ORIGINS, APP_URL, API_BASE_URL
# Frontend : en local, aucun .env n’est requis (proxy Vite → :3001)
```

### Premier setup Baserow

```bash
npm run setup
# → migrations main DB, seed super-admin, provision tables tenants existants
```

Noter les `BASEROW_USERS_TABLE_ID` / `BASEROW_TENANTS_TABLE_ID` affichés et les reporter dans `backend/.env`.

### Lancer

```bash
npm run dev              # API :3001 + SPA :4001
npm run dev:frontend
npm run dev:backend
```

| Script | Description |
|---|---|
| `npm run build` | Build production frontend |
| `npm run typecheck --workspace=frontend` | Typecheck FE |
| `npm run typecheck --workspace=backend` | Typecheck BE |
| `npm run test` | Vitest FE + BE |
| `npm run provision:tenant-tables --workspace=backend -- --slug=<slug>` | Tables d’un tenant |
| `npm run set-super-admin-password --workspace=backend` | Met à jour le mot de passe super-admin depuis `SUPER_ADMIN_PASSWORD` |
| `npm run migrate:airtable --workspace=backend -- --tenant-slug=nm-prime` | Import Airtable |

Santé API : `GET http://localhost:3001/api/health`.

Variables : listes commentées dans [`backend/.env.example`](backend/.env.example) et [`frontend/.env.example`](frontend/.env.example).

---

## 4. Procédures de déploiement

Résumé ; le détail est dans **[`DEPLOYMENT.md`](DEPLOYMENT.md)**.

### Cible

| Partie | Host | Notes |
|---|---|---|
| Monorepo `frontend/` + `backend/` | **Vercel** | Même projet (cible) ; SPA + `/api` en same-origin |
| `render.yaml` | — | **Obsolète** — ne pas déployer sur Render |

### Ordre recommandé

1. Créer le projet Vercel sur le repo (monorepo).
2. Configurer les variables backend + `VITE_API_URL` / `VITE_WS_URL` (préférer `/api` en relative).
3. Vérifier `https://<app>/api/health`.
4. Recâbler `APP_URL`, `CORS_ORIGINS`, `API_BASE_URL`, `AZURE_REDIRECT_URI`, `EMAIL_REDIRECT_URI`.
5. Enregistrer les redirect URIs sur Azure (et Google si Gmail).
6. En local : `npm run setup --workspace=backend` (schéma Baserow + seed super-admin).
7. Domaine custom (ex. `app.acuria.com`) — same-origin pour le cookie de refresh.

### Continuous deployment

- Push sur la branche prod → rebuild Vercel (SPA + API, previews PR).
- Après une nouvelle migration Baserow : redeploy puis `npm run setup` en local contre Baserow.

### Secrets critiques en prod

| Variable | Rôle |
|---|---|
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Signature tokens |
| `TOKEN_ENCRYPTION_KEY` | Chiffrement tokens OAuth (64 hex) |
| `WEBHOOK_SECRET` | Auth Make → API + brokers |
| `AZURE_CLIENT_ID` / `AZURE_CLIENT_SECRET` | SharePoint (+ M365 email) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Gmail |
| `BASEROW_*` | Accès données |
| `MAKE_WEBHOOK_*` | Scénarios Make |

---

## 5. Schéma & évolutions

- **Main DB** : migrations dans `backend/baserow/migrations/`
- **Tenant DB** : `backend/baserow/provisioners/tenant-tables.ts`
- Constantes de noms : `backend/baserow/schema.ts`
- Scripts **idempotents** (re-exécutables)

Voir [`backend/baserow/README.md`](backend/baserow/README.md).

---

## 6. Ancienne architecture (obsolète)

Ne plus documenter ni déployer :

- Sites **Netlify** HTML / JS vanilla
- Hébergement API sur **Render** (`render.yaml`)
- Formulaires FCC hébergés hors SPA
- Modèle mono-tenant / sans OAuth par cabinet

La stack de référence est **Vercel (monorepo) + Baserow + Make + OAuth SharePoint/email** telle que décrite ci-dessus.
