import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/index.js';
import { baserow, passwordResetService } from '../../services/index.js';
import { asyncHandler, HttpError, requireTenant, reqParam } from '../../utils/index.js';
import type { Role } from '../../types/domain.js';
import { isManageableUser, MANAGEABLE_ROLES } from './helpers.js';

const { usersRepo } = baserow;

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('tenant_admin'));

router.post('/', asyncHandler(async (req, res) => {
  const tenantId = requireTenant(req);
  const body = req.body as {
    name?: string;
    email?: string;
    role?: string;
  };

  if (!body?.name?.trim()) {
    throw new HttpError(400, 'Name is required');
  }
  if (!body?.email?.trim()) {
    throw new HttpError(400, 'Email is required');
  }
  if (!body?.role || !MANAGEABLE_ROLES.includes(body.role as Role)) {
    throw new HttpError(400, 'Role must be tenant_admin or standard_user');
  }

  if (await usersRepo.userExists(body.email)) {
    throw new HttpError(409, 'A user with this email already exists');
  }

  const user = await usersRepo.createUser({
    email: body.email.trim().toLowerCase(),
    password_hash: '',
    name: body.name.trim(),
    role: body.role,
    tenant_id: tenantId,
    status: 'pending',
  });

  await passwordResetService.issueSetPasswordToken(user);

  res.status(201).json({ user: usersRepo.toPublicUser(user) });
}));

router.post('/:id/reset-password', asyncHandler(async (req, res) => {
  const tenantId = requireTenant(req);
  const userId = reqParam(req, 'id');

  const existing = await usersRepo.findUserById(userId);
  if (!isManageableUser(existing, tenantId)) {
    throw new HttpError(404, 'User not found');
  }

  await passwordResetService.issueSetPasswordToken(existing);

  res.json({ message: 'Password reset email sent' });
}));

export default router;
