import { Router } from 'express';
import { authenticate, requireRole } from '../../../../../middleware/index.js';
import { platformService } from '../../../../../services/index.js';
import { asyncHandler, HttpError, reqParam } from '../../../../../utils/index.js';

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('super_admin'));

router.post('/:userId/reset-password', asyncHandler(async (req, res) => {
  const tenantId = reqParam(req, 'tenantId');
  const userId = reqParam(req, 'userId');

  try {
    await platformService.resetTenantUserPassword(tenantId, userId);
    res.json({ message: 'Password reset email sent' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to reset password';
    if (message === 'Tenant not found' || message === 'User not found') {
      throw new HttpError(404, message);
    }
    if (message === 'User has no email address') {
      throw new HttpError(400, message);
    }
    throw error;
  }
}));

export default router;
