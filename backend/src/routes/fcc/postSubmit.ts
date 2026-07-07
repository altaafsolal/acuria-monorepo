import { Router } from 'express';
import { asyncHandler } from '../../utils/index.js';
import { webhookUrl, postOptionalWebhook } from '../../services/make/http.js';

const router = Router({ mergeParams: true });

// Public — no auth (clients fill this form without login)
router.post('/submit', asyncHandler(async (req, res) => {
  const payload = req.body as Record<string, unknown>;

  await postOptionalWebhook(
    webhookUrl('webhookFcc'),
    payload,
    'FCC form submission',
  );

  res.json({ ok: true });
}));

export default router;
