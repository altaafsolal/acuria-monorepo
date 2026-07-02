import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/index.js';
import { baserow } from '../../services/index.js';
import { asyncHandler, requireTenant } from '../../utils/index.js';

const { gestionnairesRepo } = baserow;

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('tenant_admin', 'standard_user'));

router.get('/', asyncHandler(async (req, res) => {
  const tenantId = requireTenant(req);
  const gestionnaires = await gestionnairesRepo.listGestionnaires(tenantId);
  res.json({ gestionnaires });
}));

export default router;
