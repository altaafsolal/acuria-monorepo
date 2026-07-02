import axios, { type AxiosInstance } from 'axios';
import { env } from '../../config/env.js';
import { isBlankRow } from '../../utils/baserow.js';
import type { BaserowRow } from '../../types/domain.js';
import type {
  BaserowApplication,
  BaserowField,
  BaserowListResponse,
  BaserowTable,
  AxiosLikeError,
  FieldDef,
} from '../../../baserow/types/baserow.js';

let cachedJwt: string | null = null;
let jwtExpiresAt = 0;

/** Per-tenant database token (workspace-scoped). Main DB uses env.baserow.databaseToken when omitted. */
export interface BaserowDbContext {
  databaseToken: string;
}

function createDatabaseClient(ctx?: BaserowDbContext): AxiosInstance {
  const token = ctx?.databaseToken ?? env.baserow.databaseToken;
  if (!token) {
    throw new Error('Baserow database token is required');
  }
  return axios.create({
    baseURL: `${env.baserow.apiUrl}/api`,
    headers: {
      Authorization: `Token ${token}`,
      'Content-Type': 'application/json',
    },
    timeout: 20000,
  });
}

async function createAdminClient(): Promise<AxiosInstance> {
  const jwtToken = await getJwtAccessToken();
  return axios.create({
    baseURL: `${env.baserow.apiUrl}/api`,
    headers: {
      Authorization: `JWT ${jwtToken}`,
      'Content-Type': 'application/json',
    },
    timeout: 20000,
  });
}

export async function getJwtAccessToken(): Promise<string> {
  if (cachedJwt && Date.now() < jwtExpiresAt) return cachedJwt;

  if (!env.baserow.email || !env.baserow.password) {
    throw new Error(
      'BASEROW_EMAIL and BASEROW_PASSWORD are required for schema changes (npm run setup)',
    );
  }

  try {
    const { data } = await axios.post<{ access_token?: string; token?: string }>(
      `${env.baserow.apiUrl}/api/user/token-auth/`,
      { username: env.baserow.email, password: env.baserow.password },
      { headers: { 'Content-Type': 'application/json' }, timeout: 20000 },
    );

    const token = data.access_token || data.token;
    if (!token) throw new Error('Baserow login failed — no access token returned');

    cachedJwt = token;
    jwtExpiresAt = Date.now() + 9 * 60 * 1000;
    return token;
  } catch (error) {
    const err = error as AxiosLikeError;
    if (err.response?.status === 401) {
      throw new Error(
        'Baserow login failed (401). Check BASEROW_EMAIL and BASEROW_PASSWORD. '
        + 'If your password contains # or $, wrap it in double quotes in .env',
      );
    }
    throw error;
  }
}

export interface BaserowWorkspace {
  id: number;
  name: string;
}

export async function createWorkspace(name: string): Promise<BaserowWorkspace> {
  const client = await createAdminClient();
  const { data } = await client.post<BaserowWorkspace>('/workspaces/', { name });
  return data;
}

export async function createDatabaseApplication(workspaceId: string, name: string): Promise<BaserowApplication> {
  const client = await createAdminClient();
  const { data } = await client.post<BaserowApplication>(`/applications/workspace/${workspaceId}/`, {
    name,
    type: 'database',
  });
  return data;
}

/** Creates a workspace-scoped database token (full CRUD on all tables in the workspace). */
export async function createWorkspaceDatabaseToken(workspaceId: string, name: string): Promise<string> {
  const client = await createAdminClient();
  const { data } = await client.post<{ key?: string }>('/database/tokens/', {
    name,
    workspace: Number(workspaceId),
  });
  if (!data.key) {
    throw new Error('Baserow did not return a database token key');
  }
  return data.key;
}

export async function listDatabaseTables(databaseId: string): Promise<BaserowTable[]> {
  const client = await createAdminClient();
  const { data } = await client.get<BaserowTable[]>(`/database/tables/database/${databaseId}/`);
  return data;
}

export async function createTable(
  databaseId: string,
  name: string,
  { primaryFieldName = 'Name' }: { primaryFieldName?: string } = {},
): Promise<BaserowTable> {
  const client = await createAdminClient();
  const { data } = await client.post<BaserowTable>(`/database/tables/database/${databaseId}/`, {
    name,
    data: [[primaryFieldName]],
    first_row_header: true,
  });
  return data;
}

