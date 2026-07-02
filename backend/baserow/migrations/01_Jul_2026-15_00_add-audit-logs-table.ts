import { isBaserowMigrateConfigured } from '../../src/config/env.js';
import {
  createField,
  createTable,
  listDatabaseTables,
  listTableFields,
} from '../../src/services/baserow/api.js';
import { BASEROW_FIELDS, BASEROW_TABLES } from '../schema.js';
import type { BaserowTable } from '../types/baserow.js';
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

async function ensureAuditLogsTable(
  databaseId: string,
  existingTables: BaserowTable[],
): Promise<BaserowTable> {
  let table = existingTables.find((t) => t.name === BASEROW_TABLES.auditLogs);
  if (!table) {
    table = await createTable(databaseId, BASEROW_TABLES.auditLogs);
    console.log(`✓ Created "${BASEROW_TABLES.auditLogs}" table (id: ${table.id})`);
  } else {
    console.log(`✓ "${BASEROW_TABLES.auditLogs}" table already exists (id: ${table.id})`);
  }

  const F = BASEROW_FIELDS.auditLogs;
  const existingNames = new Set((await listTableFields(table.id)).map((f) => f.name));
  console.log('  Ensuring audit_logs fields…');

  const textFields = [
    F.createdAt,
    F.userId,
    F.userName,
    F.userRole,
    F.tenantId,
    F.action,
    F.method,
    F.path,
    F.entityType,
    F.entityId,
  ] as const;

  for (const fieldName of textFields) {
    await ensureField(table.id, { name: fieldName, type: 'text' }, existingNames);
  }

  await ensureField(table.id, { name: F.userEmail, type: 'email' }, existingNames);
  await ensureField(table.id, { name: F.statusCode, type: 'number' }, existingNames);
  await ensureField(table.id, { name: F.details, type: 'long_text' }, existingNames);

  return table;
}

/** Creates the global audit_logs table in the main Baserow database. Idempotent. */
export async function up(): Promise<void> {
  const databaseId = process.env.BASEROW_MAIN_DATABASE_ID || '473304';

  if (!isBaserowMigrateConfigured()) {
    throw new Error(
      'BASEROW_EMAIL and BASEROW_PASSWORD are required. See backend/.env.example',
    );
  }

  console.log(`Migrating main Baserow database ${databaseId} (audit_logs)…`);
  const existing = await listDatabaseTables(databaseId);
  await ensureAuditLogsTable(databaseId, existing);
  console.log('\nMigration complete.');
}

export default { up };
