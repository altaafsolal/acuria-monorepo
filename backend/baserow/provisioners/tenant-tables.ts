import {
  BASEROW_FIELDS,
  CLIENT_STATUS_OPTIONS,
  CLIENT_TYPE_OPTIONS,
  CRM_DOC_STATUS_OPTIONS,
  KYC_STATUS_OPTIONS,
  GESTIONNAIRE_STATUS_OPTIONS,
  NOTE_TYPE_OPTIONS,
  STATUT_CLIENT_OPTIONS,
  TASK_PRIORITE_OPTIONS,
  TASK_STATUS_OPTIONS,
  TENANT_TABLE_BASES,
} from '../schema.js';
import {
  createField,
  createTable,
  listDatabaseTables,
  listTableFieldsWithJwt,
} from '../../src/services/baserow/api.js';
import type { BaserowTable } from '../types/baserow.js';
import type { FieldDef } from '../types/baserow.js';
import type { TenantRecord } from '../../src/types/domain.js';

const tableIdCache = new Map<string, string>();

async function ensureField(
  tableId: string | number,
  fieldDef: FieldDef,
  existingNames: Set<string>,
): Promise<void> {
  if (existingNames.has(fieldDef.name)) {
    console.log(`    · field "${fieldDef.name}" already exists`);
    return;
  }
  await createField(tableId, fieldDef);
  existingNames.add(fieldDef.name);
  console.log(`    ✓ created field "${fieldDef.name}"`);
}

async function ensureTextFields(
  tableId: string | number,
  names: string[],
  existing: Set<string>,
): Promise<void> {
  for (const name of names) {
    await ensureField(tableId, { name, type: 'text' }, existing);
  }
}

async function ensureTable(databaseId: string, tableName: string): Promise<BaserowTable> {
  const tables = await listDatabaseTables(databaseId);
  let table = tables.find((item) => item.name === tableName);
  if (!table) {
    table = await createTable(databaseId, tableName);
    console.log(`  ✓ created table "${tableName}" (id: ${table.id})`);
  } else {
    console.log(`  · table "${tableName}" already exists (id: ${table.id})`);
  }
  return table;
}

async function ensureClientsFields(tableId: string | number): Promise<void> {
  const F = BASEROW_FIELDS.clients;
  const existing = new Set((await listTableFieldsWithJwt(tableId)).map((f) => f.name));
  await ensureField(tableId, { name: F.email, type: 'email' }, existing);
  await ensureField(
    tableId,
    { name: F.clientType, type: 'single_select', select_options: [...CLIENT_TYPE_OPTIONS] },
    existing,
  );
  await ensureField(
    tableId,
    { name: F.kycStatus, type: 'single_select', select_options: [...KYC_STATUS_OPTIONS] },
    existing,
  );
  await ensureField(
    tableId,
    { name: F.status, type: 'single_select', select_options: [...CLIENT_STATUS_OPTIONS] },
    existing,
  );
  await ensureField(
    tableId,
    { name: F.statutClient, type: 'single_select', select_options: [...STATUT_CLIENT_OPTIONS] },
    existing,
  );
  await ensureTextFields(tableId, [
    F.signataire, F.gestionnaire, F.origine, F.address, F.postalCode, F.city, F.country,
    F.civilite, F.firstName, F.lastName, F.birthPlace, F.nationality, F.maritalStatus,
    F.matrimonialRegime, F.profession, F.proStatus, F.sector, F.employer, F.tradeName,
    F.legalForm, F.siren, F.nafCode, F.activity, F.legalRepName, F.legalRepRole,
    F.revenue, F.totalBalance, F.equity, F.taxation, F.fiscalCountry, F.capital,
    F.patrimoineImmobilier, F.patrimoineEpargne, F.patrimoineParticipations,
    F.patrimoineLiquidites, F.patrimoineAutres, F.notesInternes, F.airtableRecordId,
    F.be1Nom, F.be1LieuNaissance, F.be1Nationalite, F.be1Adresse, F.be1ResidenceFiscale, F.be1Detention,
    F.be2Nom, F.be2LieuNaissance, F.be2Nationalite, F.be2Adresse, F.be2ResidenceFiscale, F.be2Detention,
    F.be3Nom, F.be3LieuNaissance, F.be3Nationalite, F.be3Adresse, F.be3ResidenceFiscale, F.be3Detention,
    F.be4Nom, F.be4LieuNaissance, F.be4Nationalite, F.be4Adresse, F.be4ResidenceFiscale, F.be4Detention,
    F.derEnvoiTimestamp,
  ], existing);
  await ensureField(tableId, { name: F.dateEntree, type: 'date' }, existing);
  await ensureField(tableId, { name: F.birthDate, type: 'date' }, existing);
  await ensureField(tableId, { name: F.be1Ddn, type: 'date' }, existing);
  await ensureField(tableId, { name: F.be2Ddn, type: 'date' }, existing);
  await ensureField(tableId, { name: F.be3Ddn, type: 'date' }, existing);
  await ensureField(tableId, { name: F.be4Ddn, type: 'date' }, existing);
  await ensureField(tableId, { name: F.phone, type: 'phone_number' }, existing);
  await ensureField(tableId, { name: F.phoneMobile, type: 'phone_number' }, existing);
  await ensureField(tableId, { name: F.phoneHome, type: 'phone_number' }, existing);
  await ensureField(tableId, { name: F.phoneOffice, type: 'phone_number' }, existing);
  await ensureField(tableId, { name: F.annualIncome, type: 'number' }, existing);
  await ensureField(tableId, { name: F.currentCharges, type: 'number' }, existing);
  await ensureField(tableId, { name: F.fccDate, type: 'date' }, existing);
  await ensureField(tableId, { name: F.derDate, type: 'date' }, existing);
  await ensureField(tableId, { name: F.ldmDate, type: 'date' }, existing);
  for (const field of [F.fccStatut, F.derStatut, F.ldmStatut] as const) {
    await ensureField(
      tableId,
      { name: field, type: 'single_select', select_options: [...CRM_DOC_STATUS_OPTIONS] },
      existing,
    );
  }
}

