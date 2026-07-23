import { Router } from 'express';
import { env } from '../../../../config/env.js';
import { requireWebhookSecret } from '../../../../middleware/index.js';
import { getValidEmailToken } from '../../../../services/email/oauth.js';
import { asyncHandler, HttpError, reqParam } from '../../../../utils/index.js';

const router = Router({ mergeParams: true });

/** Sentinel tenant id for platform-level (super admin) emails, which have no tenant.
 *  Callers send this literal instead of an empty id. */
const SUPER_ADMIN_TENANT = 'SUPER_ADMIN';

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
 * A tenant with no provider connected falls back to the platform (Super-Admin)
 * account, so there is no "not connected" error path here.
 *
 * 409 codes let a scenario branch to an error path instead of failing silently:
 *   EMAIL_SCOPE_MISSING    — Microsoft grant lacks Mail.Send (reconnect needed)
 *   EMAIL_REAUTH_REQUIRED  — refresh token dead; a tenant admin must reconnect
 *
 * requireWebhookSecret is per-route (not router.use) — the sibling user-facing
 * routes in this folder use Bearer auth, and one shared router mounts them all.
 */
router.get('/token', requireWebhookSecret, asyncHandler(async (req, res) => {
  const tenantId = reqParam(req, 'tenantId').trim();

  if (!tenantId) {
    // A caller sending an empty id (…/tenants//email/token) — usually a platform
    // email that has no tenant. It must send the SUPER_ADMIN sentinel instead.
    throw new HttpError(400, "tenant_id is required (use 'SUPER_ADMIN' for platform emails)", 'TENANT_ID_REQUIRED');
  }

  // Platform-level (super admin) email: there is no tenant mailbox to broker. Signal
  // Make to route to its own platform account by returning the Super-Admin provider.
  if (tenantId === SUPER_ADMIN_TENANT) {
    res.json({
      provider: 'Super-Admin',
      access_token: '',
      sender_address: env.superAdmin.email,
      expires_at: '',
    });
    return;
  }

  const token = await getValidEmailToken(tenantId);

  res.json({
    provider: token.provider || "Super-Admin",
    access_token: token.accessToken,
    sender_address: token.senderAddress,
    expires_at: token.expiresAt,
  });
}));

export default router;
