import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/index.js';
import { baserow } from '../../services/index.js';
import { asyncHandler, HttpError, requireTenant, reqParam } from '../../utils/index.js';
import type { CreateClientInput } from '../../types/domain.js';

const { clientsRepo } = baserow;

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('tenant_admin', 'standard_user'));

router.post('/', asyncHandler(async (req, res) => {
  const tenantId = requireTenant(req);
  const body = req.body as CreateClientInput;

  if (!body?.name?.trim()) {
    throw new HttpError(400, 'Name is required');
  }

  const client = await clientsRepo.createClient(tenantId, {
    ...body,
    name: body.name.trim(),
    email: body.email?.trim() ?? '',
  });
  res.status(201).json({ client: clientsRepo.toPublicClient(client) });
}));

router.post('/:id/archive', asyncHandler(async (req, res) => {
  const tenantId = requireTenant(req);
  const client = await clientsRepo.updateClient(tenantId, reqParam(req, 'id'), {
    statutClient: 'Archivé',
    status: 'archived',
  });
  if (!client) {
    throw new HttpError(404, 'Client not found');
  }
  res.json({ client: clientsRepo.toPublicClient(client) });
}));

export default router;
