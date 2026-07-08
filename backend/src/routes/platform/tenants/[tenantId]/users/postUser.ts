import { Router } from 'express';
import { authenticate, requireRole } from '../../../../../middleware/index.js';
import { createManagedUser } from '../../../../../services/users/managed.js';
import { asyncHandler, HttpError, reqParam } from '../../../../../utils/index.js';
import type { GestionnaireUserInput, Role } from '../../../../../types/domain.js';

const MANAGEABLE_ROLES: Role[] = ['tenant_admin', 'standard_user'];

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('super_admin'));

router.post('/', asyncHandler(async (req, res) => {
  const tenantId = reqParam(req, 'tenantId');
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
    const result = await createManagedUser(tenantId, {
      name: body.name,
      email: body.email,
      role: body.role,
      gestionnaire: body.gestionnaire,
    });
    res.status(201).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create user';
    if (message === 'Tenant not found') {
      throw new HttpError(404, message);
    }
    if (message === 'A user with this email already exists') {
      throw new HttpError(409, message);
    }
    if (message === 'Email is required') {
      throw new HttpError(400, message);
    }
    if (message === 'Role must be tenant_admin or standard_user') {
      throw new HttpError(400, message);
    }
    throw error;
  }
}));

export default router;
