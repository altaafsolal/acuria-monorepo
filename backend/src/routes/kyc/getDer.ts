import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/index.js';
import { kycService } from '../../services/index.js';
import { asyncHandler, requireTenant } from '../../utils/index.js';

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('tenant_admin', 'standard_user'));

router.get('/der', asyncHandler(async (req, res) => {
  const tenantId = requireTenant(req);
  const filter = String(req.query.filter || '');
  const clients = await kycService.listDerClients(tenantId, filter);
  res.json({ clients });
}));

export default router;
