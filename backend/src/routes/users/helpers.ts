import type { DbUser, Role } from '../../types/domain.js';
import { usersRepo } from '../../services/baserow/index.js';

export const MANAGEABLE_ROLES: Role[] = ['tenant_admin', 'standard_user'];

export function isManageableUser(user: DbUser | null, tenantId: string): user is DbUser {
  if (!user) return false;
  if (usersRepo.isSuperAdmin(user)) return false;
  return user.tenant_id === tenantId;
}
