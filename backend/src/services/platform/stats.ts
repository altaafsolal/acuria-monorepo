import { clientsRepo, tenantsRepo, usersRepo } from '../baserow/index.js';
import type { CountStats, DbClient, PublicTenant } from '../../types/domain.js';
import { enrichTenants } from './tenants.js';

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

  const [enriched] = await enrichTenants([tenant]);

  return {
    tenant: enriched,
    tenants: countByStatus([tenant]),
    users: countByStatus(users),
    clients: countByStatus(clients),
  };
}
