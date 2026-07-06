import { BASEROW_FIELDS } from '../../../baserow/schema.js';
import { normalizeDateForBaserow, pickFieldValue, pickLinkRowId, pickTextValue } from '../../utils/baserow.js';
import { createRow, deleteRow, getRow, listAllRows, updateRow } from './api.js';
import { resolveTenantDbContext } from './tenant-context.js';
import { resolveTenantTableId } from './tenant-tables.js';
import type { BaserowRow, DbTask, PublicTask } from '../../types/domain.js';

const F = BASEROW_FIELDS.tasks;

function mapRow(row: BaserowRow): DbTask {
  return {
    id: String(row.id),
    name: String(row[F.name] || ''),
    title: String(row[F.title] || ''),
    description: pickTextValue(row[F.description]),
    status: pickFieldValue(row[F.status]) || 'À faire',
    priorite: pickFieldValue(row[F.priorite]),
    assigne_a: pickTextValue(row[F.assigneA]),
    cree_par: pickTextValue(row[F.creePar]),
    due_date: pickTextValue(row[F.dueDate]),
    client_id: pickLinkRowId(row[F.clientId]),
    airtable_record_id: pickTextValue(row[F.airtableRecordId]),
  };
}

export function toPublicTask(task: DbTask): PublicTask {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priorite: task.priorite,
    assigneA: task.assigne_a,
    creePar: task.cree_par,
    dueDate: task.due_date,
    clientId: task.client_id,
  };
}

async function listDbTasksByClient(tenantId: string, clientId: string): Promise<DbTask[]> {
  const ctx = await resolveTenantDbContext(tenantId);
  const tableId = await resolveTenantTableId(tenantId, 'tasks');
  return (await listAllRows(tableId, {
    filters: { filter_type: 'AND', filters: [{ type: 'link_row_has', field: F.clientId, value: clientId }] },
  }, ctx)).map(mapRow);
}

export async function listTasksByClient(tenantId: string, clientId: string): Promise<PublicTask[]> {
  return (await listDbTasksByClient(tenantId, clientId)).map(toPublicTask);
}

export async function listDbTasksByClientId(tenantId: string, clientId: string): Promise<DbTask[]> {
  return listDbTasksByClient(tenantId, clientId);
}

export async function listBothTasksByClient(
  tenantId: string,
  clientId: string,
): Promise<{ tasks: PublicTask[]; dbTasks: DbTask[] }> {
  const dbTasks = await listDbTasksByClient(tenantId, clientId);
  return { tasks: dbTasks.map(toPublicTask), dbTasks };
}

export async function getTaskById(tenantId: string, taskId: string): Promise<DbTask | null> {
  try {
    const ctx = await resolveTenantDbContext(tenantId);
    const tableId = await resolveTenantTableId(tenantId, 'tasks');
    const row = await getRow(tableId, taskId, ctx);
    return mapRow(row);
  } catch {
    return null;
  }
}

export async function createTask(
  tenantId: string,
  input: {
    clientId: string;
    title: string;
    description?: string;
    status?: string;
    priorite?: string;
    assigneA?: string;
    creePar?: string;
    dueDate?: string;
  },
): Promise<PublicTask> {
  const ctx = await resolveTenantDbContext(tenantId);
  const tableId = await resolveTenantTableId(tenantId, 'tasks');
  const row = await createRow(tableId, {
    [F.name]: input.title,
    [F.title]: input.title,
    [F.description]: input.description || '',
    [F.status]: input.status || 'À faire',
    [F.priorite]: input.priorite || 'Normale',
    [F.assigneA]: input.assigneA || '',
    [F.creePar]: input.creePar || '',
    [F.dueDate]: normalizeDateForBaserow(input.dueDate),
    [F.clientId]: [Number(input.clientId)],
  }, ctx);
  return toPublicTask(mapRow(row));
}

export async function updateTask(
  tenantId: string,
  taskId: string,
  input: Partial<{ title: string; description: string; status: string; priorite: string; assigneA: string; dueDate: string }>,
): Promise<PublicTask | null> {
  const ctx = await resolveTenantDbContext(tenantId);
  const tableId = await resolveTenantTableId(tenantId, 'tasks');
  const payload: Record<string, unknown> = {};
  if (input.title !== undefined) {
    payload[F.name] = input.title;
    payload[F.title] = input.title;
  }
  if (input.description !== undefined) payload[F.description] = input.description;
  if (input.status !== undefined) payload[F.status] = input.status;
  if (input.priorite !== undefined) payload[F.priorite] = input.priorite;
  if (input.assigneA !== undefined) payload[F.assigneA] = input.assigneA;
  if (input.dueDate !== undefined) {
    const d = normalizeDateForBaserow(input.dueDate);
    if (d) payload[F.dueDate] = d;
  }
  const row = await updateRow(tableId, taskId, payload, ctx);
  return toPublicTask(mapRow(row));
}

export async function deleteTask(tenantId: string, taskId: string): Promise<boolean> {
  const ctx = await resolveTenantDbContext(tenantId);
  const tableId = await resolveTenantTableId(tenantId, 'tasks');
  await deleteRow(tableId, taskId, ctx);
  return true;
}

export async function upsertTaskFromAirtable(
  tenantId: string,
  data: {
    clientId: string;
    title: string;
    description?: string;
    status?: string;
    priorite?: string;
    assigneA?: string;
    dueDate?: string;
    airtableRecordId: string;
  },
): Promise<DbTask> {
  const ctx = await resolveTenantDbContext(tenantId);
  const tableId = await resolveTenantTableId(tenantId, 'tasks');
  const rows = await listAllRows(tableId, {}, ctx);
  const existing = rows.find((r) => pickTextValue(r[F.airtableRecordId]) === data.airtableRecordId);
  const payload = {
    [F.name]: data.title,
    [F.title]: data.title,
    [F.description]: data.description || '',
    [F.status]: data.status || 'À faire',
    [F.priorite]: data.priorite || 'Normale',
    [F.assigneA]: data.assigneA || '',
    [F.creePar]: '',
    [F.dueDate]: normalizeDateForBaserow(data.dueDate),
    [F.clientId]: [Number(data.clientId)],
    [F.airtableRecordId]: data.airtableRecordId,
  };
  if (existing) {
    return mapRow(await updateRow(tableId, existing.id, payload, ctx));
  }
  return mapRow(await createRow(tableId, payload, ctx));
}
