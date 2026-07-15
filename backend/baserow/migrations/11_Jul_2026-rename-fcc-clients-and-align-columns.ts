import { isBaserowMigrateConfigured } from '../../src/config/env.js';
import { listDatabaseTables, listTableFieldsWithJwt } from '../../src/services/baserow/api.js';
import { listTenants } from '../../src/services/baserow/tenants.js';
import { deleteFieldIfExists, renameField, renameTable } from '../lib/schema-helpers.js';

/**
 * Per-tenant migration:
 *  - renames the Baserow table `fcc_submissions` → `fcc_clients`
 *  - aligns columns to the Airtable `FCC_Clients` schema (case fixes + rename)
 *  - deletes legacy duplicate columns
 * New fields (Notes_NM, DocuSign_Sent_At) are added by the tenant provisioning step
 * that runs after migrations. Idempotent and safe to re-run.
 */

const FIELD_RENAMES: Array<[string, string]> = [
  ['score_connaissance', 'Score_Connaissance'],
  ['score_risque', 'Score_Risque'],
  ['profil_connaissance', 'Profil_Connaissance'],
  ['profil_risque', 'Profil_Risque'],
  ['docusign_envelope_id', 'DocuSign_Envelope_ID'],
  ['airtable_record_id', 'migration_record_id'],
];

const FIELDS_TO_DELETE = ['form_type', 'statut', 'submitted_at', 'raw_data'];

export async function up(): Promise<void> {
  if (!isBaserowMigrateConfigured()) {
    throw new Error(
      'BASEROW_EMAIL and BASEROW_PASSWORD are required. See backend/.env.example',
    );
  }

  console.log('Migration: rename fcc_submissions → fcc_clients + align columns (per tenant)…');

  const tenants = await listTenants();
  for (const tenant of tenants) {
    if (!tenant.database_id) {
      console.log(`  · tenant ${tenant.slug || tenant.id} has no database_id, skipping`);
      continue;
    }

    console.log(`  Tenant ${tenant.slug || tenant.id} (db ${tenant.database_id})…`);
    const tables = await listDatabaseTables(tenant.database_id);
    await renameTable(tenant.database_id, 'fcc_submissions', 'fcc_clients', tables);

    const table = tables.find((t) => t.name === 'fcc_clients');
    if (!table) {
      console.log('    · no fcc_clients table, skipping column alignment');
      continue;
    }

    const fields = new Set((await listTableFieldsWithJwt(table.id)).map((f) => f.name));
    for (const [oldName, newName] of FIELD_RENAMES) {
      await renameField(table.id, oldName, newName, fields);
    }
    for (const name of FIELDS_TO_DELETE) {
      await deleteFieldIfExists(table.id, name, fields);
    }
  }

  console.log('Migration complete.');
}

export default { up };
