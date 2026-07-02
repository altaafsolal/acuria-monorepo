import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/index.js';
import { accueilService } from '../../services/index.js';
import { asyncHandler, requireTenant } from '../../utils/index.js';

const { getAccueilData } = accueilService;

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('tenant_admin', 'standard_user'));

router.get('/', asyncHandler(async (req, res) => {
  const tenantId = requireTenant(req);
  const data = await getAccueilData(tenantId);
  res.json(data);
}));

export default router;
