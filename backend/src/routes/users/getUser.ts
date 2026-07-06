import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/index.js';
import { userGestionnaireService } from '../../services/index.js';
import { asyncHandler, HttpError, requireTenant, reqParam } from '../../utils/index.js';

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('tenant_admin'));

router.get('/:id', asyncHandler(async (req, res) => {
  const tenantId = requireTenant(req);
  const userId = reqParam(req, 'id');
  const result = await userGestionnaireService.getUserWithGestionnaire(tenantId, userId);
  if (!result) {
    throw new HttpError(404, 'User not found');
  }
  res.json(result);
}));

export default router;
