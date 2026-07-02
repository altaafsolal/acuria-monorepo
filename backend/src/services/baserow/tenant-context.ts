import type { BaserowDbContext } from './api.js';
import * as tenantsRepo from './tenants.js';

const cache = new Map<string, BaserowDbContext>();

export async function resolveTenantDbContext(tenantId: string): Promise<BaserowDbContext> {
  const cached = cache.get(tenantId);
  if (cached) return cached;

  const tenant = await tenantsRepo.findTenantById(tenantId);
  if (!tenant) {
    throw new Error(`Tenant ${tenantId} not found`);
  }
  if (!tenant.database_token) {
    throw new Error(
      `Tenant "${tenant.name}" has no database_token. `
      + 'Run: npm run provision:tenant-workspace -- --slug=' + tenant.slug,
    );
  }

  const ctx = { databaseToken: tenant.database_token };
  cache.set(tenantId, ctx);
  return ctx;
}

export function clearTenantDbContextCache(tenantId?: string): void {
  if (tenantId) cache.delete(tenantId);
  else cache.clear();
}
