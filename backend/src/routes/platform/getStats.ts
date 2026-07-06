import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/index.js';
import { platformService } from '../../services/index.js';
import { asyncHandler } from '../../utils/index.js';

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('super_admin'));

router.get('/stats', asyncHandler(async (_req, res) => {
  const stats = await platformService.getPlatformStats();
  res.json(stats);
}));

export default router;
