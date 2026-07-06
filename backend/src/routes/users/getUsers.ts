import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/index.js';
import { baserow } from '../../services/index.js';
import { asyncHandler, requireTenant } from '../../utils/index.js';

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

export default router;
