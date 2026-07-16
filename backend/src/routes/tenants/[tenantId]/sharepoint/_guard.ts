import type { Request } from 'express';
import { HttpError } from '../../../../utils/index.js';

/**
 * `requireRole('tenant_admin')` is not enough on these routes: it proves the
 * caller IS a tenant admin, not that they administer THIS tenant. Without the
 * identity check below, any tenant admin could connect or disconnect any other
 * cabinet's SharePoint by changing the :tenantId in the URL.
 *
 * Filename is underscore-prefixed so loadRoutes' VERB_FILE_RE ignores it — it is
 * a helper, not a route.
 */
export function assertTenantAdminFor(req: Request, tenantId: string): void {
  const user = req.user;
  if (!user) throw new HttpError(401, 'Authentication required');
  if (user.role === 'super_admin') return;
  if (user.tenantId !== tenantId) throw new HttpError(403, 'Insufficient permissions');
  if (user.role !== 'tenant_admin') throw new HttpError(403, 'Insufficient permissions');
}

/** Read access is wider than write: a standard user needs to know whether their
 *  cabinet is connected, because the dashboard gate keys off it. Still scoped to
 *  their own tenant. */
export function assertTenantMemberFor(req: Request, tenantId: string): void {
  const user = req.user;
  if (!user) throw new HttpError(401, 'Authentication required');
  if (user.role === 'super_admin') return;
  if (user.tenantId !== tenantId) throw new HttpError(403, 'Insufficient permissions');
}
