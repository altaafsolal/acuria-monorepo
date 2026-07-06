import { clientsRepo, tenantsRepo, usersRepo, tenantDatabase } from './baserow/index.js';
import * as passwordResetService from './password-reset.js';
import * as userGestionnaireService from './user-gestionnaire.js';
import { isBaserowMigrateConfigured } from '../config/env.js';
import { provisionTenantTables } from '../../baserow/provisioners/tenant-tables.js';
import { broadcast } from '../realtime/socket.js';
import type {
  CountStats,
  CreateTenantInput,
  DbClient,
  DbUser,
  PublicClient,
  PublicTenant,
  PublicUser,
  Role,
  TenantRecord,
  UpdateUserInput,
} from '../types/domain.js';

const MANAGEABLE_ROLES: Role[] = ['tenant_admin', 'standard_user'];

function isTenantMember(user: DbUser | null, tenantId: string): user is DbUser {
  if (!user) return false;
  if (usersRepo.isSuperAdmin(user)) return false;
  return user.tenant_id === tenantId;
}

async function requireTenantRecord(tenantId: string): Promise<TenantRecord> {
  const tenant = await tenantsRepo.findTenantById(tenantId);
  if (!tenant) {
    throw new Error('Tenant not found');
  }
  return tenant;
}

function countByStatus<T extends { status: string }>(
  items: T[],
  activeValue = 'active',
): CountStats {
  return items.reduce<CountStats>(
    (acc, item) => {
      acc.total += 1;
      if (item.status === activeValue) acc.active += 1;
      else acc.inactive += 1;
      return acc;
    },
    { total: 0, active: 0, inactive: 0 },
  );
}

async function enrichTenants(
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

export async function getPlatformStats(): Promise<{
  tenants: CountStats;
  users: CountStats;
  clients: CountStats;
}> {
  const tenants = await tenantsRepo.listTenants();
  const users = usersRepo.excludeSuperAdmins(await usersRepo.listUsers());

  const clientArrays = await Promise.all(
    tenants.map((tenant) =>
      clientsRepo.listClientsByTenantId(tenant.id).catch(() => [] as DbClient[]),
    ),
  );
  const allClients = clientArrays.flat();

  return {
    tenants: countByStatus(tenants),
    users: countByStatus(users),
    clients: countByStatus(allClients),
  };
}

export async function getTenantStats(tenantId: string): Promise<{
  tenant: PublicTenant;
  tenants: CountStats;
  users: CountStats;
  clients: CountStats;
} | null> {
  const tenant = await tenantsRepo.findTenantById(tenantId);
  if (!tenant) return null;

  const users = usersRepo.excludeSuperAdmins(
    await usersRepo.listUsersByTenantId(tenantId),
  );
  let clients: DbClient[] = [];
  try {
    clients = await clientsRepo.listClientsByTenantId(tenantId);
  } catch {
    // tenant tables not provisioned yet
  }

  return {
    tenant: tenantsRepo.toPublicTenant(tenant, {
      userCount: users.length,
      clientCount: clients.length,
    }),
    tenants: countByStatus([tenant]),
    users: countByStatus(users),
    clients: countByStatus(clients),
  };
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
  },
): Promise<PublicTenant | null> {
  const hasBrandingFields = branding.brandingName !== undefined
    || branding.brandingOrias !== undefined
    || branding.brandingAccent !== undefined
    || branding.brandingLogo !== undefined
    || branding.removeBrandingLogo === true;

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

export async function listTenantUsers(tenantId: string): Promise<PublicUser[]> {
  return usersRepo.excludeSuperAdmins(
    await usersRepo.listUsersByTenantId(tenantId),
  ).map(usersRepo.toPublicUser);
}

export async function createTenantUser(
  tenantId: string,
  input: { name: string; email: string; role: string },
): Promise<PublicUser> {
  await requireTenantRecord(tenantId);
  const result = await userGestionnaireService.createManagedUser(tenantId, input);
  return result.user;
}

export async function updateTenantUser(
  tenantId: string,
  userId: string,
  input: { name?: string; email?: string; role?: string; status?: string },
): Promise<PublicUser> {
  await requireTenantRecord(tenantId);
  const result = await userGestionnaireService.updateManagedUser(tenantId, userId, input);
  return result.user;
}

export async function resetTenantUserPassword(tenantId: string, userId: string): Promise<void> {
  await requireTenantRecord(tenantId);

  const existing = await usersRepo.findUserById(userId);
  if (!isTenantMember(existing, tenantId)) {
    throw new Error('User not found');
  }

  if (!usersRepo.hasUserEmail(existing)) {
    throw new Error('User has no email address');
  }

  await passwordResetService.issueSetPasswordToken(existing);
}

export async function deleteTenantUser(tenantId: string, userId: string): Promise<void> {
  await requireTenantRecord(tenantId);

  const existing = await usersRepo.findUserById(userId);
  if (!isTenantMember(existing, tenantId)) {
    throw new Error('User not found');
  }

  await usersRepo.deleteUser(userId);
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
