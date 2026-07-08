import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/index.js';
import { getTenant } from '../../services/platform/tenants.js';
import { asyncHandler, HttpError, reqParam } from '../../utils/index.js';

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('super_admin'));

router.get('/tenants/:tenantId', asyncHandler(async (req, res) => {
  const tenantId = reqParam(req, 'tenantId');
  const tenant = await getTenant(tenantId);
  if (!tenant) {
    throw new HttpError(404, 'Tenant not found');
  }
  res.json({ tenant });
}));

export default router;
