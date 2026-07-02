import { env } from '../../src/config/env.js';
import { listDatabaseTables } from '../../src/services/baserow/api.js';
import { BASEROW_TABLES } from '../schema.js';

/** Prints main table IDs for backend/.env — shown at the end of setup. */
export async function printEnvHints(): Promise<void> {
  const tables = await listDatabaseTables(env.baserow.mainDatabaseId);
  const usersTable = tables.find((t) => t.name === BASEROW_TABLES.users);
  const tenantsTable = tables.find((t) => t.name === BASEROW_TABLES.tenants);

  if (!usersTable || !tenantsTable) return;

  const usersId = String(usersTable.id);
  const tenantsId = String(tenantsTable.id);

  console.log('\n── Optional backend/.env (auto-discovered at runtime if omitted) ──\n');
  console.log(`BASEROW_USERS_TABLE_ID=${usersId}`);
  console.log(`BASEROW_TENANTS_TABLE_ID=${tenantsId}`);

  const envUsers = env.baserow.usersTableId;
  const envTenants = env.baserow.tenantsTableId;
  if (envUsers && envTenants && (envUsers !== usersId || envTenants !== tenantsId)) {
    console.log('\n⚠ Your .env table IDs differ from the tables in Baserow — update them or remove them to use auto-discovery.');
  }
}
