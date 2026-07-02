import bcrypt from 'bcryptjs';
import { env, isBaserowConfigured, isBaserowMigrateConfigured } from '../../src/config/env.js';
import { testConnection } from '../../src/services/baserow/api.js';
import { provisionTenantWorkspace } from '../../src/services/baserow/tenant-database.js';
import * as usersRepo from '../../src/services/baserow/users.js';
import * as tenantsRepo from '../../src/services/baserow/tenants.js';

const NM_PRIME_SLUG = 'nm-prime';
const NM_PRIME_NAME = 'NM Prime';
const NM_PRIME_ADMIN_EMAIL = 'admin@nmprime.com';

/**
 * Inserts bootstrap rows only when missing.
 * Each tenant gets its own Baserow workspace + database + API token.
 */
export async function up() {
  if (!isBaserowConfigured()) {
    throw new Error('Baserow is not configured. Set BASEROW_* in backend/.env');
  }

  if (!isBaserowMigrateConfigured()) {
    throw new Error(
      'BASEROW_EMAIL and BASEROW_PASSWORD are required to create tenant workspaces',
    );
  }

  const status = await testConnection();
  if (!status.connected) throw new Error(`Baserow connection failed: ${status.message}`);

  if (await usersRepo.userExists(env.superAdmin.email)) {
    console.log(`✓ Super admin already exists (${env.superAdmin.email}) — skipped`);
  } else {
    await usersRepo.createUser({
      email: env.superAdmin.email,
      password_hash: await bcrypt.hash(env.superAdmin.password, 10),
      name: env.superAdmin.name,
      role: 'super_admin',
      tenant_id: null,
      status: 'active',
    });
    console.log(`✓ Created super admin (${env.superAdmin.email})`);
  }

  let tenant = await tenantsRepo.findTenantBySlug(NM_PRIME_SLUG);
  if (tenant) {
    if (!tenant.workspace_id || !tenant.database_id || !tenant.database_token) {
      console.log(
        `⚠ ${NM_PRIME_NAME} tenant exists but has no dedicated workspace. `
        + 'Run: npm run provision:tenant-workspace -- --slug=nm-prime',
      );
    } else {
      console.log(
        `✓ ${NM_PRIME_NAME} tenant already exists `
        + `(workspace ${tenant.workspace_id}, database ${tenant.database_id}) — skipped`,
      );
    }
  } else {
    const { workspaceId, databaseId, databaseToken } = await provisionTenantWorkspace(NM_PRIME_NAME);
    tenant = await tenantsRepo.createTenant({
      name: NM_PRIME_NAME,
      slug: NM_PRIME_SLUG,
      status: 'active',
      workspace_id: workspaceId,
      database_id: databaseId,
      database_token: databaseToken,
    });
    console.log(
      `✓ Created ${NM_PRIME_NAME} tenant (workspace ${workspaceId}, database ${databaseId})`,
    );
  }

  if (await usersRepo.userExists(NM_PRIME_ADMIN_EMAIL)) {
    console.log(`✓ NM Prime admin already exists (${NM_PRIME_ADMIN_EMAIL}) — skipped`);
  } else {
    if (!tenant) throw new Error('NM Prime tenant row is missing');
    await usersRepo.createUser({
      email: NM_PRIME_ADMIN_EMAIL,
      password_hash: await bcrypt.hash('admin123', 10),
      name: 'NM Prime Admin',
      role: 'tenant_admin',
      tenant_id: tenant.id,
      status: 'active',
    });
    console.log('✓ Created NM Prime admin user');
  }

  if (tenant) {
    await tenantsRepo.patchTenantBranding(tenant.id, {
      brandingName: 'NM Prime',
      brandingOrias: 'ORIAS 11063702',
      brandingAccent: '#BE845C',
    });
    console.log('✓ NM Prime branding applied');
  }

  console.log('\nSeed complete (existing data was not modified).');
}

export default { up };
