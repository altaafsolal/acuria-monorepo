import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/index.js';
import { kycService } from '../../services/index.js';
import { asyncHandler, requireTenant, reqParam } from '../../utils/index.js';

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('tenant_admin', 'standard_user'));

router.get('/:id/timeline', asyncHandler(async (req, res) => {
  const tenantId = requireTenant(req);
  const user = req.user!;
  const events = await kycService.getClientTimeline(tenantId, reqParam(req, 'id'), {
    userId: user.id,
    userName: user.name,
    role: user.role,
  });
  res.json({ events });
}));

export default router;