export async function createField(tableId: string | number, field: FieldDef): Promise<BaserowField> {
  const client = await createAdminClient();
  const { data } = await client.post<BaserowField>(`/database/fields/table/${tableId}/`, field);
  return data;
}

export async function updateField(
  fieldId: string | number,
  patch: Partial<FieldDef>,
): Promise<BaserowField> {
  const client = await createAdminClient();
  const { data } = await client.patch<BaserowField>(`/database/fields/${fieldId}/`, patch);
  return data;
}

export async function listTableFields(
  tableId: string | number,
  ctx?: BaserowDbContext,
): Promise<BaserowField[]> {
  const { data } = await createDatabaseClient(ctx).get<BaserowField[]>(
    `/database/fields/table/${tableId}/`,
    { params: { user_field_names: true } },
  );
  return data;
}

/** List table fields using JWT — for schema provisioning in tenant workspaces. */
export async function listTableFieldsWithJwt(tableId: string | number): Promise<BaserowField[]> {
  const client = await createAdminClient();
  const { data } = await client.get<BaserowField[]>(`/database/fields/table/${tableId}/`, {
    params: { user_field_names: true },
  });
  return data;
}

/**
 * Syncs a single-select field's options to the desired set while preserving existing
 * option IDs (matched by value). Reusing IDs prevents Baserow from clearing every
 * row's stored value, which happens when select_options are replaced without IDs.
 */
export async function ensureSelectOptions(
  tableId: string | number,
  fieldName: string,
  desired: ReadonlyArray<{ value: string; color: string }>,
): Promise<boolean> {
  const fields = await listTableFieldsWithJwt(tableId);
  const field = fields.find((f) => f.name === fieldName);
  if (!field || field.type !== 'single_select') return false;

  const existing = field.select_options ?? [];
  const merged = desired.map((opt) => {
    const match = existing.find((e) => e.value === opt.value);
    return match
      ? { id: match.id, value: opt.value, color: opt.color }
      : { value: opt.value, color: opt.color };
  });

  await updateField(field.id, { select_options: merged });
  return true;
}

interface ListRowsOptions {
  filters?: Record<string, unknown>;
  size?: number;
  page?: number;
  orderBy?: string;
  search?: string;
}

export async function listRows(
  tableId: string | number,
  { filters, size = 200, page = 1, orderBy, search }: ListRowsOptions = {},
  ctx?: BaserowDbContext,
): Promise<BaserowListResponse<BaserowRow>> {
  const params: Record<string, unknown> = { user_field_names: true, size, page, count: true };
  if (filters) params.filters = JSON.stringify(filters);
  if (orderBy) params.order_by = orderBy;
  if (search) params.search = search;

  const { data } = await createDatabaseClient(ctx).get<BaserowListResponse<BaserowRow>>(
    `/database/rows/table/${tableId}/`,
    { params },
  );
  return data;
}

export async function listRowsPage(
  tableId: string | number,
  options: ListRowsOptions = {},
  ctx?: BaserowDbContext,
): Promise<{ results: BaserowRow[]; count: number }> {
  const data = await listRows(tableId, options, ctx);
  return {
    results: data.results,
    count: data.count ?? data.results.length,
  };
}

export async function listAllRows(
  tableId: string | number,
  options: Omit<ListRowsOptions, 'page'> = {},
  ctx?: BaserowDbContext,
): Promise<BaserowRow[]> {
  const rows: BaserowRow[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const data = await listRows(tableId, { ...options, page }, ctx);
    rows.push(...data.results);
    hasMore = data.next !== null;
    page += 1;
  }

  return rows;
}

export async function getRow(
  tableId: string | number,
  rowId: string | number,
  ctx?: BaserowDbContext,
): Promise<BaserowRow> {
  const { data } = await createDatabaseClient(ctx).get<BaserowRow>(
    `/database/rows/table/${tableId}/${rowId}/`,
    { params: { user_field_names: true } },
  );
  return data;
}

