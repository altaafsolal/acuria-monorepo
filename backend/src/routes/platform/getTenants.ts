import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/index.js';
import { listTenants } from '../../services/platform/tenants.js';
import { asyncHandler } from '../../utils/index.js';

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('super_admin'));

router.get('/tenants', asyncHandler(async (_req, res) => {
  const tenants = await listTenants();
  res.json({ tenants });
}));

export default router;
