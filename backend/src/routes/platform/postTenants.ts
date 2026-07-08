import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/index.js';
import { createTenant, finishTenantProvisioning } from '../../services/platform/tenants.js';
import { asyncHandler, HttpError } from '../../utils/index.js';

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('super_admin'));

router.post('/tenants', asyncHandler(async (req, res) => {
  const { name, slug } = req.body as { name?: string; slug?: string };

  if (!name || !slug) {
    throw new HttpError(400, 'Name and slug are required');
  }

  const { tenant, record } = await createTenant({ name, slug });
  void finishTenantProvisioning(record);
  res.status(202).json({ tenant });
}));

export default router;
