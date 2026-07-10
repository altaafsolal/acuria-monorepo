import { Router } from 'express';
import { authenticate, requireRole, requireTenant} from '../../../../middleware/index.js';
import { relationsRepo } from '../../../../services/baserow/index.js';
import { asyncHandler,reqParam } from '../../../../utils/index.js';

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('tenant_admin', 'standard_user'), requireTenant);

router.get('/', asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const clientId = reqParam(req, 'clientId');
  const relations = await relationsRepo.listRelationsByClient(tenantId, clientId);
  res.json({ relations });
}));

export default router;
