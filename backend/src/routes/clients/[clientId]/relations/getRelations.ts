import { Router } from 'express';
import { authenticate, requireRole } from '../../../../middleware/index.js';
import { relationsRepo } from '../../../../services/baserow/index.js';
import { asyncHandler, requireTenant, reqParam } from '../../../../utils/index.js';

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('tenant_admin', 'standard_user'));

router.get('/', asyncHandler(async (req, res) => {
  const tenantId = requireTenant(req);
  const clientId = reqParam(req, 'clientId');
  const relations = await relationsRepo.listRelationsByClient(tenantId, clientId);
  res.json({ relations });
}));

export default router;
