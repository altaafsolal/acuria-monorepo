import { BASEROW_FIELDS } from '../../../baserow/schema.js';
import { pickFieldValue, pickFileValues } from '../../utils/baserow.js';
import {
  fetchBaserowFileDataUrl,
  invalidateBaserowFileDataUrlCache,
} from '../../utils/baserow-file.js';
import { createRow, getRow, listAllRows, updateRow, uploadUserFile } from './api.js';
import { getTenantsTableId } from './registry.js';
import type {
  BaserowRow,
  CreateTenantFields,
  PublicTenant,
  SharepointStatus,
  TenantRecord,
} from '../../types/domain.js';

const F = BASEROW_FIELDS.tenants;

export type TenantBrandingLogo = TenantRecord['branding_logo'][number];

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
    branding_logo: pickFileValues(row[F.brandingLogo]),
    email: String(row[F.email] || '').trim() || null,
    backoffice_email: String(row[F.backofficeEmail] || '').trim() || null,
    created_on: pickFieldValue(row[F.createdOn]),
    updated_on: pickFieldValue(row[F.updatedOn]),
    sharepoint_connected: row[F.sharepointConnected] === true,
    sharepoint_access_token: String(row[F.sharepointAccessToken] || '').trim() || null,
    sharepoint_refresh_token: String(row[F.sharepointRefreshToken] || '').trim() || null,
    sharepoint_token_expires_at: String(row[F.sharepointTokenExpiresAt] || '').trim() || null,
    sharepoint_ms_tenant_id: String(row[F.sharepointMsTenantId] || '').trim() || null,
    sharepoint_site_id: String(row[F.sharepointSiteId] || '').trim() || null,
    sharepoint_drive_id: String(row[F.sharepointDriveId] || '').trim() || null,
    sharepoint_site_display_name: String(row[F.sharepointSiteDisplayName] || '').trim() || null,
    sharepoint_connected_at: String(row[F.sharepointConnectedAt] || '').trim() || null,
    sharepoint_connected_by: String(row[F.sharepointConnectedBy] || '').trim() || null,
  };
}

/** Client-safe view of the SharePoint link. Never widen this to include tokens. */
export function toSharepointStatus(tenant: TenantRecord): SharepointStatus {
  return {
    connected: tenant.sharepoint_connected,
    siteId: tenant.sharepoint_site_id,
    driveId: tenant.sharepoint_drive_id,
    siteDisplayName: tenant.sharepoint_site_display_name,
    connectedAt: tenant.sharepoint_connected_at,
    connectedBy: tenant.sharepoint_connected_by,
  };
}

export function getTenantBrandingLogo(tenant: TenantRecord): TenantBrandingLogo | null {
  return tenant.branding_logo[0] ?? null;
}

function tenantLogoCacheKey(tenantId: string, logoName: string): string {
  return `tenant-logo:${tenantId}:${logoName}`;
}

export async function resolveTenantBrandingLogoDataUrl(
  tenant: TenantRecord,
): Promise<string | null> {
  const logo = getTenantBrandingLogo(tenant);
  if (!logo) return null;

  return fetchBaserowFileDataUrl(logo.url, {
    cacheKey: tenantLogoCacheKey(tenant.id, logo.name),
  });
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
    hasBrandingLogo: tenant.branding_logo.length > 0,
    workspaceId: tenant.workspace_id,
    databaseId: tenant.database_id,
    databaseToken: tenant.database_token,
    email: tenant.email,
    backofficeEmail: tenant.backoffice_email,
    // Status only — sharepoint_access_token / sharepoint_refresh_token must
    // never be serialized to a client. toSharepointStatus() enforces that.
    sharepoint: toSharepointStatus(tenant),
  };
}

