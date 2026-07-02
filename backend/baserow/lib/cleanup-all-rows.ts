import { listDatabaseTables } from '../../src/services/baserow/api.js';
import { env, isBaserowConfigured } from '../../src/config/env.js';
import { cleanupBlankRows } from './cleanup-rows.js';
import { BASEROW_TABLES, TENANT_TABLE_BASES } from '../schema.js';
import * as tenantsRepo from '../../src/services/baserow/tenants.js';
import { resolveTenantDbContext } from '../../src/services/baserow/tenant-context.js';

async function cleanupMainTables(): Promise<void> {
  const tables = await listDatabaseTables(env.baserow.mainDatabaseId);
  for (const name of [BASEROW_TABLES.users, BASEROW_TABLES.tenants]) {
    const table = tables.find((item) => item.name === name);
    if (table) await cleanupBlankRows(table.id, name);
  }
}

async function cleanupTenantTables(): Promise<void> {
  const tenants = await tenantsRepo.listTenants();
  if (tenants.length === 0) return;

  for (const tenant of tenants) {
    if (!tenant.database_id || !tenant.database_token) {
      throw new Error(
        `Tenant ${tenant.id} (${tenant.name}) has no workspace provisioning. `
        + 'Run: npm run provision:tenant-workspace -- --slug=' + tenant.slug,
      );
    }

    const ctx = await resolveTenantDbContext(tenant.id);
    const allTables = await listDatabaseTables(tenant.database_id);

    for (const base of TENANT_TABLE_BASES) {
      const table = allTables.find((item) => item.name === base);
      if (table) await cleanupBlankRows(table.id, base, ctx);
    }
  }
}

export async function cleanupAllRows(): Promise<void> {
  if (!isBaserowConfigured()) {
    throw new Error('Baserow is not configured. Set BASEROW_* in backend/.env');
  }

  await cleanupMainTables();
  await cleanupTenantTables();
}
