import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/index.js';
import { clientsRepo } from '../../services/baserow/index.js';
import { asyncHandler, HttpError, requireTenant, reqParam } from '../../utils/index.js';

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('tenant_admin', 'standard_user'));

router.get('/:id', asyncHandler(async (req, res) => {
  const tenantId = requireTenant(req);
  const client = await clientsRepo.getClientById(tenantId, reqParam(req, 'id'));
  if (!client) {
    throw new HttpError(404, 'Client not found');
  }
  res.json({ client: clientsRepo.toPublicClient(client) });
}));

export default router;
