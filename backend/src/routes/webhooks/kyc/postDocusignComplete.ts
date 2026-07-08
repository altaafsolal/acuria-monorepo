import { Router } from 'express';
import { requireWebhookSecret } from '../../../middleware/index.js';
import { clientsRepo } from '../../../services/baserow/index.js';
import { asyncHandler, HttpError } from '../../../utils/index.js';

const router = Router({ mergeParams: true });

router.use(requireWebhookSecret);

/**
 * POST /api/webhooks/kyc/docusign-complete
 * Called by Make Scénario 5 (DER → DocuSign) on completion.
 * Sets der_statut, der_date, ldm_statut, ldm_date on the client row.
 *
 * Expected body from Make: { record_id, tenant_id }
 */
router.post('/docusign-complete', asyncHandler(async (req, res) => {
  const { record_id, tenant_id } = req.body as { record_id?: string; tenant_id?: string };

  if (!record_id || !tenant_id) {
    throw new HttpError(400, 'record_id and tenant_id are required');
  }

  const today = new Date().toISOString().split('T')[0];

  const updated = await clientsRepo.patchClientKycFields(tenant_id, record_id, {
    der_statut: 'Envoyé',
    der_date: today,
    ldm_statut: 'Envoyé',
    ldm_date: today,
  });

  res.json({ success: true, client: updated ? clientsRepo.toPublicClient(updated) : null });
}));

export default router;
