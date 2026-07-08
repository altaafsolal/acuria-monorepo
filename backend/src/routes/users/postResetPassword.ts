import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/index.js';
import { usersRepo } from '../../services/baserow/index.js';
import { issueSetPasswordToken } from '../../services/password-reset.js';
import { asyncHandler, HttpError, requireTenant, reqParam } from '../../utils/index.js';
import { isManageableUser } from './helpers.js';

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('tenant_admin'));

router.post('/:id/reset-password', asyncHandler(async (req, res) => {
  const tenantId = requireTenant(req);
  const userId = reqParam(req, 'id');

  const existing = await usersRepo.findUserById(userId);
  if (!isManageableUser(existing, tenantId)) {
    throw new HttpError(404, 'User not found');
  }

  if (!usersRepo.hasUserEmail(existing!)) {
    throw new HttpError(400, 'User has no email address');
  }

  await issueSetPasswordToken(existing!);

  res.json({ message: 'Password reset email sent' });
}));

export default router;
