import { getCachedTenantTableId } from '../../../baserow/provisioners/tenant-tables.js';
import { TENANT_TABLE_BASES } from '../../../baserow/schema.js';
import { listDatabaseTables } from './api.js';
import * as tenantsRepo from './tenants.js';

const resolvedTableIds = new Map<string, string>();

type TenantTableBase = (typeof TENANT_TABLE_BASES)[number];

export async function resolveTenantTableId(tenantId: string, baseName: TenantTableBase): Promise<string> {
  const key = `${tenantId}:${baseName}`;
  const cached = getCachedTenantTableId(tenantId, baseName) || resolvedTableIds.get(key);
  if (cached) return cached;

  const tenant = await tenantsRepo.findTenantById(tenantId);
  if (!tenant) {
    throw new Error(`Tenant ${tenantId} not found`);
  }

  if (!tenant.database_id) {
    throw new Error(
      `Tenant ${tenantId} has no database_id. Run: npm run setup`,
    );
  }

  const tables = await listDatabaseTables(tenant.database_id);
  const table = tables.find((item) => item.name === baseName);

  if (!table) {
    throw new Error(
      `Table "${baseName}" not found in database ${tenant.database_id}. Run: npm run setup`,
    );
  }

  const tableId = String(table.id);
  resolvedTableIds.set(key, tableId);
  return tableId;
}

/** @internal exported for testing */
export function clearTenantTablesCache(): void {
  resolvedTableIds.clear();
}

/** @internal exported for testing — pre-populate cache to skip Baserow discovery */
export function setTenantTableId(tenantId: string, baseName: string, tableId: string): void {
  resolvedTableIds.set(`${tenantId}:${baseName}`, tableId);
}
