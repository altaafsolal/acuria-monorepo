import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/index.js';
import { usersRepo } from '../../services/baserow/index.js';
import { asyncHandler, HttpError, requireTenant, reqParam } from '../../utils/index.js';
import { isManageableUser } from './helpers.js';

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('tenant_admin'));

router.delete('/:id', asyncHandler(async (req, res) => {
  const tenantId = requireTenant(req);
  const currentUserId = req.user?.id;
  if (!currentUserId) {
    throw new HttpError(403, 'No tenant assigned to this account');
  }

  const userId = reqParam(req, 'id');
  if (userId === currentUserId) {
    throw new HttpError(400, 'You cannot delete your own account');
  }

  const existing = await usersRepo.findUserById(userId);
  if (!isManageableUser(existing, tenantId)) {
    throw new HttpError(404, 'User not found');
  }

  await usersRepo.deleteUser(userId);
  res.status(204).send();
}));

export default router;
