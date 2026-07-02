import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/index.js';
import { platformService } from '../../services/index.js';
import { asyncHandler, HttpError, reqParam } from '../../utils/index.js';

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('super_admin'));

router.get('/stats', asyncHandler(async (_req, res) => {
  const stats = await platformService.getPlatformStats();
  res.json(stats);
}));

router.get('/tenants', asyncHandler(async (_req, res) => {
  const tenants = await platformService.listTenants();
  res.json({ tenants });
}));

router.get('/tenants/:tenantId', asyncHandler(async (req, res) => {
  const tenantId = reqParam(req, 'tenantId');
  const tenant = await platformService.getTenant(tenantId);
  if (!tenant) {
    throw new HttpError(404, 'Tenant not found');
  }
  res.json({ tenant });
}));

router.get('/tenants/:tenantId/users', asyncHandler(async (req, res) => {
  const tenantId = reqParam(req, 'tenantId');
  const tenant = await platformService.getTenant(tenantId);
  if (!tenant) {
    throw new HttpError(404, 'Tenant not found');
  }
  const users = await platformService.listTenantUsers(tenantId);
  res.json({ users });
}));

router.get('/tenants/:tenantId/clients', asyncHandler(async (req, res) => {
  const tenantId = reqParam(req, 'tenantId');
  const tenant = await platformService.getTenant(tenantId);
  if (!tenant) {
    throw new HttpError(404, 'Tenant not found');
  }
  const clients = await platformService.listTenantClients(tenantId);
  res.json({ clients });
}));

export default router;
