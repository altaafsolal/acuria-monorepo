# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

From the repo root (runs both services concurrently):
```bash
npm run dev                    # frontend (4001) + backend (3001)
npm run dev:frontend
npm run dev:backend
npm run build                  # frontend production build
```

From `backend/` or via workspace flag:
```bash
npm run typecheck --workspace=backend
npm run setup --workspace=backend            # first-time Baserow schema + seed
npm run provision:tenant-tables --workspace=backend -- --slug=<tenant-slug>
npm run migrate:airtable --workspace=backend -- --tenant-slug=nm-prime
```

From `frontend/`:
```bash
npm run typecheck --workspace=frontend
```

Tests: Vitest in both `frontend/` and `backend/` (`npm run test`).

## Architecture

**Monorepo** with npm workspaces: `frontend/` and `backend/`. **Hosting target: Vercel only** (SPA + API from the same repo; see `DEPLOYMENT.md`). `render.yaml` is obsolete.

### Backend (`backend/src/`)

Express 5 on port 3001. Routes are **file-system based**: `loadRoutes.ts` walks `src/routes/`, maps folders to URL paths, and mounts `get.ts`/`post.ts`/`put.ts`/`delete.ts` files as handlers. Dynamic segments use `[paramName]` folder naming (e.g. `routes/clients/[clientId]/notes/`).

**Database**: Baserow (no-code API database), not SQL. All row access goes through `src/services/baserow/` which wraps the Baserow REST API.

- **Main DB** (`BASEROW_MAIN_DATABASE_ID`): `users`, `tenants`, `audit_logs`
- **Per-tenant DB** (each tenant gets its own Baserow database): `clients`, `gestionnaires`, `kyc_documents`, `notes`, `relations`, `tasks`, `audit_logs`

The per-tenant database token is resolved at runtime via `services/baserow/tenant-context.ts`, which looks up the tenant by ID and caches its `database_token`.

All table and field names are centralized in `baserow/schema.ts`. When adding or renaming fields, update this file and the corresponding provisioner.

**Auth**: JWT dual-token scheme. Access token (15m) stored in `localStorage`, refresh token (7d) as HttpOnly cookie. The `authenticate` middleware verifies the Bearer token. Routes requiring auth use `authenticate` + optionally `requireRole`.

**WebSocket**: `src/realtime/socket.ts` mounts at `/api/ws`, restricted to `super_admin` users. `broadcast()` pushes events to all connected clients.

**External integrations**:
- Make.com webhooks for transactional email (password set, OTP) — configured via `MAKE_WEBHOOK_*` env vars; logs to console if not set
- Airtable import CLI (`cli/migrate-airtable.ts`) for one-time data migration

### Frontend (`frontend/src/`)

React 19 + Vite + TypeScript SPA on port 4001. Vite dev server proxies `/api` → `localhost:3001`.

**Data layer**: TanStack Query v5. Custom hooks in `src/hooks/` (e.g. `useClients`, `useKyc`) call the typed fetch helpers in `src/lib/http.ts`. The HTTP client handles automatic access-token refresh on 401: it retries once with the new token, then calls `notifyAuthFailure()` → redirects to login.

**Auth context**: `src/context/AppContext.tsx` exposes `isSuperAdmin`, `isTenantAdmin`, `isStandardUser` derived from the session user's role. Route guards: `SuperAdminRoute`, `TenantUserRoute` (accepts `adminOnly` prop), `ProtectedRoute`.

**Three roles**:
- `super_admin` — platform-level; sees all tenants, users, platform audit log, real-time dashboard
- `tenant_admin` — tenant-level admin; sees own tenant's users, audit log
- `standard_user` — tenant user; sees clients, KYC, tasks

**API URLs** are all defined in `src/api/index.ts`. Query cache keys are in `src/api/queryKeys.ts`.

## Multi-tenancy model

Every API request from a tenant user includes the user's `tenantId` (from the JWT payload). Backend routes call `requireTenant(req)` to extract it, then `resolveTenantDbContext(tenantId)` to get the per-tenant Baserow database token. Super-admin routes use the main database token directly.

## Environment setup

Copy `backend/.env.example` to `backend/.env` and fill in:
- `BASEROW_DATABASE_TOKEN` — runtime read/write token
- `BASEROW_EMAIL` + `BASEROW_PASSWORD` — for `npm run setup` (JWT provisioning)
- `BASEROW_USERS_TABLE_ID` + `BASEROW_TENANTS_TABLE_ID` — printed after first `npm run setup`

Frontend has no `.env` file in dev; `VITE_API_URL` defaults to `/api` (proxied).

## Schema changes

- **Main DB fields**: edit `baserow/migrations/01_Jul_2026-10_00_main-platform-schema.ts`
- **Per-tenant fields**: edit `baserow/provisioners/tenant-tables.ts`
- **Field name constants**: update `baserow/schema.ts`

Schema scripts are idempotent (safe to re-run; existing tables/fields are skipped).
