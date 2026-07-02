import * as tenantsRepo from '../../src/services/baserow/tenants.js';
import { ensureTenantProvisioned } from '../../src/services/platform.js';
import { isBaserowMigrateConfigured } from '../../src/config/env.js';

export async function provisionAllTenants() {
  if (!isBaserowMigrateConfigured()) {
    throw new Error('BASEROW_EMAIL and BASEROW_PASSWORD are required to provision tenant tables');
  }

  const tenants = await tenantsRepo.listTenants();
  if (tenants.length === 0) {
    console.log('No tenants found — skipping tenant table provisioning.');
    return;
  }

  for (const tenant of tenants) {
    if (!tenant.database_id || !tenant.database_token) {
      throw new Error(
        `Tenant ${tenant.id} (${tenant.name}) has no workspace provisioning. `
        + 'Run: npm run provision:tenant-workspace -- --slug=' + tenant.slug,
      );
    }
    console.log(
      `\n  Tenant: ${tenant.name} (id: ${tenant.id}, workspace ${tenant.workspace_id}, database ${tenant.database_id})`,
    );
    const tableIds = await ensureTenantProvisioned(tenant.id);
    console.log('  Tables:', tableIds);
  }
}
