import { BASEROW_FIELDS } from '../../../baserow/schema.js';
import { pickNumberValue, pickTextValue } from '../../utils/baserow.js';
import { createRow, listRowsPage, listAllRows, batchDeleteRows } from './api.js';
import { getAuditLogsTableId } from './registry.js';
import type {
  AuditListParams,
  AuditListResult,
  BaserowRow,
  CreateAuditLogInput,
  DbAuditLog,
  PublicAuditLog,
} from '../../types/domain.js';

const F = BASEROW_FIELDS.auditLogs;

function mapAuditRow(row: BaserowRow): DbAuditLog {
  return {
    id: String(row.id),
    created_at: pickTextValue(row[F.createdAt]) || '',
    user_id: pickTextValue(row[F.userId]) || null,
    user_email: pickTextValue(row[F.userEmail]) || null,
    user_name: pickTextValue(row[F.userName]) || null,
    user_role: pickTextValue(row[F.userRole]) || null,
    tenant_id: pickTextValue(row[F.tenantId]) || null,
    action: pickTextValue(row[F.action]) || '',
    method: pickTextValue(row[F.method]) || '',
    path: pickTextValue(row[F.path]) || '',
    status_code: pickNumberValue(row[F.statusCode]) ?? 0,
    entity_type: pickTextValue(row[F.entityType]) || null,
    entity_id: pickTextValue(row[F.entityId]) || null,
    details: pickTextValue(row[F.details]) || null,
  };
}

export function toPublicAuditLog(log: DbAuditLog): PublicAuditLog {
  return {
    id: log.id,
    createdAt: log.created_at,
    userId: log.user_id,
    userEmail: log.user_email,
    userName: log.user_name,
    userRole: log.user_role,
    tenantId: log.tenant_id,
    action: log.action,
    method: log.method,
    path: log.path,
    statusCode: log.status_code,
    entityType: log.entity_type,
    entityId: log.entity_id,
    details: log.details,
  };
}

function buildListFilters(tenantId?: string, userId?: string): Record<string, unknown> | undefined {
  const filters: Record<string, unknown>[] = [];

  if (tenantId) {
    filters.push({ type: 'equal', field: F.tenantId, value: tenantId });
  }
  if (userId) {
    filters.push({ type: 'equal', field: F.userId, value: userId });
  }

  if (filters.length === 0) return undefined;
  return { filter_type: 'AND', filters };
}

export async function createAuditLog(input: CreateAuditLogInput): Promise<DbAuditLog> {
  const tableId = await getAuditLogsTableId();
  const createdAt = input.created_at || new Date().toISOString();
  const row = await createRow(tableId, {
    [F.name]: input.action,
    [F.createdAt]: createdAt,
    [F.userId]: input.user_id || '',
    [F.userEmail]: input.user_email || '',
    [F.userName]: input.user_name || '',
    [F.userRole]: input.user_role || '',
    [F.tenantId]: input.tenant_id || '',
    [F.action]: input.action,
    [F.method]: input.method,
    [F.path]: input.path,
    [F.statusCode]: input.status_code,
    [F.entityType]: input.entity_type || '',
    [F.entityId]: input.entity_id || '',
    [F.details]: input.details || '',
  });
  return mapAuditRow(row);
}

const BATCH_SIZE = 200;

/** Delete a specific set of audit log rows by id. Returns the number deleted. */
export async function deleteAuditLogs(ids: (string | number)[]): Promise<number> {
  const rowIds = ids.map(Number).filter((id) => Number.isFinite(id));
  if (rowIds.length === 0) return 0;
  const tableId = await getAuditLogsTableId();
  for (let i = 0; i < rowIds.length; i += BATCH_SIZE) {
    await batchDeleteRows(tableId, rowIds.slice(i, i + BATCH_SIZE));
  }
  return rowIds.length;
}

/** Delete every audit log row. Returns the number deleted. */
export async function purgeAuditLogs(): Promise<number> {
  const tableId = await getAuditLogsTableId();
  const rows = await listAllRows(tableId, { size: BATCH_SIZE });
  const rowIds = rows.map((row) => Number(row.id));
  for (let i = 0; i < rowIds.length; i += BATCH_SIZE) {
    await batchDeleteRows(tableId, rowIds.slice(i, i + BATCH_SIZE));
  }
  return rowIds.length;
}

export async function listAuditLogs(params: AuditListParams = {}): Promise<AuditListResult> {
  const page = Math.max(1, params.page ?? 1);
  const size = Math.min(200, Math.max(1, params.size ?? 50));
  const tableId = await getAuditLogsTableId();
  const filters = buildListFilters(params.tenantId, params.userId);
  const search = params.search?.trim() || undefined;

  const { results, count } = await listRowsPage(tableId, {
    page,
    size,
    orderBy: `-${F.createdAt}`,
    filters,
    search,
  });

  return {
    logs: results.map(mapAuditRow).map(toPublicAuditLog),
    total: count,
    page,
    size,
  };
}
