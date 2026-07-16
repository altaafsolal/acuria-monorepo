import type { Request } from 'express';
import { HttpError } from '../../../../utils/index.js';

/**
 * Same rationale as the SharePoint guard: requireRole('tenant_admin') proves the
 * caller is *a* tenant admin, not that they administer THIS tenant. Without the
 * identity check, any tenant admin could connect/disconnect another cabinet's
 * email by changing :tenantId. Underscore prefix keeps loadRoutes from mounting it.
 */
export function assertTenantAdminFor(req: Request, tenantId: string): void {
  const user = req.user;
  if (!user) throw new HttpError(401, 'Authentication required');
  if (user.role === 'super_admin') return;
  if (user.tenantId !== tenantId) throw new HttpError(403, 'Insufficient permissions');
  if (user.role !== 'tenant_admin') throw new HttpError(403, 'Insufficient permissions');
}

/** Read access: any member of the tenant, because the onboarding gate reads status
 *  for standard users too. Still scoped to their own tenant. */
export function assertTenantMemberFor(req: Request, tenantId: string): void {
  const user = req.user;
  if (!user) throw new HttpError(401, 'Authentication required');
  if (user.role === 'super_admin') return;
  if (user.tenantId !== tenantId) throw new HttpError(403, 'Insufficient permissions');
}
