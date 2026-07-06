import { BASEROW_FIELDS } from '../../../baserow/schema.js';
import { pickFieldValue, pickTextValue } from '../../utils/baserow.js';
import { createRow, listAllRows, updateRow } from './api.js';
import { resolveTenantDbContext } from './tenant-context.js';
import { resolveTenantTableId } from './tenant-tables.js';
import type { BaserowRow, DbGestionnaire, PublicGestionnaire } from '../../types/domain.js';

const F = BASEROW_FIELDS.gestionnaires;

export interface UpsertGestionnaireInput {
  name: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  peutSignerDocusign?: boolean;
  status?: string;
  initiales?: string | null;
  couleur?: string | null;
  userId?: string | null;
  airtableRecordId?: string;
}

function mapRow(row: BaserowRow): DbGestionnaire {
  return {
    id: String(row.id),
    name: String(row[F.name] || ''),
    first_name: pickTextValue(row[F.firstName]),
    last_name: pickTextValue(row[F.lastName]),
    email: pickTextValue(row[F.email]) ?? '',
    phone: pickTextValue(row[F.phone]),
    role: pickTextValue(row[F.role]),
    peut_signer_docusign: Boolean(row[F.peutSignerDocusign]),
    status: pickFieldValue(row[F.status]) || 'Actif',
    initiales: pickTextValue(row[F.initiales]),
    couleur: pickTextValue(row[F.couleur]),
    user_id: pickTextValue(row[F.userId]),
    airtable_record_id: pickTextValue(row[F.airtableRecordId]),
  };
}

function buildPayload(data: UpsertGestionnaireInput): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    [F.name]: data.name,
    [F.firstName]: data.firstName || '',
    [F.lastName]: data.lastName || '',
    [F.phone]: data.phone || '',
    [F.role]: data.role || '',
    [F.peutSignerDocusign]: data.peutSignerDocusign ?? false,
    [F.status]: data.status || 'Actif',
    [F.initiales]: data.initiales || '',
    [F.couleur]: data.couleur || '',
    [F.userId]: data.userId || '',
    [F.airtableRecordId]: data.airtableRecordId || '',
  };
  if (data.email) {
    payload[F.email] = data.email;
  } else {
    payload[F.email] = null;
  }
  return payload;
}

export function toPublicGestionnaire(g: DbGestionnaire): PublicGestionnaire {
  return {
    id: g.id,
    name: g.name,
    firstName: g.first_name,
    lastName: g.last_name,
    email: g.email,
    phone: g.phone,
    role: g.role,
    peutSignerDocusign: g.peut_signer_docusign,
    status: g.status,
    initiales: g.initiales,
    couleur: g.couleur,
    userId: g.user_id,
  };
}

export async function listGestionnaires(tenantId: string): Promise<PublicGestionnaire[]> {
  const ctx = await resolveTenantDbContext(tenantId);
  const tableId = await resolveTenantTableId(tenantId, 'gestionnaires');
  return (await listAllRows(tableId, {}, ctx))
    .map(mapRow)
    .filter((g) => g.status === 'Actif')
    .map(toPublicGestionnaire);
}

export async function listAllGestionnaires(tenantId: string): Promise<DbGestionnaire[]> {
  const ctx = await resolveTenantDbContext(tenantId);
  const tableId = await resolveTenantTableId(tenantId, 'gestionnaires');
  return (await listAllRows(tableId, {}, ctx)).map(mapRow);
}

export async function findGestionnaireByUserId(
  tenantId: string,
  userId: string,
): Promise<DbGestionnaire | null> {
  const rows = await listAllGestionnaires(tenantId);
  return rows.find((g) => g.user_id === String(userId)) ?? null;
}

function findExistingGestionnaireRow(
  rows: BaserowRow[],
  data: UpsertGestionnaireInput,
): BaserowRow | undefined {
  if (data.userId) {
    const byUser = rows.find((r) => pickTextValue(r[F.userId]) === String(data.userId));
    if (byUser) return byUser;
  }
  if (data.airtableRecordId) {
    const byAirtable = rows.find((r) => pickTextValue(r[F.airtableRecordId]) === data.airtableRecordId);
    if (byAirtable) return byAirtable;
  }
  if (data.email) {
    const normalized = data.email.trim().toLowerCase();
    return rows.find((r) => String(r[F.email] || '').trim().toLowerCase() === normalized);
  }
  return undefined;
}

export async function upsertGestionnaire(
  tenantId: string,
  data: UpsertGestionnaireInput,
): Promise<DbGestionnaire> {
  const ctx = await resolveTenantDbContext(tenantId);
  const tableId = await resolveTenantTableId(tenantId, 'gestionnaires');
  const rows = await listAllRows(tableId, {}, ctx);
  const existing = findExistingGestionnaireRow(rows, data);

  const payload = buildPayload(data);

  if (existing) {
    const row = await updateRow(tableId, existing.id, payload, ctx);
    return mapRow(row);
  }
  const row = await createRow(tableId, payload, ctx);
  return mapRow(row);
}

export async function clearGestionnaireUserLink(
  tenantId: string,
  userId: string,
): Promise<void> {
  const gestionnaire = await findGestionnaireByUserId(tenantId, userId);
  if (!gestionnaire) return;

  const ctx = await resolveTenantDbContext(tenantId);
  const tableId = await resolveTenantTableId(tenantId, 'gestionnaires');
  await updateRow(tableId, gestionnaire.id, { [F.userId]: '' }, ctx);
}

export async function listGestionnaireAirtableNameMap(tenantId: string): Promise<Map<string, string>> {
  const ctx = await resolveTenantDbContext(tenantId);
  const tableId = await resolveTenantTableId(tenantId, 'gestionnaires');
  const map = new Map<string, string>();
  for (const row of await listAllRows(tableId, {}, ctx)) {
    const g = mapRow(row);
    if (g.airtable_record_id) map.set(g.airtable_record_id, g.name);
  }
  return map;
}
