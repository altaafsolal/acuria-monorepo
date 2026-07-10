import { Router } from 'express';
import { authenticate, requireRole, requireTenant} from '../../middleware/index.js';
import { usersRepo } from '../../services/baserow/index.js';
import { asyncHandler} from '../../utils/index.js';

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('tenant_admin'), requireTenant);

router.get('/', asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const users = usersRepo.excludeSuperAdmins(
    await usersRepo.listUsersByTenantId(tenantId),
  ).map(usersRepo.toPublicUser);
  res.json({ users });
}));

export default router;
