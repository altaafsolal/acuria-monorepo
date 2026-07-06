import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/index.js';
import { baserow, userGestionnaireService } from '../../services/index.js';
import { asyncHandler, HttpError, requireTenant, reqParam } from '../../utils/index.js';
import type { GestionnaireUserInput, Role } from '../../types/domain.js';
import { isManageableUser, MANAGEABLE_ROLES } from './helpers.js';

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
    email?: string;
    role?: string;
    status?: string;
    gestionnaire?: GestionnaireUserInput;
  };

  const userId = reqParam(req, 'id');
  const isSelf = userId === currentUserId;

  if (body.role !== undefined && !MANAGEABLE_ROLES.includes(body.role as Role)) {
    throw new HttpError(400, 'Role must be tenant_admin or standard_user');
  }

  if (isSelf && (body.role !== undefined || body.status !== undefined)) {
    throw new HttpError(400, 'You cannot change your own role or status');
  }

  const existing = await baserow.usersRepo.findUserById(userId);
  if (!isManageableUser(existing, tenantId)) {
    throw new HttpError(404, 'User not found');
  }

  try {
    const result = await userGestionnaireService.updateManagedUser(
      tenantId,
      userId,
      body,
      { isSelf },
    );
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update user';
    if (message === 'User not found') {
      throw new HttpError(404, message);
    }
    if (message === 'Un e-mail est requis pour enregistrer cet utilisateur') {
      throw new HttpError(400, message);
    }
    if (message === 'A user with this email already exists') {
      throw new HttpError(409, message);
    }
    if (message === 'You cannot change your own role or status') {
      throw new HttpError(400, message);
    }
    throw error;
  }
}));

export default router;