async function ensureGestionnairesFields(tableId: string | number): Promise<void> {
  const F = BASEROW_FIELDS.gestionnaires;
  const existing = new Set((await listTableFieldsWithJwt(tableId)).map((f) => f.name));
  await ensureTextFields(tableId, [
    F.firstName,
    F.lastName,
    F.role,
    F.initiales,
    F.couleur,
    F.userId,
    F.airtableRecordId,
  ], existing);
  await ensureField(tableId, { name: F.email, type: 'email' }, existing);
  await ensureField(tableId, { name: F.phone, type: 'phone_number' }, existing);
  await ensureField(tableId, { name: F.peutSignerDocusign, type: 'boolean' }, existing);
  await ensureField(
    tableId,
    {
      name: F.status,
      type: 'single_select',
      select_options: [...GESTIONNAIRE_STATUS_OPTIONS],
    },
    existing,
  );
}

async function ensureKycDocumentsFields(tableId: string | number, clientsTableId: string): Promise<void> {
  const F = BASEROW_FIELDS.kycDocuments;
  const existing = new Set((await listTableFieldsWithJwt(tableId)).map((f) => f.name));
  await ensureField(
    tableId,
    { name: F.clientId, type: 'link_row', link_row_table_id: Number(clientsTableId) },
    existing,
  );
  await ensureTextFields(tableId, [F.docType, F.airtableRecordId], existing);
  await ensureField(tableId, { name: F.recu, type: 'boolean' }, existing);
  await ensureField(tableId, { name: F.dateReception, type: 'date' }, existing);
  await ensureField(tableId, { name: F.dateValidite, type: 'date' }, existing);
  await ensureField(tableId, { name: F.urlDocument, type: 'url' }, existing);
}

async function ensureNotesFields(tableId: string | number, clientsTableId: string): Promise<void> {
  const F = BASEROW_FIELDS.notes;
  const existing = new Set((await listTableFieldsWithJwt(tableId)).map((f) => f.name));
  await ensureField(
    tableId,
    { name: F.clientId, type: 'link_row', link_row_table_id: Number(clientsTableId) },
    existing,
  );
  await ensureField(
    tableId,
    { name: F.date, type: 'date', date_include_time: true, date_format: 'ISO' },
    existing,
  );
  await ensureField(
    tableId,
    { name: F.noteType, type: 'single_select', select_options: [...NOTE_TYPE_OPTIONS] },
    existing,
  );
  await ensureTextFields(tableId, [F.auteur, F.contenu, F.source, F.airtableRecordId], existing);
  await ensureField(tableId, { name: F.piecesJointes, type: 'file' }, existing);
}

