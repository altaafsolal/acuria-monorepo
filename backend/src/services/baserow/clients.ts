import { BASEROW_FIELDS } from '../../../baserow/schema.js';
import { pickTextValue } from '../../utils/baserow.js';
import { createRow, getRow, listAllRows, listRowsPage, updateRow } from './api.js';
import { resolveTenantDbContext } from './tenant-context.js';
import {
  clientInputToBaserow,
  excludeArchived,
  mapClientRow,
  resolveClientDisplayName,
  toPublicClient,
} from './client-mapper.js';
import { resolveTenantTableId } from './tenant-tables.js';
import type { BaserowRow, CreateClientInput, DbClient, PublicClient, UpdateClientInput } from '../../types/domain.js';

export { excludeArchived, mapClientRow, resolveClientDisplayName, toPublicClient };

export async function listClientsByTenantId(tenantId: string, includeArchived = true): Promise<DbClient[]> {
  const ctx = await resolveTenantDbContext(tenantId);
  const tableId = await resolveTenantTableId(tenantId, 'clients');
  const rows = (await listAllRows(tableId, {}, ctx)).map(mapClientRow);
  return includeArchived ? rows : excludeArchived(rows);
}

export async function getClientById(tenantId: string, clientId: string): Promise<DbClient | null> {
  try {
    const ctx = await resolveTenantDbContext(tenantId);
    const tableId = await resolveTenantTableId(tenantId, 'clients');
    const row = await getRow(tableId, clientId, ctx);
    return mapClientRow(row);
  } catch {
    return null;
  }
}

export async function createClient(tenantId: string, input: CreateClientInput): Promise<DbClient> {
  const ctx = await resolveTenantDbContext(tenantId);
  const tableId = await resolveTenantTableId(tenantId, 'clients');
  const fields = clientInputToBaserow({
    clientType: 'PP',
    kycStatus: 'pending',
    statutClient: 'Prospect',
    fccStatut: 'Non envoyé',
    derStatut: 'Non envoyé',
    ldmStatut: 'Non envoyé',
    ...input,
    name: input.name || resolveClientDisplayName(input as DbClient),
  });
  const row = await createRow(tableId, fields, ctx);
  return mapClientRow(row);
}

export async function updateClient(
  tenantId: string,
  clientId: string,
  input: UpdateClientInput,
): Promise<DbClient | null> {
  const existing = await getClientById(tenantId, clientId);
  if (!existing) return null;

  const ctx = await resolveTenantDbContext(tenantId);
  const tableId = await resolveTenantTableId(tenantId, 'clients');
  const fields = clientInputToBaserow(input as Record<string, unknown>);
  if (Object.keys(fields).length === 0) return existing;

  const row = await updateRow(tableId, clientId, fields, ctx);
  return mapClientRow(row);
}

export async function countClientsByTenantId(tenantId: string): Promise<number> {
  const ctx = await resolveTenantDbContext(tenantId);
  const tableId = await resolveTenantTableId(tenantId, 'clients');
  const { count } = await listRowsPage(tableId, { size: 1 }, ctx);
  return count;
}

export async function patchClientKycFields(
  tenantId: string,
  clientId: string,
  fields: Partial<Pick<DbClient,
    'fcc_statut' | 'fcc_date' | 'der_statut' | 'der_date' | 'der_envoi_timestamp' | 'ldm_statut' | 'ldm_date'
  >>,
): Promise<DbClient | null> {
  return updateClient(tenantId, clientId, {
    fccStatut: fields.fcc_statut,
    fccDate: fields.fcc_date,
    derStatut: fields.der_statut,
    derDate: fields.der_date,
    derEnvoiTimestamp: fields.der_envoi_timestamp,
    ldmStatut: fields.ldm_statut,
    ldmDate: fields.ldm_date,
  } as UpdateClientInput);
}

export function clientRowByAirtableId(rows: BaserowRow[], airtableId: string): BaserowRow | undefined {
  const F = BASEROW_FIELDS.clients;
  return rows.find((r) => pickTextValue(r[F.airtableRecordId]) === airtableId);
}

export async function upsertClientFromAirtable(
  tenantId: string,
  airtableRecordId: string,
  input: UpdateClientInput & { name: string },
): Promise<DbClient> {
  const ctx = await resolveTenantDbContext(tenantId);
  const tableId = await resolveTenantTableId(tenantId, 'clients');
  const rows = await listAllRows(tableId, {}, ctx);
  const existing = clientRowByAirtableId(rows, airtableRecordId);
  const fields = {
    ...clientInputToBaserow(input),
    [BASEROW_FIELDS.clients.airtableRecordId]: airtableRecordId,
  };

  if (existing) {
    return mapClientRow(await updateRow(tableId, existing.id, fields, ctx));
  }
  const row = await createRow(tableId, fields, ctx);
  return mapClientRow(row);
}
