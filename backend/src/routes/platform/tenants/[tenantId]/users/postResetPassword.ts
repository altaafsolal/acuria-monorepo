import { Router } from 'express';
import { authenticate, requireRole } from '../../../../../middleware/index.js';
import { tenantsRepo, usersRepo } from '../../../../../services/baserow/index.js';
import { issueSetPasswordToken } from '../../../../../services/password-reset.js';
import { asyncHandler, HttpError, reqParam } from '../../../../../utils/index.js';

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('super_admin'));

router.post('/:userId/reset-password', asyncHandler(async (req, res) => {
  const tenantId = reqParam(req, 'tenantId');
  const userId = reqParam(req, 'userId');

  try {
    const tenant = await tenantsRepo.findTenantById(tenantId);
    if (!tenant) throw new Error('Tenant not found');

    const existing = await usersRepo.findUserById(userId);
    if (!existing || usersRepo.isSuperAdmin(existing) || existing.tenant_id !== tenantId) {
      throw new Error('User not found');
    }

    if (!usersRepo.hasUserEmail(existing)) {
      throw new Error('User has no email address');
    }

    await issueSetPasswordToken(existing, {
      name: tenant.branding_name || tenant.name,
      email: tenant.email || '',
    });
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
