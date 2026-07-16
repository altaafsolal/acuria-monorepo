import { Router } from 'express';
import { authenticate } from '../../../../middleware/index.js';
import * as tenantsRepo from '../../../../services/baserow/tenants.js';
import { asyncHandler, HttpError, reqParam } from '../../../../utils/index.js';
import { assertTenantMemberFor } from './_guard.js';

const router = Router({ mergeParams: true });

// Per-route middleware (not router.use) — see the note in the SharePoint getStatus:
// getToken.ts in this folder authenticates Make with a shared secret, so a
// router.use(authenticate) would wrongly 401 it.

// Connection status only — never tokens. Any member of the tenant may read it;
// the onboarding gate blocks standard users on it too.
router.get('/status', authenticate, asyncHandler(async (req, res) => {
  const tenantId = reqParam(req, 'tenantId');
  assertTenantMemberFor(req, tenantId);

  const tenant = await tenantsRepo.findTenantById(tenantId);
  if (!tenant) throw new HttpError(404, 'Tenant not found');

  res.json({ email: tenantsRepo.toEmailStatus(tenant) });
}));

export default router;
