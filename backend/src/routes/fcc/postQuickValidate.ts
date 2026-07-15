import { Router } from 'express';
import { authenticate, requireRole, requireTenant} from '../../middleware/index.js';
import * as fccClientsRepo from '../../services/baserow/fcc-clients.js';
import * as clientsRepo from '../../services/baserow/clients.js';
import { asyncHandler, HttpError} from '../../utils/index.js';

const router = Router({ mergeParams: true });

// Mark an FCC client dossier as validated and update client FCC status to Signé
router.post('/quick-validate', authenticate, requireRole('tenant_admin', 'standard_user'), requireTenant, asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const { fccClientId, clientId } = req.body as { fccClientId?: string; clientId?: string };

  if (!fccClientId && !clientId) {
    throw new HttpError(400, 'fccClientId or clientId is required');
  }

  // Update FCC dossier status
  if (fccClientId) {
    await fccClientsRepo.updateFccClientStatus(tenantId, fccClientId, 'Signé');
  }

  // Update client FCC status
  if (clientId) {
    const client = await clientsRepo.getClientById(tenantId, clientId);
    if (!client) throw new HttpError(404, 'Client not found');

    const updated = await clientsRepo.patchClientKycFields(tenantId, clientId, {
      fcc_statut: 'Signé',
      fcc_date: client.fcc_date || new Date().toISOString().split('T')[0],
    });

    // If no fccClientId provided, find latest FCC dossier for this client
    if (!fccClientId) {
      const fccClients = await fccClientsRepo.listFccClientsByClient(tenantId, clientId).catch(() => []);
      if (fccClients.length > 0) {
        const latest = fccClients[fccClients.length - 1];
        await fccClientsRepo.updateFccClientStatus(tenantId, latest.id, 'Signé').catch(() => undefined);
      }
    }

    res.json({ client: clientsRepo.toPublicClient(updated!) });
    return;
  }

  res.json({ ok: true });
}));

export default router;
