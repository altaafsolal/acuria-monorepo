import { clientsRepo, tenantsRepo, usersRepo, tenantDatabase } from '../baserow/index.js';
import { isBaserowMigrateConfigured } from '../../config/env.js';
import { provisionTenantTables } from '../../../baserow/provisioners/tenant-tables.js';
import { broadcast } from '../../realtime/socket.js';
import type {
  CreateTenantInput,
  PublicClient,
  PublicTenant,
  TenantRecord,
} from '../../types/domain.js';

export async function enrichTenants(
  tenants: TenantRecord[],
  { includeLogoDataUrl = false }: { includeLogoDataUrl?: boolean } = {},
): Promise<PublicTenant[]> {
  return Promise.all(tenants.map(async (tenant) => {
    const users = usersRepo.excludeSuperAdmins(
      await usersRepo.listUsersByTenantId(tenant.id),
    );
    const clientCount = await clientsRepo.countClientsByTenantId(tenant.id);
    const publicTenant = tenantsRepo.toPublicTenant(tenant, {
      userCount: users.length,
      clientCount,
    });

    if (includeLogoDataUrl) {
      publicTenant.brandingLogoDataUrl = await tenantsRepo.resolveTenantBrandingLogoDataUrl(tenant);
    }

    return publicTenant;
  }));
}

export async function listTenants(): Promise<PublicTenant[]> {
  return enrichTenants(await tenantsRepo.listTenants());
}

export async function getTenant(tenantId: string): Promise<PublicTenant | null> {
  const tenant = await tenantsRepo.findTenantById(tenantId);
  if (!tenant) return null;
  const [enriched] = await enrichTenants([tenant]);
  return enriched;
}

export async function updateTenantBranding(
  tenantId: string,
  branding: {
    brandingName?: string;
    brandingOrias?: string;
    brandingAccent?: string;
    status?: string;
    brandingLogo?: { buffer: Buffer; originalName: string; mimeType?: string };
    removeBrandingLogo?: boolean;
    email?: string;
  },
): Promise<PublicTenant | null> {
  const hasBrandingFields = branding.brandingName !== undefined
    || branding.brandingOrias !== undefined
    || branding.brandingAccent !== undefined
    || branding.brandingLogo !== undefined
    || branding.removeBrandingLogo === true
    || branding.email !== undefined;

  let record = hasBrandingFields
    ? await tenantsRepo.patchTenantBranding(tenantId, branding)
    : await tenantsRepo.findTenantById(tenantId);

  if (!record) return null;

  if (branding.status !== undefined) {
    record = await tenantsRepo.patchTenantStatus(tenantId, branding.status);
    if (!record) return null;
  }

  const [enriched] = await enrichTenants([record], { includeLogoDataUrl: true });
  return enriched;
}

export async function listTenantClients(tenantId: string): Promise<PublicClient[] | null> {
  const tenant = await tenantsRepo.findTenantById(tenantId);
  if (!tenant) return null;
  const clients = await clientsRepo.listClientsByTenantId(tenantId);
  return clients.map(clientsRepo.toPublicClient);
}

export async function createTenant({ name, slug }: CreateTenantInput): Promise<{
  tenant: PublicTenant;
  record: TenantRecord;
}> {
  const existing = await tenantsRepo.findTenantBySlug(slug);
  if (existing) throw new Error('A tenant with this slug already exists');

  if (!isBaserowMigrateConfigured()) {
    throw new Error(
      'BASEROW_EMAIL and BASEROW_PASSWORD are required to create a tenant database',
    );
  }

  const { workspaceId, databaseId, databaseToken } = await tenantDatabase.provisionTenantWorkspace(name);

  const record = await tenantsRepo.createTenant({
    name,
    slug,
    status: 'provisioning',
    workspace_id: workspaceId,
    database_id: databaseId,
    database_token: databaseToken,
  });

  return {
    record,
    tenant: tenantsRepo.toPublicTenant(record, { userCount: 0, clientCount: 0 }),
  };
}

export async function finishTenantProvisioning(tenant: TenantRecord): Promise<void> {
  try {
    await provisionTenantTables(tenant);
    const updated = await tenantsRepo.patchTenantStatus(tenant.id, 'active');
    if (!updated) {
      throw new Error(`Tenant ${tenant.id} not found after provisioning`);
    }

    const [enriched] = await enrichTenants([updated]);
    broadcast({ type: 'tenant.provisioned', tenant: enriched });
  } catch (error) {
    console.error(`Tenant provisioning failed for ${tenant.id}:`, error);
    await tenantsRepo.patchTenantStatus(tenant.id, 'failed').catch((patchError) => {
      console.error(`Failed to mark tenant ${tenant.id} as failed:`, patchError);
    });
    broadcast({
      type: 'tenant.failed',
      tenantId: tenant.id,
      name: tenant.name,
      error: error instanceof Error ? error.message : 'Provisioning failed',
    });
  }
}

export async function ensureTenantProvisioned(
  tenantId: string,
): Promise<Record<string, string | undefined>> {
  const tenant = await tenantsRepo.findTenantById(tenantId);
  if (!tenant) throw new Error(`Tenant ${tenantId} not found`);

  return provisionTenantTables(tenant);
}
