import { isBaserowMigrateConfigured } from '../../src/config/env.js';
import { listDatabaseTables, listTableFields } from '../../src/services/baserow/api.js';
import { ensureField, ensureTable, ensureTextFields } from '../lib/schema-helpers.js';
import {
  BASEROW_FIELDS,
  BASEROW_TABLES,
  TENANT_STATUS_OPTIONS,
  USER_ROLE_OPTIONS,
  USER_STATUS_OPTIONS,
} from '../schema.js';

const T = BASEROW_FIELDS.tenants;
const U = BASEROW_FIELDS.users;
const A = BASEROW_FIELDS.auditLogs;

async function ensureTenantsSchema(databaseId: string): Promise<number> {
  const existing = await listDatabaseTables(databaseId);
  const table = await ensureTable(databaseId, BASEROW_TABLES.tenants, existing);
  const fields = new Set((await listTableFields(table.id)).map((f) => f.name));

  console.log('  Ensuring tenant fields…');
  await ensureTextFields(table.id, [
    T.slug,
    T.databaseId,
    T.workspaceId,
    T.brandingName,
    T.brandingOrias,
    T.brandingAccent,
  ], fields);
  await ensureField(table.id, { name: T.databaseToken, type: 'long_text' }, fields);
  await ensureField(
    table.id,
    { name: T.status, type: 'single_select', select_options: [...TENANT_STATUS_OPTIONS] },
    fields,
  );
  await ensureField(
    table.id,
    { name: T.createdOn, type: 'created_on', date_include_time: true, date_format: 'ISO' },
    fields,
  );
  await ensureField(
    table.id,
    { name: T.updatedOn, type: 'last_modified', date_include_time: true, date_format: 'ISO' },
    fields,
  );
  await ensureField(table.id, { name: T.brandingLogo, type: 'file' }, fields);

  return Number(table.id);
}

async function ensureUsersSchema(databaseId: string, tenantsTableId: number): Promise<void> {
  const existing = await listDatabaseTables(databaseId);
  const table = await ensureTable(databaseId, BASEROW_TABLES.users, existing);
  const fields = new Set((await listTableFields(table.id)).map((f) => f.name));

  console.log('  Ensuring user fields…');
  await ensureField(table.id, { name: U.email, type: 'email' }, fields);
  await ensureField(table.id, { name: U.passwordHash, type: 'long_text' }, fields);
  await ensureField(
    table.id,
    { name: U.role, type: 'single_select', select_options: [...USER_ROLE_OPTIONS] },
    fields,
  );
  await ensureField(
    table.id,
    { name: U.tenantId, type: 'link_row', link_row_table_id: tenantsTableId },
    fields,
  );
  await ensureField(
    table.id,
    { name: U.status, type: 'single_select', select_options: [...USER_STATUS_OPTIONS] },
    fields,
  );
  await ensureField(table.id, { name: U.resetTokenHash, type: 'long_text' }, fields);
  await ensureField(table.id, { name: U.resetTokenExpires, type: 'text' }, fields);
  await ensureField(table.id, { name: U.otpHash, type: 'long_text' }, fields);
  await ensureField(table.id, { name: U.otpExpires, type: 'text' }, fields);
  await ensureField(table.id, { name: U.airtableRecordId, type: 'text' }, fields);
  await ensureField(
    table.id,
    { name: U.createdOn, type: 'created_on', date_include_time: true, date_format: 'ISO' },
    fields,
  );
  await ensureField(
    table.id,
    { name: U.updatedOn, type: 'last_modified', date_include_time: true, date_format: 'ISO' },
    fields,
  );
}

async function ensureAuditLogsSchema(databaseId: string): Promise<void> {
  const existing = await listDatabaseTables(databaseId);
  const table = await ensureTable(databaseId, BASEROW_TABLES.auditLogs, existing);
  const fields = new Set((await listTableFields(table.id)).map((f) => f.name));

  console.log('  Ensuring audit_logs fields…');
  await ensureTextFields(table.id, [
    A.createdAt,
    A.userId,
    A.userName,
    A.userRole,
    A.tenantId,
    A.action,
    A.method,
    A.path,
    A.entityType,
    A.entityId,
  ], fields);
  await ensureField(table.id, { name: A.userEmail, type: 'email' }, fields);
  await ensureField(table.id, { name: A.statusCode, type: 'number' }, fields);
  await ensureField(table.id, { name: A.details, type: 'long_text' }, fields);
}

/** Creates the full main-database schema (tenants, users, audit_logs). Idempotent. */
export async function up(): Promise<void> {
  const databaseId = process.env.BASEROW_MAIN_DATABASE_ID || '473304';

  if (!isBaserowMigrateConfigured()) {
    throw new Error(
      'BASEROW_EMAIL and BASEROW_PASSWORD are required. See backend/.env.example',
    );
  }

  console.log(`Provisioning main Baserow database ${databaseId}…`);

  const tenantsTableId = await ensureTenantsSchema(databaseId);
  await ensureUsersSchema(databaseId, tenantsTableId);
  await ensureAuditLogsSchema(databaseId);

  console.log('\nMain platform schema ready.');
}

export default { up };
