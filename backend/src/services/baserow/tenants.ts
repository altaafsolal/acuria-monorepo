import { BASEROW_FIELDS } from '../../../baserow/schema.js';
import { pickFieldValue } from '../../utils/baserow.js';
import { createRow, listAllRows, updateRow } from './api.js';
import { getTenantsTableId } from './registry.js';
import type {
  BaserowRow,
  CreateTenantFields,
  PublicTenant,
  TenantRecord,
} from '../../types/domain.js';

const F = BASEROW_FIELDS.tenants;

function mapTenantRow(row: BaserowRow): TenantRecord {
  return {
    id: String(row.id),
    name: String(row[F.name] || ''),
    slug: String(row[F.slug] || ''),
    status: pickFieldValue(row[F.status]) || 'active',
    workspace_id: String(row[F.workspaceId] || '').trim() || null,
    database_id: String(row[F.databaseId] || '').trim() || null,
    database_token: String(row[F.databaseToken] || '').trim() || null,
    branding_name: String(row[F.brandingName] || '').trim() || null,
    branding_orias: String(row[F.brandingOrias] || '').trim() || null,
    branding_accent: String(row[F.brandingAccent] || '').trim() || null,
    created_on: pickFieldValue(row[F.createdOn]),
    updated_on: pickFieldValue(row[F.updatedOn]),
  };
}

export function toPublicTenant(
  tenant: TenantRecord,
  { userCount = 0, clientCount = 0 }: { userCount?: number; clientCount?: number } = {},
): PublicTenant {
  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    status: tenant.status,
    createdAt: tenant.created_on,
    updatedAt: tenant.updated_on,
    userCount,
    clientCount,
    brandingName: tenant.branding_name,
    brandingOrias: tenant.branding_orias,
    brandingAccent: tenant.branding_accent,
    workspaceId: tenant.workspace_id,
    databaseId: tenant.database_id,
    databaseToken: tenant.database_token,
  };
}

export async function findTenantById(id: string): Promise<TenantRecord | null> {
  const rows = await listAllRows(await getTenantsTableId());
  const row = rows.find((item) => String(item.id) === String(id));
  return row ? mapTenantRow(row) : null;
}

export async function findTenantBySlug(slug: string): Promise<TenantRecord | null> {
  const rows = await listAllRows(await getTenantsTableId());
  const row = rows.find((item) => item[F.slug] === slug);
  return row ? mapTenantRow(row) : null;
}

export async function listTenants(): Promise<TenantRecord[]> {
  return (await listAllRows(await getTenantsTableId())).map(mapTenantRow);
}

export async function createTenant(fields: CreateTenantFields): Promise<TenantRecord> {
  if (!fields.workspace_id || !fields.database_id || !fields.database_token) {
    throw new Error('workspace_id, database_id, and database_token are required when creating a tenant');
  }

  const row = await createRow(await getTenantsTableId(), {
    [F.name]: fields.name,
    [F.slug]: fields.slug,
    [F.status]: fields.status || 'active',
    [F.workspaceId]: String(fields.workspace_id),
    [F.databaseId]: String(fields.database_id),
    [F.databaseToken]: fields.database_token,
  });

  return mapTenantRow(row);
}

export async function patchTenantBranding(
  tenantId: string,
  branding: { brandingName?: string; brandingOrias?: string; brandingAccent?: string },
): Promise<TenantRecord | null> {
  const existing = await findTenantById(tenantId);
  if (!existing) return null;

  const payload: Record<string, unknown> = {};
  if (branding.brandingName !== undefined) payload[F.brandingName] = branding.brandingName;
  if (branding.brandingOrias !== undefined) payload[F.brandingOrias] = branding.brandingOrias;
  if (branding.brandingAccent !== undefined) payload[F.brandingAccent] = branding.brandingAccent;

  const row = await updateRow(await getTenantsTableId(), tenantId, payload);
  return mapTenantRow(row);
}

export async function patchTenantWorkspace(
  tenantId: string,
  workspace: { workspaceId: string; databaseId: string; databaseToken: string },
): Promise<TenantRecord | null> {
  const existing = await findTenantById(tenantId);
  if (!existing) return null;

  const row = await updateRow(await getTenantsTableId(), tenantId, {
    [F.workspaceId]: workspace.workspaceId,
    [F.databaseId]: workspace.databaseId,
    [F.databaseToken]: workspace.databaseToken,
  });
  return mapTenantRow(row);
}

export async function patchTenantStatus(
  tenantId: string,
  status: string,
): Promise<TenantRecord | null> {
  const existing = await findTenantById(tenantId);
  if (!existing) return null;

  const row = await updateRow(await getTenantsTableId(), tenantId, {
    [F.status]: status,
  });
  return mapTenantRow(row);
}
