import { usersRepo } from '../baserow/index.js';
import type { PublicUser } from '../../types/domain.js';

export async function listTenantUsers(tenantId: string): Promise<PublicUser[]> {
  return usersRepo.excludeSuperAdmins(
    await usersRepo.listUsersByTenantId(tenantId),
  ).map(usersRepo.toPublicUser);
}
