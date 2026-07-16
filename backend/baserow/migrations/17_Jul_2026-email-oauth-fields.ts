/**
 * Per-tenant transactional email OAuth: adds the connection columns to the
 * main-database `tenants` table.
 *
 * Each tenant connects EITHER their Microsoft 365 mailbox (Graph Mail.Send) OR
 * their Gmail account (Gmail API gmail.send). This is independent of the tenant's
 * SharePoint connection — hence a separate set of columns, not shared with the
 * sharepoint_* fields.
 *
 * Timestamps are ISO-8601 text (same choice as the SharePoint migration).
 * Idempotent: safe to re-run.
 */
import { env, isBaserowMigrateConfigured } from '../../src/config/env.js';
import { listDatabaseTables, listTableFieldsWithJwt } from '../../src/services/baserow/api.js';
import { ensureField, ensureTextFields } from '../lib/schema-helpers.js';
import { BASEROW_FIELDS, BASEROW_TABLES } from '../schema.js';

const T = BASEROW_FIELDS.tenants;

export async function up(): Promise<void> {
  if (!isBaserowMigrateConfigured()) {
    throw new Error('BASEROW_EMAIL and BASEROW_PASSWORD are required. See backend/.env.example');
  }

  const databaseId = env.baserow.mainDatabaseId;
  console.log(`Migration: email OAuth fields on tenants (db ${databaseId})…`);

  const tables = await listDatabaseTables(databaseId);
  const table = tables.find((t) => t.name === BASEROW_TABLES.tenants);
  if (!table) {
    console.log('  · no tenants table found, skipping');
    return;
  }

  const fields = new Set((await listTableFieldsWithJwt(table.id)).map((f) => f.name));

  await ensureTextFields(table.id, [
    T.emailProvider,
    T.emailTokenExpiresAt,
    T.emailMsTenantId,
    T.emailSenderAddress,
    T.emailScopesGranted,
    T.emailConnectedAt,
    T.emailConnectedBy,
  ], fields);

  // long_text: AES-256-GCM ciphertext exceeds Baserow's single-line text limit.
  await ensureField(table.id, { name: T.emailAccessToken, type: 'long_text' }, fields);
  await ensureField(table.id, { name: T.emailRefreshToken, type: 'long_text' }, fields);

  console.log('Migration complete.');
}

export default { up };
