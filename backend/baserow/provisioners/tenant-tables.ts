import {
  BASEROW_FIELDS,
  CLIENT_STATUS_OPTIONS,
  CLIENT_TYPE_OPTIONS,
  CRM_DOC_STATUS_OPTIONS,
  FCC_DOSSIER_STATUS_OPTIONS,
  KYC_STATUS_OPTIONS,
  GESTIONNAIRE_STATUS_OPTIONS,
  NOTE_TYPE_OPTIONS,
  STATUT_CLIENT_OPTIONS,
  TASK_PRIORITE_OPTIONS,
  TASK_STATUS_OPTIONS,
  TENANT_TABLE_BASES,
} from '../schema.js';
import { ensureField, ensureTable, ensureTextFields } from '../lib/schema-helpers.js';
import { ensureSelectOptions, listDatabaseTables, listTableFieldsWithJwt } from '../../src/services/baserow/api.js';
import type { TenantRecord } from '../../src/types/domain.js';

const tableIdCache = new Map<string, string>();

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
    // Always sync options so new values (e.g. 'DocuSign envoyé') are added to existing fields
    await ensureSelectOptions(tableId, field, CRM_DOC_STATUS_OPTIONS);
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
  await ensureTextFields(tableId, [F.docType, F.clientIdOld, F.clientNom, F.airtableRecordId], existing);
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
  await ensureField(tableId, { name: F.piecesJointes, type: 'long_text' }, existing);
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
  await ensureTextFields(tableId, [F.assigneA, F.creePar, F.airtableRecordId], existing);
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

async function ensureFccClientsFields(tableId: string | number, clientsTableId: string): Promise<void> {
  const F = BASEROW_FIELDS.fccClients;
  const existing = new Set((await listTableFieldsWithJwt(tableId)).map((f) => f.name));
  await ensureField(
    tableId,
    { name: F.clientId, type: 'link_row', link_row_table_id: Number(clientsTableId) },
    existing,
  );
  await ensureField(
    tableId,
    { name: F.docusignSentAt, type: 'date', date_include_time: true, date_format: 'ISO' },
    existing,
  );
  await ensureTextFields(
    tableId,
    [F.profilRisque, F.profilConnaissance, F.docusignEnvelopeId, F.migrationRecordId],
    existing,
  );
  await ensureField(tableId, { name: F.notesNm, type: 'long_text' }, existing);
  await ensureField(tableId, { name: F.scoreConnaissance, type: 'number' }, existing);
  await ensureField(tableId, { name: F.scoreRisque, type: 'number' }, existing);
  // FCC_Clients fields (mirror Airtable)
  await ensureTextFields(
    tableId,
    [
      F.typeFormulaire, F.idFormulaire, F.dateSoumission, F.client, F.email,
      F.telephone, F.ville, F.profession,
      F.sharepointFileUrl, F.sharepointFileId, F.ipClient, F.pdfFilename,
      F.prefillToken, F.boAgent,
      F.be1Nom, F.be1Ddn, F.be1LieuNaissance, F.be1Nationalite, F.be1ResidenceFiscale, F.be1Adresse, F.be1Detention,
      F.be2Nom, F.be2Ddn, F.be2LieuNaissance, F.be2Nationalite, F.be2ResidenceFiscale, F.be2Adresse, F.be2Detention,
      F.be3Nom, F.be3Ddn, F.be3Nationalite, F.be3Detention,
      F.be4Nom, F.be4Ddn, F.be4Nationalite, F.be4Detention,
      F.clientDenomination, F.clientRepresentantNom, F.clientRepresentantFonction,
      F.clientSiren, F.clientNaf, F.clientActivite, F.clientFormeJuridique,
      F.clientCa, F.clientBilan, F.clientFondsPropres, F.clientFiscalite,
    ],
    existing,
  );
  await ensureField(tableId, { name: F.scoreTotal, type: 'number' }, existing);
  await ensureField(
    tableId,
    { name: F.statutDossier, type: 'single_select', select_options: [...FCC_DOSSIER_STATUS_OPTIONS] },
    existing,
  );
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

  const existingTables = await listDatabaseTables(databaseId);

  const clientsTable = await ensureTable(databaseId, 'clients', existingTables);
  await ensureClientsFields(clientsTable.id);

  const gestionnairesTable = await ensureTable(databaseId, 'gestionnaires', existingTables);
  await ensureGestionnairesFields(gestionnairesTable.id);
  tableIdCache.set(`${tenantKey}:gestionnaires`, String(gestionnairesTable.id));

  const clientsTableId = String(clientsTable.id);
  tableIdCache.set(`${tenantKey}:clients`, clientsTableId);

  const linkedTables: Array<[string, FieldEnsurer]> = [
    ['kyc_documents', ensureKycDocumentsFields],
    ['notes', ensureNotesFields],
    ['relations', ensureRelationsFields],
    ['tasks', ensureTasksFields],
    ['fcc_clients', ensureFccClientsFields],
  ];

  for (const [base, ensureFields] of linkedTables) {
    const table = await ensureTable(databaseId, base, existingTables);
    await ensureFields(table.id, clientsTableId);
    tableIdCache.set(`${tenantKey}:${base}`, String(table.id));
  }

  const auditTable = await ensureTable(databaseId, 'audit_logs', existingTables);
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
