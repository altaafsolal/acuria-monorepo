import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/index.js';
import { platformService } from '../../services/index.js';
import { asyncHandler, HttpError } from '../../utils/index.js';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.get('/stats', requireRole('tenant_admin'), asyncHandler(async (req, res) => {
  const { tenantId } = req.user!;

  if (!tenantId) {
    throw new HttpError(403, 'No tenant assigned to this account');
  }

  const stats = await platformService.getTenantStats(tenantId);
  if (!stats) {
    throw new HttpError(404, 'Tenant not found');
  }
  res.json(stats);
}));

export default router;
