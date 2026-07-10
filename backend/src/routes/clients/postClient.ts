import { Router } from 'express';
import { authenticate, requireRole, requireTenant} from '../../middleware/index.js';
import { clientsRepo, clientMapper } from '../../services/baserow/index.js';
import { asyncHandler, HttpError} from '../../utils/index.js';
import type { CreateClientInput } from '../../types/domain.js';

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('tenant_admin', 'standard_user'), requireTenant);

router.post('/', asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const body = req.body as CreateClientInput;

  const name = body.name?.trim() || clientMapper.resolveClientDisplayName({
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
