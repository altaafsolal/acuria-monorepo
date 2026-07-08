import { BASEROW_FIELDS } from '../../../baserow/schema.js';
import {
  pickFieldValue,
  pickLinkRowId,
  pickTextValue,
} from '../../utils/baserow.js';
import { createRow, listAllRows, updateRow } from './api.js';
import { resolveTenantDbContext } from './tenant-context.js';
import { resolveTenantTableId } from './tenant-tables.js';
import type { BaserowRow, DbFccSubmission, PublicFccSubmission } from '../../types/domain.js';

const F = BASEROW_FIELDS.fccSubmissions;

function mapRow(row: BaserowRow): DbFccSubmission {
  return {
    id: String(row.id),
    name: String(row[F.name] || ''),
    client_id: pickLinkRowId(row[F.clientId]),
    submitted_at: pickTextValue(row[F.submittedAt]),
    form_type: pickTextValue(row[F.formType]) || 'PP',
    profil_risque: pickTextValue(row[F.profilRisque]),
    profil_connaissance: pickTextValue(row[F.profilConnaissance]),
    score_connaissance: typeof row[F.scoreConnaissance] === 'number' ? (row[F.scoreConnaissance] as number) : null,
    score_risque: typeof row[F.scoreRisque] === 'number' ? (row[F.scoreRisque] as number) : null,
    statut: pickFieldValue(row[F.statut]) || 'Soumis',
    raw_data: pickTextValue(row[F.rawData]),
    docusign_envelope_id: pickTextValue(row[F.docusignEnvelopeId]),
    airtable_record_id: pickTextValue(row[F.airtableRecordId]),
  };
}

export function toPublicFccSubmission(sub: DbFccSubmission): PublicFccSubmission {
  return {
    id: sub.id,
    clientId: sub.client_id,
    submittedAt: sub.submitted_at,
    formType: sub.form_type,
    profilRisque: sub.profil_risque,
    profilConnaissance: sub.profil_connaissance,
    scoreConnaissance: sub.score_connaissance,
    scoreRisque: sub.score_risque,
    statut: sub.statut,
    docusignEnvelopeId: sub.docusign_envelope_id,
  };
}

export async function listSubmissionsByClient(tenantId: string, clientId: string): Promise<PublicFccSubmission[]> {
  const ctx = await resolveTenantDbContext(tenantId);
  const tableId = await resolveTenantTableId(tenantId, 'fcc_submissions');
  const rows = await listAllRows(tableId, {
    filters: { filter_type: 'AND', filters: [{ type: 'link_row_has', field: F.clientId, value: clientId }] },
  }, ctx);
  return rows.map(mapRow).map(toPublicFccSubmission);
}

export async function listAllSubmissions(tenantId: string): Promise<PublicFccSubmission[]> {
  const ctx = await resolveTenantDbContext(tenantId);
  const tableId = await resolveTenantTableId(tenantId, 'fcc_submissions');
  const rows = await listAllRows(tableId, {}, ctx);
  return rows.map(mapRow).map(toPublicFccSubmission);
}

export async function createSubmission(
  tenantId: string,
  input: {
    clientId?: string | null;
    formType: string;
    profilRisque?: string | null;
    profilConnaissance?: string | null;
    scoreConnaissance?: number | null;
    scoreRisque?: number | null;
    rawData?: string | null;
  },
): Promise<PublicFccSubmission> {
  const ctx = await resolveTenantDbContext(tenantId);
  const tableId = await resolveTenantTableId(tenantId, 'fcc_submissions');
  const now = new Date().toISOString();
  const payload: Record<string, unknown> = {
    [F.name]: `FCC ${input.formType} — ${now.split('T')[0]}`,
    [F.submittedAt]: now,
    [F.formType]: input.formType,
    [F.profilRisque]: input.profilRisque ?? '',
    [F.profilConnaissance]: input.profilConnaissance ?? '',
    [F.scoreConnaissance]: input.scoreConnaissance ?? null,
    [F.scoreRisque]: input.scoreRisque ?? null,
    [F.statut]: 'Soumis',
    [F.rawData]: input.rawData ?? null,
  };
  if (input.clientId) {
    payload[F.clientId] = [Number(input.clientId)];
  }
  const row = await createRow(tableId, payload, ctx);
  return toPublicFccSubmission(mapRow(row));
}

export async function updateSubmissionStatus(
  tenantId: string,
  submissionId: string,
  statut: string,
  docusignEnvelopeId?: string,
): Promise<PublicFccSubmission> {
  const ctx = await resolveTenantDbContext(tenantId);
  const tableId = await resolveTenantTableId(tenantId, 'fcc_submissions');
  const payload: Record<string, unknown> = { [F.statut]: statut };
  if (docusignEnvelopeId) payload[F.docusignEnvelopeId] = docusignEnvelopeId;
  const row = await updateRow(tableId, submissionId, payload, ctx);
  return toPublicFccSubmission(mapRow(row));
}

export async function upsertSubmissionFromAirtable(
  tenantId: string,
  data: {
    clientId?: string | null;
    submittedAt?: string | null;
    formType?: string | null;
    profilRisque?: string | null;
    profilConnaissance?: string | null;
    scoreConnaissance?: number | null;
    scoreRisque?: number | null;
    statut?: string | null;
    airtableRecordId: string;
  },
): Promise<DbFccSubmission> {
  const ctx = await resolveTenantDbContext(tenantId);
  const tableId = await resolveTenantTableId(tenantId, 'fcc_submissions');
  const rows = await listAllRows(tableId, {}, ctx);
  const existing = rows.find((r) => pickTextValue(r[F.airtableRecordId]) === data.airtableRecordId);
  const submittedAt = data.submittedAt || new Date().toISOString();
  const formType = data.formType || 'PP';
  const payload: Record<string, unknown> = {
    [F.name]: `FCC ${formType} — ${submittedAt.split('T')[0]}`,
    [F.clientId]: data.clientId ? [Number(data.clientId)] : [],
    [F.submittedAt]: submittedAt,
    [F.formType]: formType,
    [F.profilRisque]: data.profilRisque ?? '',
    [F.profilConnaissance]: data.profilConnaissance ?? '',
    [F.scoreConnaissance]: data.scoreConnaissance ?? null,
    [F.scoreRisque]: data.scoreRisque ?? null,
    [F.statut]: data.statut || 'Soumis',
    [F.airtableRecordId]: data.airtableRecordId,
  };
  if (existing) {
    return mapRow(await updateRow(tableId, existing.id, payload, ctx));
  }
  return mapRow(await createRow(tableId, payload, ctx));
}
