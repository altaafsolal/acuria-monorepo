# Baserow setup

This folder holds everything that **sets up or populates** Baserow — separate from the running API (`src/`).

## Architecture

| Database | Tables |
|----------|--------|
| **Main** (`BASEROW_MAIN_DATABASE_ID`) | `tenants`, `users`, `audit_logs` |
| **Per-tenant** (`tenants.database_id`) | `clients`, `gestionnaires`, `kyc_documents`, `notes`, `relations`, `tasks`, `audit_logs` |

## Setup flow (`npm run setup`)

1. **Migrate** — main-database schema (single migration)
2. **Seed** — super admin, NM Prime tenant + workspace
3. **Provision** — tenant tables in each tenant workspace
4. **Cleanup** — remove Baserow blank placeholder rows

Then run Airtable import:

```bash
npm run migrate:airtable -- --tenant-slug=nm-prime
```

## Folder layout

| Folder | Purpose |
|--------|---------|
| `migrations/` | Main-database schema (one file) |
| `seeds/` | Bootstrap rows |
| `provisioners/` | Per-tenant table schemas |
| `lib/` | Shared helpers (`schema-helpers`, `run-scripts`, `setup-database`) |
| `schema.ts` | Table/field names and select options |

## Adding schema changes

- **Main DB** — edit `migrations/01_Jul_2026-10_00_main-platform-schema.ts` (or add a new timestamped migration if you need incremental upgrades later).
- **Tenant DB** — edit `provisioners/tenant-tables.ts`.

Filenames use `DD_MMM_YYYY-HH_mm_description.ts`; scripts run oldest first.

## Idempotency

Safe to re-run: existing tables and fields are skipped, seeds skip existing rows, cleanup only removes empty placeholder rows.

These are **Baserow API scripts** (JWT auth), not SQL migrations.
