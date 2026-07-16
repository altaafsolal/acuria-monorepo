/**
 * Per-tenant SharePoint OAuth: adds the connection columns to the main-database
 * `tenants` table and drops the obsolete `sharepoint_path_base` field.
 *
 * `sharepoint_path_base` was a free-text path a Super Admin typed into the tenant
 * form. Nothing ever read it. It is replaced by a real OAuth connection owned by
 * the tenant themselves (site/drive resolved from Microsoft Graph).
 *
 * Timestamps are stored as ISO-8601 text rather than Baserow `date` fields to
 * avoid coupling to Baserow's date formatting (same choice as DocuSign_Sent_At).
 *
 * Idempotent: safe to re-run.
 */
import { env, isBaserowMigrateConfigured } from '../../src/config/env.js';
import { listDatabaseTables, listTableFieldsWithJwt } from '../../src/services/baserow/api.js';
import { deleteFieldIfExists, ensureField, ensureTextFields } from '../lib/schema-helpers.js';
import { BASEROW_FIELDS, BASEROW_TABLES } from '../schema.js';

const T = BASEROW_FIELDS.tenants;

export async function up(): Promise<void> {
  if (!isBaserowMigrateConfigured()) {
    throw new Error('BASEROW_EMAIL and BASEROW_PASSWORD are required. See backend/.env.example');
  }

  const databaseId = env.baserow.mainDatabaseId;
  console.log(`Migration: SharePoint OAuth fields on tenants (db ${databaseId})…`);

  const tables = await listDatabaseTables(databaseId);
  const table = tables.find((t) => t.name === BASEROW_TABLES.tenants);
  if (!table) {
    console.log('  · no tenants table found, skipping');
    return;
  }

  const fields = new Set((await listTableFieldsWithJwt(table.id)).map((f) => f.name));

  await ensureTextFields(table.id, [
    T.sharepointTokenExpiresAt,
    T.sharepointMsTenantId,
    T.sharepointSiteId,
    T.sharepointDriveId,
    T.sharepointSiteDisplayName,
    T.sharepointConnectedAt,
    T.sharepointConnectedBy,
  ], fields);

  await ensureField(table.id, { name: T.sharepointConnected, type: 'boolean' }, fields);
  // long_text: AES-256-GCM ciphertext is well past Baserow's single-line text limit.
  await ensureField(table.id, { name: T.sharepointAccessToken, type: 'long_text' }, fields);
  await ensureField(table.id, { name: T.sharepointRefreshToken, type: 'long_text' }, fields);

  await deleteFieldIfExists(table.id, 'sharepoint_path_base', fields);

  console.log('Migration complete.');
}

export default { up };
