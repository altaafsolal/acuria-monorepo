import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/index.js';
import { baserow } from '../../services/index.js';
import { asyncHandler, HttpError, requireTenant } from '../../utils/index.js';
import type { CreateClientInput } from '../../types/domain.js';

const { clientsRepo } = baserow;
const { resolveClientDisplayName } = clientsRepo;

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('tenant_admin', 'standard_user'));

router.post('/', asyncHandler(async (req, res) => {
  const tenantId = requireTenant(req);
  const body = req.body as CreateClientInput;

  const name = body.name?.trim() || resolveClientDisplayName({
    name: '',
    client_type: body.clientType || 'PP',
    first_name: body.firstName ?? null,
    last_name: body.lastName ?? null,
    trade_name: body.tradeName ?? null,
    civilite: body.civilite ?? null,
  });

  if (!name) {
    throw new HttpError(400, 'Name is required');
  }

  const client = await clientsRepo.createClient(tenantId, {
    ...body,
    name,
    email: body.email?.trim() ?? '',
  });
  res.status(201).json({ client: clientsRepo.toPublicClient(client) });
}));

export default router;
