import { Router } from 'express';
import { asyncHandler } from '../../utils/index.js';
import * as fccSubmissionsRepo from '../../services/baserow/fcc-submissions.js';
import * as clientsRepo from '../../services/baserow/clients.js';

const router = Router({ mergeParams: true });

// Public — receives DocuSign webhook from Make.com (no auth required)
// Expected payload: { record_id, tenant_id, envelope_id, status, event }
router.post('/docusign-webhook', asyncHandler(async (req, res) => {
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
    // Map DocuSign status to FCC statut
    const fccStatut = status === 'completed' || status === 'signed' ? 'Signé' : 'DocuSign envoyé';

    // Update the client's FCC status
    await clientsRepo.patchClientKycFields(tenantId, recordId, {
      fcc_statut: fccStatut,
      fcc_date: new Date().toISOString().split('T')[0],
    }).catch(() => undefined);

    // Update matching submission record
    const submissions = await fccSubmissionsRepo.listSubmissionsByClient(tenantId, recordId).catch(() => []);
    if (submissions.length > 0) {
      const latest = submissions[submissions.length - 1];
      await fccSubmissionsRepo.updateSubmissionStatus(
        tenantId,
        latest.id,
        fccStatut,
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
