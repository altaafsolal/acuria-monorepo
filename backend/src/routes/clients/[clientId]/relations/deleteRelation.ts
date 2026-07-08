import { Router } from 'express';
import { authenticate, requireRole } from '../../../../middleware/index.js';
import { relationsRepo } from '../../../../services/baserow/index.js';
import { asyncHandler, requireTenant, reqParam } from '../../../../utils/index.js';

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('tenant_admin', 'standard_user'));

router.delete('/:relationId', asyncHandler(async (req, res) => {
  const tenantId = requireTenant(req);
  await relationsRepo.deleteRelation(tenantId, reqParam(req, 'relationId'));
  res.status(204).send();
}));

export default router;
