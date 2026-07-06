import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/index.js';
import { baserow, kycService } from '../../services/index.js';
import { asyncHandler, HttpError, requireTenant, reqParam } from '../../utils/index.js';

const { clientsRepo } = baserow;

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('tenant_admin', 'standard_user'));

router.get('/', asyncHandler(async (req, res) => {
  const tenantId = requireTenant(req);
  const clients = await clientsRepo.listClientsByTenantId(tenantId);
  res.json({ clients: clients.map(clientsRepo.toPublicClient) });
}));

router.get('/:id/timeline', asyncHandler(async (req, res) => {
  const tenantId = requireTenant(req);
  const user = req.user!;
  const events = await kycService.getClientTimeline(tenantId, reqParam(req, 'id'), {
    userId: user.id,
    userName: user.name,
    role: user.role,
  });
  res.json({ events });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const tenantId = requireTenant(req);
  const client = await clientsRepo.getClientById(tenantId, reqParam(req, 'id'));
  if (!client) {
    throw new HttpError(404, 'Client not found');
  }
  res.json({ client: clientsRepo.toPublicClient(client) });
}));

export default router;
