import { isBaserowMigrateConfigured } from '../../src/config/env.js';
import { listDatabaseTables, listTableFields } from '../../src/services/baserow/api.js';
import { ensureTable, renameField } from '../lib/schema-helpers.js';
import { BASEROW_TABLES } from '../schema.js';

/** Renames tenants.dropbox_path_base → sharepoint_path_base. Idempotent. */
export async function up(): Promise<void> {
  const databaseId = process.env.BASEROW_MAIN_DATABASE_ID || '473304';

  if (!isBaserowMigrateConfigured()) {
    throw new Error(
      'BASEROW_EMAIL and BASEROW_PASSWORD are required. See backend/.env.example',
    );
  }

  console.log('Migration: rename dropbox_path_base → sharepoint_path_base…');

  const existing = await listDatabaseTables(databaseId);
  const table = await ensureTable(databaseId, BASEROW_TABLES.tenants, existing);
  const fields = new Set((await listTableFields(table.id)).map((f) => f.name));

  await renameField(table.id, 'dropbox_path_base', 'sharepoint_path_base', fields);

  console.log('Migration complete.');
}

export default { up };
