import { Router } from 'express';
import { authenticate, requireRole, requireTenant} from '../../middleware/index.js';
import { usersRepo, tenantsRepo } from '../../services/baserow/index.js';
import { issueSetPasswordToken } from '../../services/password-reset.js';
import { asyncHandler, HttpError,reqParam } from '../../utils/index.js';
import { isManageableUser } from './helpers.js';

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('tenant_admin'), requireTenant);

router.post('/:id/reset-password', asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const userId = reqParam(req, 'id');

  const [existing, tenant] = await Promise.all([
    usersRepo.findUserById(userId),
    tenantsRepo.findTenantById(tenantId),
  ]);

  if (!isManageableUser(existing, tenantId)) {
    throw new HttpError(404, 'User not found');
  }

  if (!usersRepo.hasUserEmail(existing!)) {
    throw new HttpError(400, 'User has no email address');
  }

  await issueSetPasswordToken(existing!, tenant ? {
    name: tenant.branding_name || tenant.name,
    email: tenant.email || '',
  } : undefined);

  res.json({ message: 'Password reset email sent' });
}));

export default router;
