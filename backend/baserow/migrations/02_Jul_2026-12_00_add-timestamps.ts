import { isBaserowMigrateConfigured } from '../../src/config/env.js';
import {
  createField,
  listAllRows,
  listDatabaseTables,
  listTableFields,
  updateRow,
} from '../../src/services/baserow/api.js';
import { pickFieldValue } from '../../src/utils/baserow.js';
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

async function ensureTimestampFields(tableId: string | number, tableLabel: string): Promise<void> {
  const existingNames = new Set((await listTableFields(tableId)).map((f) => f.name));
  console.log(`  Ensuring timestamp fields on "${tableLabel}"…`);
  await ensureField(
    tableId,
    { name: 'created_on', type: 'created_on', date_include_time: true, date_format: 'ISO' },
    existingNames,
  );
  await ensureField(
    tableId,
    { name: 'updated_on', type: 'last_modified', date_include_time: true, date_format: 'ISO' },
    existingNames,
  );
}

/** Backfills blank status cells (emptied by earlier destructive option patches) with a sensible value. */
async function backfillStatus(
  tableId: string | number,
  tableLabel: string,
  resolve: (row: Record<string, unknown>) => string,
): Promise<void> {
  const rows = await listAllRows(tableId);
  let filled = 0;
  for (const row of rows) {
    if (pickFieldValue(row.status)) continue;
    await updateRow(tableId, row.id, { status: resolve(row) });
    filled += 1;
  }
  console.log(`  ✓ backfilled ${filled} blank status cell(s) on "${tableLabel}"`);
}

/** Adds Baserow-native created_on/updated_on fields to tenants & users and backfills blank status. Idempotent. */
export async function up(): Promise<void> {
  const databaseId = process.env.BASEROW_MAIN_DATABASE_ID || '473304';

  if (!isBaserowMigrateConfigured()) {
    throw new Error(
      'BASEROW_EMAIL and BASEROW_PASSWORD are required. See backend/.env.example',
    );
  }

  console.log(`Adding timestamp fields in main database ${databaseId}…`);
  const tables = await listDatabaseTables(databaseId);
  const T = BASEROW_FIELDS.tenants;
  const U = BASEROW_FIELDS.users;

  const tenantsTable = tables.find((t) => t.name === BASEROW_TABLES.tenants);
  if (tenantsTable) {
    await ensureTimestampFields(tenantsTable.id, BASEROW_TABLES.tenants);
    await backfillStatus(tenantsTable.id, BASEROW_TABLES.tenants, (row) =>
      String(row[T.databaseToken] || '').trim() ? 'active' : 'provisioning',
    );
  } else {
    console.log(`  · "${BASEROW_TABLES.tenants}" table not found — skipped`);
  }

  const usersTable = tables.find((t) => t.name === BASEROW_TABLES.users);
  if (usersTable) {
    await ensureTimestampFields(usersTable.id, BASEROW_TABLES.users);
    await backfillStatus(usersTable.id, BASEROW_TABLES.users, (row) =>
      String(row[U.passwordHash] || '').trim() ? 'active' : 'pending',
    );
  } else {
    console.log(`  · "${BASEROW_TABLES.users}" table not found — skipped`);
  }

  console.log('\nMigration complete.');
}

export default { up };
