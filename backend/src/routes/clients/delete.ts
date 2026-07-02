import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/index.js';
import { baserow } from '../../services/index.js';
import { asyncHandler, HttpError, requireTenant, reqParam } from '../../utils/index.js';

const { clientsRepo } = baserow;

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('tenant_admin', 'standard_user'));

router.delete('/:id', asyncHandler(async (req, res) => {
  const tenantId = requireTenant(req);
  const deleted = await clientsRepo.deleteClient(tenantId, reqParam(req, 'id'));
  if (!deleted) {
    throw new HttpError(404, 'Client not found');
  }
  res.status(204).send();
}));

export default router;
