import { Router } from 'express';
import { authenticate, requireRole } from '../../../../../middleware/index.js';
import { platformService } from '../../../../../services/index.js';
import { asyncHandler, HttpError, reqParam } from '../../../../../utils/index.js';
import type { Role } from '../../../../../types/domain.js';

const MANAGEABLE_ROLES: Role[] = ['tenant_admin', 'standard_user'];

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('super_admin'));

router.put('/:userId', asyncHandler(async (req, res) => {
  const tenantId = reqParam(req, 'tenantId');
  const userId = reqParam(req, 'userId');
  const body = req.body as {
    name?: string;
    password?: string;
    role?: string;
    status?: string;
  };

  if (body.role !== undefined && !MANAGEABLE_ROLES.includes(body.role as Role)) {
    throw new HttpError(400, 'Role must be tenant_admin or standard_user');
  }

  try {
    const user = await platformService.updateTenantUser(tenantId, userId, body);
    res.json({ user });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update user';
    if (message === 'Tenant not found' || message === 'User not found') {
      throw new HttpError(404, message);
    }
    if (message === 'Role must be tenant_admin or standard_user') {
      throw new HttpError(400, message);
    }
    throw error;
  }
}));

export default router;
