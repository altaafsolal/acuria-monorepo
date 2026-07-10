import { Router } from 'express';
import { authenticate, requireRole, requireTenant} from '../../middleware/index.js';
import { getUserWithGestionnaire } from '../../services/users/managed.js';
import { asyncHandler, HttpError,reqParam } from '../../utils/index.js';

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('tenant_admin'), requireTenant);

router.get('/:id', asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const userId = reqParam(req, 'id');
  const result = await getUserWithGestionnaire(tenantId, userId);
  if (!result) {
    throw new HttpError(404, 'User not found');
  }
  res.json(result);
}));

export default router;
