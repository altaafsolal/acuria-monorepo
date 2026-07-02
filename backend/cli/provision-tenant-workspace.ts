#!/usr/bin/env node
import 'dotenv/config';
import { isBaserowConfigured, isBaserowMigrateConfigured } from '../src/config/env.js';
import { provisionTenantTables } from '../baserow/provisioners/tenant-tables.js';
import { formatCliError } from '../baserow/lib/run-scripts.js';
import { clearTenantDbContextCache } from '../src/services/baserow/tenant-context.js';
import { provisionTenantWorkspace } from '../src/services/baserow/tenant-database.js';
import * as tenantsRepo from '../src/services/baserow/tenants.js';

function parseArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const arg = process.argv.find((item) => item.startsWith(prefix));
  return arg?.slice(prefix.length);
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

async function main() {
  const slug = parseArg('slug');
  const force = hasFlag('force');

  if (!slug) {
    throw new Error('Usage: npm run provision:tenant-workspace -- --slug=<tenant-slug> [--force]');
  }
  if (!isBaserowConfigured()) {
    throw new Error('Baserow is not configured. Set BASEROW_* in backend/.env');
  }
  if (!isBaserowMigrateConfigured()) {
    throw new Error('BASEROW_EMAIL and BASEROW_PASSWORD are required to create tenant workspaces');
  }

  const tenant = await tenantsRepo.findTenantBySlug(slug);
  if (!tenant) {
    throw new Error(`Tenant with slug "${slug}" not found in main database`);
  }

  if (tenant.workspace_id && tenant.database_token && !force) {
    console.log(
      `Tenant "${tenant.name}" already has workspace ${tenant.workspace_id} `
      + `(database ${tenant.database_id}). Use --force to provision a new workspace.`,
    );
    return;
  }

  console.log(`Provisioning dedicated Baserow workspace for "${tenant.name}"…`);
  const { workspaceId, databaseId, databaseToken } = await provisionTenantWorkspace(tenant.name);

  const updated = await tenantsRepo.patchTenantWorkspace(tenant.id, {
    workspaceId,
    databaseId,
    databaseToken,
  });
  if (!updated) {
    throw new Error(`Failed to update tenant row ${tenant.id}`);
  }

  clearTenantDbContextCache(tenant.id);

  console.log(`✓ Workspace ${workspaceId}`);
  console.log(`✓ Database ${databaseId}`);
  console.log(`✓ Database token stored on tenant row`);

  await provisionTenantTables(updated);
  console.log(`\nTenant "${tenant.name}" is ready. Re-run Airtable migration if needed.`);
}

main().catch((error) => {
  console.error('\nProvision failed:', formatCliError(error));
  process.exit(1);
});
