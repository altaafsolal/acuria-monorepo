import { Router } from 'express';
import { authenticate, requireRole, requireTenant} from '../../middleware/index.js';
import { gestionnairesRepo } from '../../services/baserow/index.js';
import { asyncHandler} from '../../utils/index.js';

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('tenant_admin', 'standard_user'), requireTenant);

router.get('/', asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const gestionnaires = await gestionnairesRepo.listGestionnaires(tenantId);
  res.json({ gestionnaires });
}));

export default router;
