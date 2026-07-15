import { Router } from 'express';
import { authenticate, requireRole, requireTenant} from '../../middleware/index.js';
import * as fccClientsRepo from '../../services/baserow/fcc-clients.js';
import { asyncHandler} from '../../utils/index.js';

const router = Router({ mergeParams: true });

router.get('/history', authenticate, requireRole('tenant_admin', 'standard_user'), requireTenant, asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const clientId = typeof req.query.clientId === 'string' ? req.query.clientId : undefined;

  const fccClients = clientId
    ? await fccClientsRepo.listFccClientsByClient(tenantId, clientId)
    : await fccClientsRepo.listAllFccClients(tenantId);

  res.json({ fccClients });
}));

export default router;
