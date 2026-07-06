import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/index.js';
import { platformService } from '../../services/index.js';
import { asyncHandler, HttpError, reqParam } from '../../utils/index.js';

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('super_admin'));

router.get('/tenants/:tenantId/users', asyncHandler(async (req, res) => {
  const tenantId = reqParam(req, 'tenantId');
  const tenant = await platformService.getTenant(tenantId);
  if (!tenant) {
    throw new HttpError(404, 'Tenant not found');
  }
  const users = await platformService.listTenantUsers(tenantId);
  res.json({ users });
}));

export default router;
