import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/index.js';
import { baserow } from '../../services/index.js';
import { asyncHandler, HttpError, requireTenant, reqParam } from '../../utils/index.js';
import { isManageableUser } from './helpers.js';

const { usersRepo } = baserow;

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('tenant_admin'));

router.get('/', asyncHandler(async (req, res) => {
  const tenantId = requireTenant(req);
  const users = usersRepo.excludeSuperAdmins(
    await usersRepo.listUsersByTenantId(tenantId),
  ).map(usersRepo.toPublicUser);
  res.json({ users });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const tenantId = requireTenant(req);
  const user = await usersRepo.findUserById(reqParam(req, 'id'));
  if (!isManageableUser(user, tenantId)) {
    throw new HttpError(404, 'User not found');
  }
  res.json({ user: usersRepo.toPublicUser(user) });
}));

export default router;
