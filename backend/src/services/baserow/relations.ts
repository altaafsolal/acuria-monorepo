import { BASEROW_FIELDS } from '../../../baserow/schema.js';
import { pickLinkRowId, pickNumberValue, pickTextValue } from '../../utils/baserow.js';
import { createRow, deleteRow, listAllRows, updateRow } from './api.js';
import * as clientsRepo from './clients.js';
import { resolveClientDisplayName } from './client-mapper.js';
import { resolveTenantDbContext } from './tenant-context.js';
import { resolveTenantTableId } from './tenant-tables.js';
import type { BaserowRow, DbRelation, PublicRelation } from '../../types/domain.js';

const F = BASEROW_FIELDS.relations;

function mapRow(row: BaserowRow): DbRelation {
  return {
    id: String(row.id),
    name: String(row[F.name] || ''),
    client_a_id: pickLinkRowId(row[F.clientAId]),
    client_b_id: pickLinkRowId(row[F.clientBId]),
    client_a_name: null,
    client_b_name: null,
    type_relation: pickTextValue(row[F.typeRelation]),
    pct_detention: pickNumberValue(row[F.pctDetention]),
    note: pickTextValue(row[F.note]),
    airtable_record_id: pickTextValue(row[F.airtableRecordId]),
  };
}

async function enrichRelation(tenantId: string, rel: DbRelation): Promise<PublicRelation> {
  const [clientA, clientB] = await Promise.all([
    rel.client_a_id ? clientsRepo.getClientById(tenantId, rel.client_a_id) : Promise.resolve(null),
    rel.client_b_id ? clientsRepo.getClientById(tenantId, rel.client_b_id) : Promise.resolve(null),
  ]);
  return {
    id: rel.id,
    clientAId: rel.client_a_id,
    clientBId: rel.client_b_id,
    clientAName: clientA ? resolveClientDisplayName(clientA) : null,
    clientBName: clientB ? resolveClientDisplayName(clientB) : null,
    typeRelation: rel.type_relation,
    pctDetention: rel.pct_detention,
    note: rel.note,
  };
}

export async function listRelationsByClient(tenantId: string, clientId: string): Promise<PublicRelation[]> {
  const ctx = await resolveTenantDbContext(tenantId);
  const tableId = await resolveTenantTableId(tenantId, 'relations');
  const rows = (await listAllRows(tableId, {
    filters: {
      filter_type: 'OR',
      filters: [
        { type: 'link_row_has', field: F.clientAId, value: clientId },
        { type: 'link_row_has', field: F.clientBId, value: clientId },
      ],
    },
  }, ctx)).map(mapRow);
  return Promise.all(rows.map((r) => enrichRelation(tenantId, r)));
}

export async function createRelation(
  tenantId: string,
  input: { clientAId: string; clientBId: string; typeRelation: string; pctDetention?: number; note?: string },
): Promise<PublicRelation> {
  const ctx = await resolveTenantDbContext(tenantId);
  const tableId = await resolveTenantTableId(tenantId, 'relations');
  const row = await createRow(tableId, {
    [F.name]: input.typeRelation,
    [F.clientAId]: [Number(input.clientAId)],
    [F.clientBId]: [Number(input.clientBId)],
    [F.typeRelation]: input.typeRelation,
    [F.pctDetention]: input.pctDetention ?? null,
    [F.note]: input.note || '',
  }, ctx);
  return enrichRelation(tenantId, mapRow(row));
}

export async function deleteRelation(tenantId: string, relationId: string): Promise<boolean> {
  const ctx = await resolveTenantDbContext(tenantId);
  const tableId = await resolveTenantTableId(tenantId, 'relations');
  await deleteRow(tableId, relationId, ctx);
  return true;
}

export async function upsertRelationFromAirtable(
  tenantId: string,
  data: {
    clientAId: string;
    clientBId: string;
    typeRelation: string;
    pctDetention?: number | null;
    note?: string | null;
    airtableRecordId: string;
  },
): Promise<DbRelation> {
  const ctx = await resolveTenantDbContext(tenantId);
  const tableId = await resolveTenantTableId(tenantId, 'relations');
  const rows = await listAllRows(tableId, {}, ctx);
  const existing = rows.find((r) => pickTextValue(r[F.airtableRecordId]) === data.airtableRecordId);
  const payload = {
    [F.name]: data.typeRelation,
    [F.clientAId]: [Number(data.clientAId)],
    [F.clientBId]: [Number(data.clientBId)],
    [F.typeRelation]: data.typeRelation,
    [F.pctDetention]: data.pctDetention ?? null,
    [F.note]: data.note || '',
    [F.airtableRecordId]: data.airtableRecordId,
  };
  if (existing) {
    return mapRow(await updateRow(tableId, existing.id, payload, ctx));
  }
  return mapRow(await createRow(tableId, payload, ctx));
}
