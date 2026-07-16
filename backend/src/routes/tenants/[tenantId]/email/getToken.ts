import { Router } from 'express';
import { requireWebhookSecret } from '../../../../middleware/index.js';
import { getValidEmailToken } from '../../../../services/email/oauth.js';
import { asyncHandler, reqParam } from '../../../../utils/index.js';

const router = Router({ mergeParams: true });

/**
 * Token broker — the endpoint Make.com calls before sending an email.
 *
 * Make holds no Microsoft/Google credentials. It asks us for a ready-to-use access
 * token plus the provider and sender address, then calls the right send API itself
 * (Graph sendMail or Gmail messages.send). Guarded by the shared WEBHOOK_SECRET,
 * same as the SharePoint broker — there is no user present when a scenario runs.
 *
 * `provider` in the response lets Make's Router branch to the correct send module
 * without a second lookup.
 *
 * 409 codes let a scenario branch to an error path instead of failing silently:
 *   EMAIL_NOT_CONNECTED    — no provider connected
 *   EMAIL_SCOPE_MISSING    — Microsoft grant lacks Mail.Send (reconnect needed)
 *   EMAIL_REAUTH_REQUIRED  — refresh token dead; a tenant admin must reconnect
 *
 * requireWebhookSecret is per-route (not router.use) — the sibling user-facing
 * routes in this folder use Bearer auth, and one shared router mounts them all.
 */
router.get('/token', requireWebhookSecret, asyncHandler(async (req, res) => {
  const tenantId = reqParam(req, 'tenantId');
  const token = await getValidEmailToken(tenantId);

  res.json({
    provider: token.provider,
    access_token: token.accessToken,
    sender_address: token.senderAddress,
    expires_at: token.expiresAt,
  });
}));

export default router;
