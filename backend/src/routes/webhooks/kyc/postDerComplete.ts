import { Router } from 'express';
import { requireWebhookSecret } from '../../../middleware/index.js';
import { clientsRepo } from '../../../services/baserow/index.js';
import { asyncHandler, HttpError } from '../../../utils/index.js';

const router = Router({ mergeParams: true });

router.use(requireWebhookSecret);

/**
 * POST /api/webhooks/kyc/der-complete
 * Called by Make Scénario 6 (DER → Google Docs PDF → email) on completion.
 * Updates der_statut, der_date, der_envoi_timestamp on the client.
 *
 * Expected body from Make: { record_id, tenant_id }
 */
router.post('/der-complete', asyncHandler(async (req, res) => {
  const { record_id, tenant_id } = req.body as { record_id?: string; tenant_id?: string };

  if (!record_id || !tenant_id) {
    throw new HttpError(400, 'record_id and tenant_id are required');
  }

  const today = new Date().toISOString().split('T')[0];
  const updated = await clientsRepo.patchClientKycFields(tenant_id, record_id, {
    der_statut: 'Envoyé',
    der_date: today,
    der_envoi_timestamp: new Date().toISOString(),
  });

  res.json({ success: true, client: updated ? clientsRepo.toPublicClient(updated) : null });
}));

export default router;
