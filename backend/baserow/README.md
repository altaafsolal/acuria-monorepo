# Baserow setup



This folder holds everything that **sets up or populates** Baserow — separate from the running API (`src/`).



## What each folder does



| Folder | Purpose | Safe to re-run? |

|--------|---------|-----------------|

| `migrations/` | **Schema** — creates tables & fields in the main database (users, tenants) | Yes |

| `seeds/` | **Data** — inserts initial rows (super admin, NM Prime tenant + dedicated database) | Yes (skips existing) |

| `provisioners/` | **Per-tenant schema** — creates `clients`, `gestionnaires`, `kyc_documents`, `notes`, `relations`, `tasks`, `audit_logs` in each tenant workspace | Yes |



Blank placeholder rows created by Baserow are removed automatically at the end of setup.



## Architecture



- **Main database** (`BASEROW_MAIN_DATABASE_ID`) — platform tables: `users`, `tenants`

- **Tenant database** (one per tenant workspace, stored in `tenants.database_id`) — `clients`, `gestionnaires`, `kyc_documents`, `notes`, `relations`, `tasks`, `audit_logs`



## Files



- `schema.js` — table names, field names, select options (shared by migrations, provisioners, and runtime code)

- `lib/run-scripts.js` — runs migration and seed files in timestamp order (used by `setup`)

- `lib/script-filename.js` — timestamp naming and chronological sort



## Naming migrations & seeds



Every file in `migrations/` and `seeds/` must start with a timestamp so you can track when it was added:



```

DD_MMM_YYYY-HH_mm_description.ts

```



Scripts run **oldest first** (parsed from the timestamp prefix).



To add a new migration or seed, create a file manually with the current date/time in the name, export `up()`, then run `npm run setup`.



## Idempotency (safe to re-run `npm run setup`)



| Step | On re-run |

|------|-----------|

| **Migrate** | Skips existing tables and fields; only adds what is missing |

| **Seed** | Skips existing users/tenants; **never** resets passwords or updates rows |

| **Provision** | Skips existing tenant tables and fields; **never** deletes rows |

| **Cleanup** | Removes **only** rows where every field is empty (Baserow placeholders) |



Nothing is dropped, truncated, or overwritten.



## Typical first-time setup



```bash

npm run setup    # from backend/

```



### What `npm run setup` does (4 steps)



1. **Migrate** — creates `users` + `tenants` tables (with `database_id` field) in main database

2. **Seed** — super admin, NM Prime tenant (with dedicated Baserow database), tenant admin user

3. **Provision** — tenant tables in each tenant's dedicated workspace database

4. **Cleanup** — removes Baserow auto-created blank rows



Individual step scripts are not exposed — use `npm run setup` only.



## Not SQL migrations



These are **Baserow API scripts**, not Knex/Postgres migrations. They use JWT auth (`BASEROW_EMAIL` / `BASEROW_PASSWORD`) to create tables and fields.

