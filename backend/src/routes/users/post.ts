import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/index.js';
import { baserow, passwordResetService, userGestionnaireService } from '../../services/index.js';
import { asyncHandler, HttpError, requireTenant, reqParam } from '../../utils/index.js';
import type { GestionnaireUserInput, Role } from '../../types/domain.js';
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
    gestionnaire?: GestionnaireUserInput;
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
    const result = await userGestionnaireService.createManagedUser(tenantId, {
      name: body.name,
      email: body.email,
      role: body.role,
      gestionnaire: body.gestionnaire,
    });
    res.status(201).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create user';
    if (message === 'A user with this email already exists') {
      throw new HttpError(409, message);
    }
    if (message === 'Email is required') {
      throw new HttpError(400, message);
    }
    throw error;
  }
}));

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
