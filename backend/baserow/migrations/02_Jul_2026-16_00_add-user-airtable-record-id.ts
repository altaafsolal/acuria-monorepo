import { isBaserowMigrateConfigured } from '../../src/config/env.js';
import { createField, listDatabaseTables, listTableFields } from '../../src/services/baserow/api.js';
import { BASEROW_FIELDS, BASEROW_TABLES } from '../schema.js';
import type { FieldDef } from '../types/baserow.js';

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

/** Adds airtable_record_id to users for idempotent Airtable → Baserow gestionnaire migration. */
export async function up(): Promise<void> {
  const databaseId = process.env.BASEROW_MAIN_DATABASE_ID || '473304';

  if (!isBaserowMigrateConfigured()) {
    throw new Error(
      'BASEROW_EMAIL and BASEROW_PASSWORD are required. See backend/.env.example',
    );
  }

  console.log(`Adding user airtable_record_id in main database ${databaseId}…`);
  const tables = await listDatabaseTables(databaseId);
  const usersTable = tables.find((t) => t.name === BASEROW_TABLES.users);
  if (!usersTable) {
    console.log(`  · "${BASEROW_TABLES.users}" table not found — skipped`);
    return;
  }

  const existingNames = new Set((await listTableFields(usersTable.id)).map((f) => f.name));
  await ensureField(
    usersTable.id,
    { name: BASEROW_FIELDS.users.airtableRecordId, type: 'text' },
    existingNames,
  );

  console.log('\nMigration complete.');
}

export default { up };
