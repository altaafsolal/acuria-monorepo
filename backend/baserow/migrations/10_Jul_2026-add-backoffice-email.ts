import { isBaserowMigrateConfigured } from '../../src/config/env.js';
import { listDatabaseTables, listTableFields } from '../../src/services/baserow/api.js';
import { ensureTable, ensureTextFields } from '../lib/schema-helpers.js';
import { BASEROW_FIELDS, BASEROW_TABLES } from '../schema.js';

const T = BASEROW_FIELDS.tenants;

/** Adds tenants.backoffice_email text field. Idempotent. */
export async function up(): Promise<void> {
  const databaseId = process.env.BASEROW_MAIN_DATABASE_ID || '473304';

  if (!isBaserowMigrateConfigured()) {
    throw new Error(
      'BASEROW_EMAIL and BASEROW_PASSWORD are required. See backend/.env.example',
    );
  }

  console.log('Migration: add backoffice_email to tenants…');

  const existing = await listDatabaseTables(databaseId);
  const table = await ensureTable(databaseId, BASEROW_TABLES.tenants, existing);
  const fields = new Set((await listTableFields(table.id)).map((f) => f.name));

  await ensureTextFields(table.id, [T.backofficeEmail], fields);

  console.log('Migration complete.');
}

export default { up };
