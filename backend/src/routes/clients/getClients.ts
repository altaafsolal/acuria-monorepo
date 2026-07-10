import { Router } from 'express';
import { authenticate, requireRole, requireTenant} from '../../middleware/index.js';
import { clientsRepo } from '../../services/baserow/index.js';
import { asyncHandler} from '../../utils/index.js';

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('tenant_admin', 'standard_user'), requireTenant);

router.get('/', asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const clients = await clientsRepo.listClientsByTenantId(tenantId);
  res.json({ clients: clients.map(clientsRepo.toPublicClient) });
}));

export default router;
