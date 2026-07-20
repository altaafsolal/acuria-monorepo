import { Router } from 'express';
import { asyncHandler } from '../../utils/index.js';
import { requireWebhookSecret } from '../../middleware/index.js';
import * as fccClientsRepo from '../../services/baserow/fcc-clients.js';
import * as clientsRepo from '../../services/baserow/clients.js';

const router = Router({ mergeParams: true });

// Server-to-server webhook from Make.com. Guarded by the shared WEBHOOK_SECRET
// (Authorization header) — without it, anyone could forge a "Signé" signature
// status for any client in any tenant by posting a tenant_id + record_id.
// The guard is attached per-route, NOT via router.use(): every fcc/*.ts file is
// mounted at the same /api/fcc base, so a router-level use() would reject the
// other FCC routes too.
// Expected payload: { record_id, tenant_id, envelope_id, status, event }
router.post('/docusign-webhook', requireWebhookSecret, asyncHandler(async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const recordId = typeof body.record_id === 'string' ? body.record_id : null;
  const tenantId = typeof body.tenant_id === 'string' ? body.tenant_id : null;
  const envelopeId = typeof body.envelope_id === 'string' ? body.envelope_id : null;
  const status = typeof body.status === 'string' ? body.status : 'completed';

  if (!tenantId || !recordId) {
    res.status(400).json({ error: 'tenant_id and record_id are required' });
    return;
  }

  try {
    // Map DocuSign status to client FCC statut and FCC dossier statut
    const signed = status === 'completed' || status === 'signed';
    const fccStatut = signed ? 'Signé' : 'DocuSign envoyé';
    const statutDossier = signed ? 'Signé' : 'Envoyé DocuSign';

    // Update the client's FCC status
    await clientsRepo.patchClientKycFields(tenantId, recordId, {
      fcc_statut: fccStatut,
      fcc_date: new Date().toISOString().split('T')[0],
    }).catch(() => undefined);

    // Update matching FCC dossier record
    const fccClients = await fccClientsRepo.listFccClientsByClient(tenantId, recordId).catch(() => []);
    if (fccClients.length > 0) {
      const latest = fccClients[fccClients.length - 1];
      await fccClientsRepo.updateFccClientStatus(
        tenantId,
        latest.id,
        statutDossier,
        envelopeId ?? undefined,
      ).catch(() => undefined);
    }

    res.json({ ok: true, statut: fccStatut });
  } catch (err) {
    console.error('DocuSign webhook error:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal error processing webhook' });
  }
}));

export default router;
