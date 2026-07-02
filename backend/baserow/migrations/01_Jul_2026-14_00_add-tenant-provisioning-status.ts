import { isBaserowMigrateConfigured } from '../../src/config/env.js';
import {
  ensureSelectOptions,
  listDatabaseTables,
} from '../../src/services/baserow/api.js';
import { BASEROW_TABLES, TENANT_STATUS_OPTIONS, USER_STATUS_OPTIONS } from '../schema.js';

/** Syncs status single-select options per table, preserving existing option IDs (never wipes cells). Idempotent. */
export async function up(): Promise<void> {
  const databaseId = process.env.BASEROW_MAIN_DATABASE_ID || '473304';

  if (!isBaserowMigrateConfigured()) {
    throw new Error(
      'BASEROW_EMAIL and BASEROW_PASSWORD are required. See backend/.env.example',
    );
  }

  console.log(`Syncing status field options in main database ${databaseId}…`);
  const tables = await listDatabaseTables(databaseId);

  const targets = [
    { name: BASEROW_TABLES.tenants, options: TENANT_STATUS_OPTIONS },
    { name: BASEROW_TABLES.users, options: USER_STATUS_OPTIONS },
  ] as const;

  for (const { name, options } of targets) {
    const table = tables.find((item) => item.name === name);
    if (!table) {
      console.log(`  · "${name}" table not found — skipped`);
      continue;
    }
    const synced = await ensureSelectOptions(table.id, 'status', options);
    console.log(
      synced
        ? `  ✓ synced status options on "${name}"`
        : `  · status on "${name}" is not a single_select — skipped`,
    );
  }

  console.log('\nMigration complete.');
}

export default { up };
