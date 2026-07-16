import { Router } from 'express';
import { authenticate } from '../../../../middleware/index.js';
import * as tenantsRepo from '../../../../services/baserow/tenants.js';
import { asyncHandler, HttpError, reqParam } from '../../../../utils/index.js';
import { assertTenantMemberFor } from './_guard.js';

const router = Router({ mergeParams: true });

// NOTE: middleware is attached per-route, not via router.use(). Every verb file in
// this folder is mounted onto one shared router by loadRoutes, so a router.use()
// here would also run for requests aimed at the sibling routes — and getToken.ts
// authenticates Make.com with a shared secret, not a Bearer token, so a stray
// authenticate() would 401 it.

// Connection status only — never tokens. Any member of the tenant may read it,
// because the dashboard gate blocks standard users on it too.
router.get('/status', authenticate, asyncHandler(async (req, res) => {
  const tenantId = reqParam(req, 'tenantId');
  assertTenantMemberFor(req, tenantId);

  const tenant = await tenantsRepo.findTenantById(tenantId);
  if (!tenant) throw new HttpError(404, 'Tenant not found');

  res.json({ sharepoint: tenantsRepo.toSharepointStatus(tenant) });
}));

export default router;
