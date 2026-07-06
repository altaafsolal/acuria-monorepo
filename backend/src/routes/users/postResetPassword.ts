import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/index.js';
import { baserow, passwordResetService } from '../../services/index.js';
import { asyncHandler, HttpError, requireTenant, reqParam } from '../../utils/index.js';
import { isManageableUser } from './helpers.js';

const { usersRepo } = baserow;

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

  await passwordResetService.issueSetPasswordToken(existing!);

  res.json({ message: 'Password reset email sent' });
}));

export default router;
