import { Router } from 'express';
import { authenticate, requireRole } from '../../../../../middleware/index.js';
import { updateManagedUser } from '../../../../../services/users/managed.js';
import { asyncHandler, HttpError, reqParam } from '../../../../../utils/index.js';
import type { GestionnaireUserInput, Role } from '../../../../../types/domain.js';

const MANAGEABLE_ROLES: Role[] = ['tenant_admin', 'standard_user'];

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('super_admin'));

router.put('/:userId', asyncHandler(async (req, res) => {
  const tenantId = reqParam(req, 'tenantId');
  const userId = reqParam(req, 'userId');
  const body = req.body as {
    name?: string;
    email?: string;
    role?: string;
    status?: string;
    gestionnaire?: GestionnaireUserInput;
  };

  if (body.role !== undefined && !MANAGEABLE_ROLES.includes(body.role as Role)) {
    throw new HttpError(400, 'Role must be tenant_admin or standard_user');
  }

  try {
    const result = await updateManagedUser(tenantId, userId, body);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update user';
    if (message === 'Tenant not found' || message === 'User not found') {
      throw new HttpError(404, message);
    }
    if (message === 'Un e-mail est requis pour enregistrer cet utilisateur') {
      throw new HttpError(400, message);
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

export default router;
