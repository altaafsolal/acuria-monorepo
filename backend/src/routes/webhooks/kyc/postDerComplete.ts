import { Router } from 'express';
import { requireWebhookSecret } from '../../../middleware/index.js';
import { asyncHandler } from '../../../utils/index.js';

const router = Router({ mergeParams: true });

router.use(requireWebhookSecret);

/**
 * POST /api/webhooks/kyc/der-complete
 * Called by Make Scénario 6 (DER → Google Docs PDF → email) on completion.
 * Logs and echoes the received payload for inspection during setup.
 */
router.post('/der-complete', asyncHandler(async (req, res) => {
  const body = req.body as Record<string, unknown>;

  console.log('[webhook] kyc/der-complete received:', JSON.stringify(body, null, 2));

  res.json({ received: true, body });
}));

export default router;
