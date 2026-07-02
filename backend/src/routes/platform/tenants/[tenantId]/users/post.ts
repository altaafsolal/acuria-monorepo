import { Router } from 'express';
import { authenticate, requireRole } from '../../../../../middleware/index.js';
import { platformService } from '../../../../../services/index.js';
import { asyncHandler, HttpError, reqParam } from '../../../../../utils/index.js';
import type { Role } from '../../../../../types/domain.js';

const MANAGEABLE_ROLES: Role[] = ['tenant_admin', 'standard_user'];

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('super_admin'));

router.post('/', asyncHandler(async (req, res) => {
  const tenantId = reqParam(req, 'tenantId');
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

  try {
    const user = await platformService.createTenantUser(tenantId, {
      name: body.name,
      email: body.email,
      role: body.role,
    });
    res.status(201).json({ user });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create user';
    if (message === 'Tenant not found') {
      throw new HttpError(404, message);
    }
    if (message === 'A user with this email already exists') {
      throw new HttpError(409, message);
    }
    if (message === 'Role must be tenant_admin or standard_user') {
      throw new HttpError(400, message);
    }
    throw error;
  }
}));

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
    throw error;
  }
}));

export default router;
