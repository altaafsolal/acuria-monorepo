import { tenantsRepo, usersRepo } from '../baserow/index.js';
import * as passwordResetService from '../password-reset.js';
import type { DbUser, PublicUser, TenantRecord } from '../../types/domain.js';

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

export async function listTenantUsers(tenantId: string): Promise<PublicUser[]> {
  return usersRepo.excludeSuperAdmins(
    await usersRepo.listUsersByTenantId(tenantId),
  ).map(usersRepo.toPublicUser);
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
