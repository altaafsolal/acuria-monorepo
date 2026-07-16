import { Router } from 'express';
import { authenticate } from '../../../../middleware/index.js';
import * as tenantsRepo from '../../../../services/baserow/tenants.js';
import { asyncHandler, HttpError, reqParam } from '../../../../utils/index.js';
import { assertTenantAdminFor } from './_guard.js';

const router = Router({ mergeParams: true });

/**
 * Drops our copy of the tenant's tokens.
 *
 * We do not attempt a server-side revoke: Microsoft exposes no programmatic
 * revocation for the authorization-code flow. A tenant who wants the grant fully
 * revoked on their side must also remove the app at https://myapps.microsoft.com
 * → app "..." menu → Manage → Revoke. Deleting the refresh token here is what
 * stops US from acting on their behalf, which is the part we control.
 *
 * (authenticate is attached per-route rather than via router.use — see the note
 * in getStatus.ts.)
 */
router.post('/disconnect', authenticate, asyncHandler(async (req, res) => {
  const tenantId = reqParam(req, 'tenantId');
  assertTenantAdminFor(req, tenantId);

  const updated = await tenantsRepo.clearTenantSharepoint(tenantId);
  if (!updated) throw new HttpError(404, 'Tenant not found');

  res.json({ sharepoint: tenantsRepo.toSharepointStatus(updated) });
}));

export default router;
