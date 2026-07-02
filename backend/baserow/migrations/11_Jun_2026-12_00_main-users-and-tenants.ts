import { isBaserowMigrateConfigured } from '../../src/config/env.js';
import {
  createField,
  createTable,
  listDatabaseTables,
  listTableFields,
} from '../../src/services/baserow/api.js';
import { BASEROW_TABLES, TENANT_STATUS_OPTIONS, USER_STATUS_OPTIONS } from '../schema.js';
import type { BaserowTable } from '../types/baserow.js';
import type { FieldDef } from '../types/baserow.js';

const ROLE_OPTIONS = [
  { value: 'super_admin', color: 'dark-blue' },
  { value: 'tenant_admin', color: 'dark-purple' },
  { value: 'standard_user', color: 'dark-gray' },
] as const;

async function ensureField(
  tableId: string | number,
  fieldDef: FieldDef,
  existingNames: Set<string>,
): Promise<void> {
  if (existingNames.has(fieldDef.name)) {
    console.log(`  · field "${fieldDef.name}" already exists`);
    return;
  }
  await createField(tableId, fieldDef);
  existingNames.add(fieldDef.name);
  console.log(`  ✓ created field "${fieldDef.name}"`);
}

async function ensureTenantsTable(
  databaseId: string,
  existingTables: BaserowTable[],
): Promise<BaserowTable> {
  let table = existingTables.find((t) => t.name === BASEROW_TABLES.tenants);
  if (!table) {
    table = await createTable(databaseId, BASEROW_TABLES.tenants);
    console.log(`✓ Created "${BASEROW_TABLES.tenants}" table (id: ${table.id})`);
  } else {
    console.log(`✓ "${BASEROW_TABLES.tenants}" table already exists (id: ${table.id})`);
  }

  const existingNames = new Set((await listTableFields(table.id)).map((f) => f.name));
  console.log('  Ensuring tenant fields…');
  await ensureField(table.id, { name: 'slug', type: 'text' }, existingNames);
  await ensureField(
    table.id,
    { name: 'status', type: 'single_select', select_options: [...TENANT_STATUS_OPTIONS] },
    existingNames,
  );
  await ensureField(table.id, { name: 'database_id', type: 'text' }, existingNames);
  await ensureField(table.id, { name: 'workspace_id', type: 'text' }, existingNames);
  await ensureField(table.id, { name: 'database_token', type: 'long_text' }, existingNames);
  await ensureField(table.id, { name: 'branding_name', type: 'text' }, existingNames);
  await ensureField(table.id, { name: 'branding_orias', type: 'text' }, existingNames);
  await ensureField(table.id, { name: 'branding_accent', type: 'text' }, existingNames);
  return table;
}

async function ensureUsersTable(
  databaseId: string,
  existingTables: BaserowTable[],
  tenantsTableId: number,
): Promise<BaserowTable> {
  let table = existingTables.find((t) => t.name === BASEROW_TABLES.users);
  if (!table) {
    table = await createTable(databaseId, BASEROW_TABLES.users);
    console.log(`✓ Created "${BASEROW_TABLES.users}" table (id: ${table.id})`);
  } else {
    console.log(`✓ "${BASEROW_TABLES.users}" table already exists (id: ${table.id})`);
  }

  const existingNames = new Set((await listTableFields(table.id)).map((f) => f.name));
  console.log('  Ensuring user fields…');
  await ensureField(table.id, { name: 'email', type: 'email' }, existingNames);
  await ensureField(table.id, { name: 'password_hash', type: 'long_text' }, existingNames);
  await ensureField(
    table.id,
    { name: 'role', type: 'single_select', select_options: [...ROLE_OPTIONS] },
    existingNames,
  );
  await ensureField(
    table.id,
    {
      name: 'tenant_id',
      type: 'link_row',
      link_row_table_id: Number(tenantsTableId),
    },
    existingNames,
  );
  await ensureField(
    table.id,
    { name: 'status', type: 'single_select', select_options: [...USER_STATUS_OPTIONS] },
    existingNames,
  );
  return table;
}

/** Creates users + tenants tables in the main Baserow database. Idempotent — never drops or alters existing data. */
export async function up(): Promise<void> {
  const databaseId = process.env.BASEROW_MAIN_DATABASE_ID || '473304';

  if (!isBaserowMigrateConfigured()) {
    throw new Error(
      'BASEROW_EMAIL and BASEROW_PASSWORD are required. See backend/.env.example',
    );
  }

  console.log(`Migrating main Baserow database ${databaseId}…`);
  const existing = await listDatabaseTables(databaseId);
  const tenantsTable = await ensureTenantsTable(databaseId, existing);
  await ensureUsersTable(databaseId, existing, tenantsTable.id);

  console.log('\nMigration complete.');
}

export default { up };
