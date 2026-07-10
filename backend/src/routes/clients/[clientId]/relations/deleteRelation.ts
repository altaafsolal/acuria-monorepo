import { Router } from 'express';
import { authenticate, requireRole, requireTenant} from '../../../../middleware/index.js';
import { relationsRepo } from '../../../../services/baserow/index.js';
import { asyncHandler,reqParam } from '../../../../utils/index.js';

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('tenant_admin', 'standard_user'), requireTenant);

router.delete('/:relationId', asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  await relationsRepo.deleteRelation(tenantId, reqParam(req, 'relationId'));
  res.status(204).send();
}));

export default router;
