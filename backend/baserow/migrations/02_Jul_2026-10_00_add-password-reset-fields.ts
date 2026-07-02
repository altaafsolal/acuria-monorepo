import { isBaserowMigrateConfigured } from '../../src/config/env.js';
import {
  createField,
  listDatabaseTables,
  listTableFields,
} from '../../src/services/baserow/api.js';
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

/** Adds password-reset / OTP fields to users. Idempotent. Status options are owned by the 14_00 migration. */
export async function up(): Promise<void> {
  const databaseId = process.env.BASEROW_MAIN_DATABASE_ID || '473304';

  if (!isBaserowMigrateConfigured()) {
    throw new Error(
      'BASEROW_EMAIL and BASEROW_PASSWORD are required. See backend/.env.example',
    );
  }

  console.log(`Migrating main Baserow database ${databaseId} (password reset fields)…`);
  const tables = await listDatabaseTables(databaseId);
  const usersTable = tables.find((t) => t.name === BASEROW_TABLES.users);

  if (!usersTable) {
    throw new Error(`"${BASEROW_TABLES.users}" table not found in database ${databaseId}`);
  }

  const F = BASEROW_FIELDS.users;
  const existingNames = new Set((await listTableFields(usersTable.id)).map((f) => f.name));
  console.log('  Ensuring users password-reset fields…');

  await ensureField(usersTable.id, { name: F.resetTokenHash, type: 'long_text' }, existingNames);
  await ensureField(usersTable.id, { name: F.resetTokenExpires, type: 'text' }, existingNames);
  await ensureField(usersTable.id, { name: F.otpHash, type: 'long_text' }, existingNames);
  await ensureField(usersTable.id, { name: F.otpExpires, type: 'text' }, existingNames);

  console.log('\nMigration complete.');
}

export default { up };
