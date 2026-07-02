import { Router } from 'express';
import { authenticate, requireRole } from '../../../../middleware/index.js';
import { baserow } from '../../../../services/index.js';
import { asyncHandler, requireTenant, reqParam } from '../../../../utils/index.js';

const { relationsRepo } = baserow;

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('tenant_admin', 'standard_user'));

router.delete('/:relationId', asyncHandler(async (req, res) => {
  const tenantId = requireTenant(req);
  await relationsRepo.deleteRelation(tenantId, reqParam(req, 'relationId'));
  res.status(204).send();
}));

export default router;
