#!/usr/bin/env node
import 'dotenv/config';
import { isBaserowConfigured, isBaserowMigrateConfigured } from '../src/config/env.js';
import { formatCliError } from '../baserow/lib/run-scripts.js';
import { clearTenantDbContextCache } from '../src/services/baserow/tenant-context.js';
import { ensureTenantProvisioned } from '../src/services/platform/tenants.js';
import * as tenantsRepo from '../src/services/baserow/tenants.js';

function parseArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const arg = process.argv.find((item) => item.startsWith(prefix));
  return arg?.slice(prefix.length);
}

async function main() {
  const slug = parseArg('slug');

  if (!slug) {
    throw new Error('Usage: npm run provision:tenant-tables -- --slug=<tenant-slug>');
  }
  if (!isBaserowConfigured()) {
    throw new Error('Baserow is not configured. Set BASEROW_* in backend/.env');
  }
  if (!isBaserowMigrateConfigured()) {
    throw new Error('BASEROW_EMAIL and BASEROW_PASSWORD are required to provision tenant tables');
  }

  const tenant = await tenantsRepo.findTenantBySlug(slug);
  if (!tenant) {
    throw new Error(`Tenant with slug "${slug}" not found in main database`);
  }

  if (!tenant.database_id || !tenant.database_token) {
    throw new Error(
      `Tenant "${tenant.name}" has no workspace provisioning. `
      + `Run: npm run provision:tenant-workspace -- --slug=${slug}`,
    );
  }

  console.log(
    `Provisioning tenant tables for "${tenant.name}" `
    + `(workspace ${tenant.workspace_id}, database ${tenant.database_id})…`,
  );

  clearTenantDbContextCache(tenant.id);
  const tableIds = await ensureTenantProvisioned(tenant.id);

  console.log('✓ Tables:', tableIds);
  console.log(`\nTenant "${tenant.name}" tables are up to date.`);
}

main().catch((error) => {
  console.error('\nProvision failed:', formatCliError(error));
  process.exit(1);
});
