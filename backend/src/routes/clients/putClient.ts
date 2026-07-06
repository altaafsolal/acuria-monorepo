import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/index.js';
import { baserow } from '../../services/index.js';
import { asyncHandler, HttpError, requireTenant, reqParam } from '../../utils/index.js';
import type { UpdateClientInput } from '../../types/domain.js';

const { clientsRepo } = baserow;

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('tenant_admin', 'standard_user'));

router.put('/:id', asyncHandler(async (req, res) => {
  const tenantId = requireTenant(req);
  const body = req.body as UpdateClientInput;
  const client = await clientsRepo.updateClient(tenantId, reqParam(req, 'id'), body);
  if (!client) {
    throw new HttpError(404, 'Client not found');
  }
  res.json({ client: clientsRepo.toPublicClient(client) });
}));

export default router;
