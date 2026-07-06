import { BASEROW_FIELDS } from '../../../baserow/schema.js';
import { normalizeDateForBaserow, pickFieldValue, pickLinkRowId, pickTextValue } from '../../utils/baserow.js';
import { createRow, getRow, listAllRows, updateRow } from './api.js';
import { resolveTenantDbContext } from './tenant-context.js';
import { resolveTenantTableId } from './tenant-tables.js';
import type { BaserowRow, DbKycDocument, PublicKycDocument } from '../../types/domain.js';

const F = BASEROW_FIELDS.kycDocuments;

function mapRow(row: BaserowRow): DbKycDocument {
  return {
    id: String(row.id),
    name: String(row[F.name] || ''),
    client_id: pickLinkRowId(row[F.clientId]),
    client_id_old: pickTextValue(row[F.clientIdOld]),
    client_nom: pickTextValue(row[F.clientNom]),
    doc_type: pickTextValue(row[F.docType]) || '',
    recu: Boolean(row[F.recu]),
    date_reception: pickTextValue(row[F.dateReception]),
    date_validite: pickTextValue(row[F.dateValidite]),
    url_document: pickTextValue(row[F.urlDocument]),
    airtable_record_id: pickTextValue(row[F.airtableRecordId]),
  };
}

export function toPublicKycDocument(doc: DbKycDocument): PublicKycDocument {
  return {
    id: doc.id,
    clientId: doc.client_id,
    clientIdOld: doc.client_id_old,
    clientNom: doc.client_nom,
    docType: doc.doc_type,
    recu: doc.recu,
    dateReception: doc.date_reception,
    dateValidite: doc.date_validite,
    urlDocument: doc.url_document,
  };
}

export async function listKycDocumentsByClient(
  tenantId: string,
  clientId: string,
): Promise<PublicKycDocument[]> {
  const ctx = await resolveTenantDbContext(tenantId);
  const tableId = await resolveTenantTableId(tenantId, 'kyc_documents');
  return (await listAllRows(tableId, {
    filters: { filter_type: 'AND', filters: [{ type: 'link_row_has', field: F.clientId, value: clientId }] },
  }, ctx)).map(mapRow).map(toPublicKycDocument);
}

export async function listAllKycDocuments(tenantId: string): Promise<DbKycDocument[]> {
  const ctx = await resolveTenantDbContext(tenantId);
  const tableId = await resolveTenantTableId(tenantId, 'kyc_documents');
  return (await listAllRows(tableId, {}, ctx)).map(mapRow);
}

export async function getKycDocumentById(
  tenantId: string,
  documentId: string,
): Promise<DbKycDocument | null> {
  try {
    const ctx = await resolveTenantDbContext(tenantId);
    const tableId = await resolveTenantTableId(tenantId, 'kyc_documents');
    const row = await getRow(tableId, documentId, ctx);
    return mapRow(row);
  } catch {
    return null;
  }
}

export async function createKycDocument(
  tenantId: string,
  input: {
    clientId: string;
    docType: string;
    recu?: boolean;
    dateReception?: string | null;
    dateValidite?: string | null;
    urlDocument?: string | null;
  },
): Promise<PublicKycDocument> {
  const ctx = await resolveTenantDbContext(tenantId);
  const tableId = await resolveTenantTableId(tenantId, 'kyc_documents');
  const payload: Record<string, unknown> = {
    [F.name]: input.docType,
    [F.clientId]: [Number(input.clientId)],
    [F.docType]: input.docType,
    [F.recu]: input.recu ?? false,
    [F.urlDocument]: input.urlDocument || '',
  };
  const dateReception = normalizeDateForBaserow(input.dateReception);
  const dateValidite = normalizeDateForBaserow(input.dateValidite);
  if (dateReception) payload[F.dateReception] = dateReception;
  if (dateValidite) payload[F.dateValidite] = dateValidite;
  const row = await createRow(tableId, payload, ctx);
  return toPublicKycDocument(mapRow(row));
}

export async function updateKycDocument(
  tenantId: string,
  documentId: string,
  input: Partial<{
    recu: boolean;
    dateReception: string | null;
    dateValidite: string | null;
    urlDocument: string | null;
  }>,
): Promise<PublicKycDocument | null> {
  const ctx = await resolveTenantDbContext(tenantId);
  const tableId = await resolveTenantTableId(tenantId, 'kyc_documents');
  const payload: Record<string, unknown> = {};
  if (input.recu !== undefined) payload[F.recu] = input.recu;
  if (input.dateReception !== undefined) {
    const dateReception = normalizeDateForBaserow(input.dateReception);
    payload[F.dateReception] = dateReception ?? null;
  }
  if (input.dateValidite !== undefined) {
    const dateValidite = normalizeDateForBaserow(input.dateValidite);
    payload[F.dateValidite] = dateValidite ?? null;
  }
  if (input.urlDocument !== undefined) payload[F.urlDocument] = input.urlDocument || '';
  const row = await updateRow(tableId, documentId, payload, ctx);
  return toPublicKycDocument(mapRow(row));
}

export async function upsertKycDocumentFromAirtable(
  tenantId: string,
  data: {
    clientId?: string | null;
    clientIdOld?: string | null;
    clientNom?: string | null;
    docType: string;
    recu?: boolean;
    dateReception?: string | null;
    dateValidite?: string | null;
    urlDocument?: string | null;
    airtableRecordId: string;
  },
): Promise<DbKycDocument> {
  const ctx = await resolveTenantDbContext(tenantId);
  const tableId = await resolveTenantTableId(tenantId, 'kyc_documents');
  const rows = await listAllRows(tableId, {}, ctx);
  const existing = rows.find((r) => pickTextValue(r[F.airtableRecordId]) === data.airtableRecordId);
  const payload: Record<string, unknown> = {
    [F.name]: data.docType,
    [F.clientId]: data.clientId ? [Number(data.clientId)] : [],
    [F.clientIdOld]: data.clientIdOld || '',
    [F.clientNom]: data.clientNom || '',
    [F.docType]: data.docType,
    [F.recu]: data.recu ?? false,
    [F.urlDocument]: data.urlDocument || '',
    [F.airtableRecordId]: data.airtableRecordId,
  };
  const dateReception = normalizeDateForBaserow(data.dateReception);
  const dateValidite = normalizeDateForBaserow(data.dateValidite);
  if (dateReception) payload[F.dateReception] = dateReception;
  if (dateValidite) payload[F.dateValidite] = dateValidite;
  if (existing) {
    return mapRow(await updateRow(tableId, existing.id, payload, ctx));
  }
  return mapRow(await createRow(tableId, payload, ctx));
}
