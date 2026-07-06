import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/index.js';
import { baserow } from '../../services/index.js';
import { asyncHandler, requireTenant } from '../../utils/index.js';

const { clientsRepo } = baserow;

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('tenant_admin', 'standard_user'));

router.get('/', asyncHandler(async (req, res) => {
  const tenantId = requireTenant(req);
  const clients = await clientsRepo.listClientsByTenantId(tenantId);
  res.json({ clients: clients.map(clientsRepo.toPublicClient) });
}));

export default router;
