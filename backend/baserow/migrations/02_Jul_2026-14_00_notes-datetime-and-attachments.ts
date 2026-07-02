import { isBaserowMigrateConfigured } from '../../src/config/env.js';
import * as tenantsRepo from '../../src/services/baserow/tenants.js';
import {
  createField,
  listDatabaseTables,
  listTableFieldsWithJwt,
  updateField,
} from '../../src/services/baserow/api.js';
import { BASEROW_FIELDS } from '../schema.js';
import type { FieldDef } from '../types/baserow.js';

const F = BASEROW_FIELDS.notes;

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

async function ensureNotesDateTimeAndAttachments(tableId: string | number): Promise<void> {
  const fields = await listTableFieldsWithJwt(tableId);
  const existingNames = new Set(fields.map((f) => f.name));

  const dateField = fields.find((f) => f.name === F.date);
  if (dateField) {
    await updateField(dateField.id, {
      date_include_time: true,
      date_format: 'ISO',
    });
    console.log(`  ✓ updated "${F.date}" to include time`);
  } else {
    await ensureField(
      tableId,
      { name: F.date, type: 'date', date_include_time: true, date_format: 'ISO' },
      existingNames,
    );
  }

  await ensureField(tableId, { name: F.piecesJointes, type: 'file' }, existingNames);
}

/** Adds datetime support on notes.date and a pieces_jointes file field on all tenant notes tables. */
export async function up(): Promise<void> {
  if (!isBaserowMigrateConfigured()) {
    throw new Error(
      'BASEROW_EMAIL and BASEROW_PASSWORD are required. See backend/.env.example',
    );
  }

  const tenants = await tenantsRepo.listTenants();
  if (tenants.length === 0) {
    console.log('No tenants found — skipping notes datetime/attachments migration.');
    return;
  }

  for (const tenant of tenants) {
    if (!tenant.database_id) {
      console.log(`  · Tenant ${tenant.name} has no database_id — skipped`);
      continue;
    }

    console.log(`\nTenant: ${tenant.name} (database ${tenant.database_id})`);
    const tables = await listDatabaseTables(tenant.database_id);
    const notesTable = tables.find((t) => t.name === 'notes');
    if (!notesTable) {
      console.log('  · "notes" table not found — skipped');
      continue;
    }

    await ensureNotesDateTimeAndAttachments(notesTable.id);
  }

  console.log('\nMigration complete.');
}

export default { up };
