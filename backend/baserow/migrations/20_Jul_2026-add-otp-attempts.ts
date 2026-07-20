import { isBaserowMigrateConfigured } from '../../src/config/env.js';
import { listDatabaseTables, listTableFields } from '../../src/services/baserow/api.js';
import { ensureField, ensureTable } from '../lib/schema-helpers.js';
import { BASEROW_FIELDS, BASEROW_TABLES } from '../schema.js';

const U = BASEROW_FIELDS.users;

/** Adds users.otp_attempts (number) — backs the password-reset OTP lockout. Idempotent. */
export async function up(): Promise<void> {
  const databaseId = process.env.BASEROW_MAIN_DATABASE_ID || '473304';

  if (!isBaserowMigrateConfigured()) {
    throw new Error(
      'BASEROW_EMAIL and BASEROW_PASSWORD are required. See backend/.env.example',
    );
  }

  console.log('Migration: add otp_attempts to users…');

  const existing = await listDatabaseTables(databaseId);
  const table = await ensureTable(databaseId, BASEROW_TABLES.users, existing);
  const fields = new Set((await listTableFields(table.id)).map((f) => f.name));

  await ensureField(table.id, { name: U.otpAttempts, type: 'number' }, fields);

  console.log('Migration complete.');
}

export default { up };