export async function findTenantById(id: string): Promise<TenantRecord | null> {
  try {
    const row = await getRow(await getTenantsTableId(), id);
    return mapTenantRow(row);
  } catch {
    return null;
  }
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
  branding: {
    brandingName?: string;
    brandingOrias?: string;
    brandingAccent?: string;
    brandingLogo?: { buffer: Buffer; originalName: string; mimeType?: string };
    removeBrandingLogo?: boolean;
    email?: string;
    backofficeEmail?: string;
  },
): Promise<TenantRecord | null> {
  const existing = await findTenantById(tenantId);
  if (!existing) return null;

  const existingLogo = getTenantBrandingLogo(existing);
  if (existingLogo && (branding.removeBrandingLogo || branding.brandingLogo)) {
    invalidateBaserowFileDataUrlCache(tenantLogoCacheKey(tenantId, existingLogo.name));
  }

  const payload: Record<string, unknown> = {};
  if (branding.brandingName !== undefined) payload[F.brandingName] = branding.brandingName;
  if (branding.brandingOrias !== undefined) payload[F.brandingOrias] = branding.brandingOrias;
  if (branding.brandingAccent !== undefined) payload[F.brandingAccent] = branding.brandingAccent;
  if (branding.email !== undefined) payload[F.email] = branding.email;
  if (branding.backofficeEmail !== undefined) payload[F.backofficeEmail] = branding.backofficeEmail;

  if (branding.removeBrandingLogo) {
    payload[F.brandingLogo] = [];
  } else if (branding.brandingLogo) {
    const uploaded = await uploadUserFile(
      branding.brandingLogo.buffer,
      branding.brandingLogo.originalName,
      branding.brandingLogo.mimeType,
    );
    payload[F.brandingLogo] = [{
      name: uploaded.name,
      visible_name: branding.brandingLogo.originalName,
    }];
  }

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

/** Fields writable on a tenant's SharePoint connection. Tokens must already be
 *  encrypted by the caller (services/sharepoint/oauth.ts) — this layer stores
 *  whatever string it is handed. */
export interface SharepointPatch {
  connected?: boolean;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
  msTenantId?: string;
  siteId?: string;
  driveId?: string;
  siteDisplayName?: string;
  connectedAt?: string;
  connectedBy?: string;
}

export async function patchTenantSharepoint(
  tenantId: string,
  fields: SharepointPatch,
): Promise<TenantRecord | null> {
  const existing = await findTenantById(tenantId);
  if (!existing) return null;

  const payload: Record<string, unknown> = {};
  if (fields.connected !== undefined) payload[F.sharepointConnected] = fields.connected;
  if (fields.accessToken !== undefined) payload[F.sharepointAccessToken] = fields.accessToken;
  if (fields.refreshToken !== undefined) payload[F.sharepointRefreshToken] = fields.refreshToken;
  if (fields.tokenExpiresAt !== undefined) payload[F.sharepointTokenExpiresAt] = fields.tokenExpiresAt;
  if (fields.msTenantId !== undefined) payload[F.sharepointMsTenantId] = fields.msTenantId;
  if (fields.siteId !== undefined) payload[F.sharepointSiteId] = fields.siteId;
  if (fields.driveId !== undefined) payload[F.sharepointDriveId] = fields.driveId;
  if (fields.siteDisplayName !== undefined) payload[F.sharepointSiteDisplayName] = fields.siteDisplayName;
  if (fields.connectedAt !== undefined) payload[F.sharepointConnectedAt] = fields.connectedAt;
  if (fields.connectedBy !== undefined) payload[F.sharepointConnectedBy] = fields.connectedBy;

  if (Object.keys(payload).length === 0) return existing;

  const row = await updateRow(await getTenantsTableId(), tenantId, payload);
  return mapTenantRow(row);
}

/**
 * Wipes every SharePoint column for a tenant.
 *
 * This does NOT revoke anything server-side: Microsoft has no programmatic
 * revocation endpoint for the authorization-code flow. A tenant who wants the
 * grant fully revoked must also remove the app from
 * https://myapps.microsoft.com → the app's "..." menu → Manage → Revoke.
 * Dropping the refresh token here means WE can no longer act on their behalf,
 * which is what matters for the platform's side of the bargain.
 */
export async function clearTenantSharepoint(tenantId: string): Promise<TenantRecord | null> {
  const existing = await findTenantById(tenantId);
  if (!existing) return null;

  const row = await updateRow(await getTenantsTableId(), tenantId, {
    [F.sharepointConnected]: false,
    [F.sharepointAccessToken]: '',
    [F.sharepointRefreshToken]: '',
    [F.sharepointTokenExpiresAt]: '',
    [F.sharepointMsTenantId]: '',
    [F.sharepointSiteId]: '',
    [F.sharepointDriveId]: '',
    [F.sharepointSiteDisplayName]: '',
    [F.sharepointConnectedAt]: '',
    [F.sharepointConnectedBy]: '',
  });
  return mapTenantRow(row);
}
