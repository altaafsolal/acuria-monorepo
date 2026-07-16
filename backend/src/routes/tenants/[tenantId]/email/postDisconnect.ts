import { Router } from 'express';
import { authenticate } from '../../../../middleware/index.js';
import * as tenantsRepo from '../../../../services/baserow/tenants.js';
import { asyncHandler, HttpError, reqParam } from '../../../../utils/index.js';
import { assertTenantAdminFor } from './_guard.js';

const router = Router({ mergeParams: true });

/**
 * Drops our copy of the tenant's email tokens.
 *
 * No server-side revoke: neither Microsoft nor Google expose programmatic
 * revocation for the authorization-code flow. A tenant wanting a full revoke must
 * also remove the app at https://myapps.microsoft.com (Microsoft) or
 * https://myaccount.google.com/permissions (Google). Deleting the refresh token
 * here stops the platform sending on their behalf, which is the part we control.
 */
router.post('/disconnect', authenticate, asyncHandler(async (req, res) => {
  const tenantId = reqParam(req, 'tenantId');
  assertTenantAdminFor(req, tenantId);

  const updated = await tenantsRepo.clearTenantEmail(tenantId);
  if (!updated) throw new HttpError(404, 'Tenant not found');

  res.json({ email: tenantsRepo.toEmailStatus(updated) });
}));

export default router;
