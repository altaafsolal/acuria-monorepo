import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/index.js';
import { baserow } from '../../services/index.js';
import { asyncHandler, HttpError, requireTenant, reqParam } from '../../utils/index.js';
import type { Role, UpdateUserInput } from '../../types/domain.js';
import { isManageableUser, MANAGEABLE_ROLES } from './helpers.js';

const { usersRepo } = baserow;

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('tenant_admin'));

router.put('/:id', asyncHandler(async (req, res) => {
  const tenantId = requireTenant(req);
  const currentUserId = req.user?.id;
  if (!currentUserId) {
    throw new HttpError(403, 'No tenant assigned to this account');
  }

  const body = req.body as {
    name?: string;
    role?: string;
    status?: string;
  };

  const userId = reqParam(req, 'id');
  const isSelf = userId === currentUserId;

  if (body.role !== undefined && !MANAGEABLE_ROLES.includes(body.role as Role)) {
    throw new HttpError(400, 'Role must be tenant_admin or standard_user');
  }

  if (isSelf && (body.role !== undefined || body.status !== undefined)) {
    throw new HttpError(400, 'You cannot change your own role or status');
  }

  const existing = await usersRepo.findUserById(userId);
  if (!isManageableUser(existing, tenantId)) {
    throw new HttpError(404, 'User not found');
  }

  const updates: UpdateUserInput = {};
  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.role !== undefined) updates.role = body.role;
  if (body.status !== undefined) updates.status = body.status;

  const user = await usersRepo.updateUser(userId, updates);
  res.json({ user: usersRepo.toPublicUser(user) });
}));

export default router;