export async function createRow(
  tableId: string | number,
  fields: Record<string, unknown>,
  ctx?: BaserowDbContext,
): Promise<BaserowRow> {
  try {
    const { data } = await createDatabaseClient(ctx).post<BaserowRow>(
      `/database/rows/table/${tableId}/`,
      fields,
      { params: { user_field_names: true } },
    );
    return data;
  } catch (error) {
    throw formatBaserowError(error, 'create row');
  }
}

export async function updateRow(
  tableId: string | number,
  rowId: string | number,
  fields: Record<string, unknown>,
  ctx?: BaserowDbContext,
): Promise<BaserowRow> {
  try {
    const { data } = await createDatabaseClient(ctx).patch<BaserowRow>(
      `/database/rows/table/${tableId}/${rowId}/`,
      fields,
      { params: { user_field_names: true } },
    );
    return data;
  } catch (error) {
    throw formatBaserowError(error, `update row ${rowId}`);
  }
}

function formatBaserowError(error: unknown, action: string): Error {
  const err = error as AxiosLikeError;
  const detail = err.response?.data
    ? JSON.stringify(err.response.data)
    : (error instanceof Error ? error.message : String(error));
  return new Error(`Baserow ${action} failed (${err.response?.status ?? '?'}): ${detail}`);
}

export async function deleteRow(
  tableId: string | number,
  rowId: string | number,
  ctx?: BaserowDbContext,
): Promise<void> {
  await createDatabaseClient(ctx).delete(`/database/rows/table/${tableId}/${rowId}/`);
}

export async function batchDeleteRows(
  tableId: string | number,
  rowIds: (string | number)[],
  ctx?: BaserowDbContext,
): Promise<void> {
  if (rowIds.length === 0) return;
  await createDatabaseClient(ctx).post(
    `/database/rows/table/${tableId}/batch-delete/`,
    { items: rowIds.map(Number) },
  );
}

export interface UploadedUserFile {
  name: string;
  original_name?: string;
  size?: number;
  mime_type?: string;
  url?: string;
}

/** Upload a file to Baserow user storage (JWT). Returns the server-assigned name for file fields. */
export async function uploadUserFile(
  buffer: Buffer,
  filename: string,
  mimeType?: string,
): Promise<UploadedUserFile> {
  const { default: FormData } = await import('form-data');
  const client = await createAdminClient();
  const form = new FormData();
  form.append('file', buffer, {
    filename,
    contentType: mimeType || 'application/octet-stream',
  });

  const { data } = await client.post<UploadedUserFile>(
    '/user-files/upload-file/',
    form,
    { headers: form.getHeaders() },
  );

  if (!data?.name) {
    throw new Error('Baserow file upload did not return a file name');
  }

  return data;
}

export async function removeBlankRows(
  tableId: string | number,
  ctx?: BaserowDbContext,
): Promise<number> {
  const rows = await listAllRows(tableId, {}, ctx);
  const blankIds = rows.filter(isBlankRow).map((row) => row.id);
  await batchDeleteRows(tableId, blankIds, ctx);
  return blankIds.length;
}

export interface ConnectionStatus {
  configured: boolean;
  connected: boolean;
  message: string;
  mainDatabaseId?: string;
  usersTableId?: string;
  tenantsTableId?: string;
}

export async function testConnection(): Promise<ConnectionStatus> {
  if (!env.baserow.databaseToken || !env.baserow.mainDatabaseId) {
    return {
      configured: false,
      connected: false,
      message: 'Missing BASEROW_DATABASE_TOKEN or BASEROW_MAIN_DATABASE_ID',
    };
  }

  try {
    const { resolveMainTableIds } = await import('./registry.js');
    const { usersTableId, tenantsTableId } = await resolveMainTableIds();
    await listRows(usersTableId, { size: 1, page: 1 });
    return {
      configured: true,
      connected: true,
      message: `Connected to Baserow database ${env.baserow.mainDatabaseId}`,
      mainDatabaseId: env.baserow.mainDatabaseId,
      usersTableId,
      tenantsTableId,
    };
  } catch (error) {
    const err = error as AxiosLikeError;
    const message = err.response?.data?.detail
      || err.response?.data?.error
      || err.response?.data?.description
      || err.message
      || 'Connection failed';
    return { configured: true, connected: false, message, mainDatabaseId: env.baserow.mainDatabaseId };
  }
}
