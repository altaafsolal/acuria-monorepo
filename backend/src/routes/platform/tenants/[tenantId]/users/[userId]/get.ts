import { Router } from 'express';
import { authenticate, requireRole } from '../../../../../../middleware/index.js';
import { userGestionnaireService } from '../../../../../../services/index.js';
import { asyncHandler, HttpError, reqParam } from '../../../../../../utils/index.js';

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('super_admin'));

router.get('/', asyncHandler(async (req, res) => {
  const tenantId = reqParam(req, 'tenantId');
  const userId = reqParam(req, 'userId');
  const result = await userGestionnaireService.getUserWithGestionnaire(tenantId, userId);
  if (!result) {
    throw new HttpError(404, 'User not found');
  }
  res.json(result);
}));

export default router;