async function ensureRelationsFields(tableId: string | number, clientsTableId: string): Promise<void> {
  const F = BASEROW_FIELDS.relations;
  const existing = new Set((await listTableFieldsWithJwt(tableId)).map((f) => f.name));
  await ensureField(
    tableId,
    { name: F.clientAId, type: 'link_row', link_row_table_id: Number(clientsTableId) },
    existing,
  );
  await ensureField(
    tableId,
    { name: F.clientBId, type: 'link_row', link_row_table_id: Number(clientsTableId) },
    existing,
  );
  await ensureTextFields(tableId, [F.typeRelation, F.note, F.airtableRecordId], existing);
  await ensureField(tableId, { name: F.pctDetention, type: 'number' }, existing);
}

async function ensureTasksFields(tableId: string | number, clientsTableId: string): Promise<void> {
  const F = BASEROW_FIELDS.tasks;
  const existing = new Set((await listTableFieldsWithJwt(tableId)).map((f) => f.name));
  await ensureField(tableId, { name: F.title, type: 'text' }, existing);
  await ensureField(tableId, { name: F.description, type: 'long_text' }, existing);
  await ensureField(
    tableId,
    { name: F.status, type: 'single_select', select_options: [...TASK_STATUS_OPTIONS] },
    existing,
  );
  await ensureField(
    tableId,
    { name: F.priorite, type: 'single_select', select_options: [...TASK_PRIORITE_OPTIONS] },
    existing,
  );
  await ensureTextFields(tableId, [F.assigneA, F.airtableRecordId], existing);
  await ensureField(tableId, { name: F.dueDate, type: 'date' }, existing);
  await ensureField(
    tableId,
    { name: F.clientId, type: 'link_row', link_row_table_id: Number(clientsTableId) },
    existing,
  );
}

async function ensureAuditLogsFields(tableId: string | number): Promise<void> {
  const F = BASEROW_FIELDS.auditLogs;
  const existing = new Set((await listTableFieldsWithJwt(tableId)).map((f) => f.name));
  await ensureTextFields(tableId, [F.action, F.entityType, F.entityId, F.details], existing);
  await ensureField(tableId, { name: F.userEmail, type: 'email' }, existing);
}

type FieldEnsurer = (tableId: string | number, clientsTableId: string) => Promise<void>;

/** Creates tenant tables in the tenant's dedicated Baserow database. */
export async function provisionTenantTables(
  tenant: TenantRecord,
): Promise<Record<string, string | undefined>> {
  const tenantKey = String(tenant.id);
  const databaseId = tenant.database_id;

  if (!databaseId) {
    throw new Error(
      `Tenant ${tenantKey} has no database_id. Each tenant requires a dedicated Baserow database.`,
    );
  }

  console.log(`Provisioning tenant ${tenantKey} in database ${databaseId}…`);

  const clientsTable = await ensureTable(databaseId, 'clients');
  await ensureClientsFields(clientsTable.id);

  const gestionnairesTable = await ensureTable(databaseId, 'gestionnaires');
  await ensureGestionnairesFields(gestionnairesTable.id);
  tableIdCache.set(`${tenantKey}:gestionnaires`, String(gestionnairesTable.id));

  const clientsTableId = String(clientsTable.id);
  tableIdCache.set(`${tenantKey}:clients`, clientsTableId);

  const linkedTables: Array<[string, FieldEnsurer]> = [
    ['kyc_documents', ensureKycDocumentsFields],
    ['notes', ensureNotesFields],
    ['relations', ensureRelationsFields],
    ['tasks', ensureTasksFields],
  ];

  for (const [base, ensureFields] of linkedTables) {
    const table = await ensureTable(databaseId, base);
    await ensureFields(table.id, clientsTableId);
    tableIdCache.set(`${tenantKey}:${base}`, String(table.id));
  }

  const auditTable = await ensureTable(databaseId, 'audit_logs');
  await ensureAuditLogsFields(auditTable.id);
  tableIdCache.set(`${tenantKey}:audit_logs`, String(auditTable.id));

  const tableIds = Object.fromEntries(
    TENANT_TABLE_BASES.map((base) => [base, tableIdCache.get(`${tenantKey}:${base}`)]),
  );

  console.log(`✓ Tenant ${tenantKey} tables ready`);
  return tableIds;
}

export function getCachedTenantTableId(tenantId: string, baseName: string): string | null {
  return tableIdCache.get(`${String(tenantId)}:${baseName}`) ?? null;
}

export function clearTenantTableCache(): void {
  tableIdCache.clear();
}
