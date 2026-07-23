import { isBaserowMigrateConfigured } from '../../src/config/env.js';
import { listDatabaseTables, listTableFieldsWithJwt } from '../../src/services/baserow/api.js';
import { listTenants } from '../../src/services/baserow/tenants.js';
import { deleteFieldIfExists } from '../lib/schema-helpers.js';

/**
 * Per-tenant migration: deletes the unused `couleur` column from each tenant's
 * `gestionnaires` table. The field was only ever captured in the user form and never
 * displayed anywhere, so it carries no meaning. Idempotent (skips tenants/tables/fields
 * that don't have it) and safe to re-run.
 */
export async function up(): Promise<void> {
  if (!isBaserowMigrateConfigured()) {
    throw new Error(
      'BASEROW_EMAIL and BASEROW_PASSWORD are required. See backend/.env.example',
    );
  }

  console.log('Migration: remove gestionnaires.couleur (per tenant)…');

  const tenants = await listTenants();
  for (const tenant of tenants) {
    if (!tenant.database_id) {
      console.log(`  · tenant ${tenant.slug || tenant.id} has no database_id, skipping`);
      continue;
    }

    console.log(`  Tenant ${tenant.slug || tenant.id} (db ${tenant.database_id})…`);
    const tables = await listDatabaseTables(tenant.database_id);
    const table = tables.find((t) => t.name === 'gestionnaires');
    if (!table) {
      console.log('    · no gestionnaires table, skipping');
      continue;
    }

    const fields = new Set((await listTableFieldsWithJwt(table.id)).map((f) => f.name));
    await deleteFieldIfExists(table.id, 'couleur', fields);
  }

  console.log('Migration complete.');
}

export default { up };
