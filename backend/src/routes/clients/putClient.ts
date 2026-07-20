import { Router } from 'express';
import { authenticate, requireRole, requireTenant} from '../../middleware/index.js';
import { clientsRepo, clientMapper } from '../../services/baserow/index.js';
import { asyncHandler, HttpError,reqParam } from '../../utils/index.js';
import type { UpdateClientInput } from '../../types/domain.js';

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('tenant_admin', 'standard_user'), requireTenant);

router.put('/:id', asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  // Compliance signature statuses are server-controlled — never accept them here.
  const body = clientMapper.stripWorkflowStatusFields(
    req.body as Record<string, unknown>,
  ) as UpdateClientInput;
  const client = await clientsRepo.updateClient(tenantId, reqParam(req, 'id'), body);
  if (!client) {
    throw new HttpError(404, 'Client not found');
  }
  res.json({ client: clientsRepo.toPublicClient(client) });
}));

export default router;
