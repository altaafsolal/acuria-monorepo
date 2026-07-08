import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/index.js';
import { getPlatformStats } from '../../services/platform/stats.js';
import { asyncHandler } from '../../utils/index.js';

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('super_admin'));

router.get('/stats', asyncHandler(async (_req, res) => {
  const stats = await getPlatformStats();
  res.json(stats);
}));

export default router;
