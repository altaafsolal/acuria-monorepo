import { Router } from 'express';
import { requireWebhookSecret } from '../../../../middleware/index.js';
import { getValidAccessToken } from '../../../../services/sharepoint/oauth.js';
import { asyncHandler, HttpError, reqParam } from '../../../../utils/index.js';

const router = Router({ mergeParams: true });

/**
 * Token broker — the endpoint Make.com calls before touching Graph.
 *
 * Make holds no Microsoft credentials of its own. It asks us for a ready-to-use
 * access token plus the tenant's site/drive, then makes its own Graph calls:
 *   PUT /sites/{site_id}/drive/root:/{path}:/content
 *   Authorization: Bearer {access_token}
 *
 * Auth is the shared Make secret rather than a user session — there is no user
 * present when a scenario runs. This reuses the same WEBHOOK_SECRET that guards
 * every other Make ↔ platform call; it is the same trust boundary.
 *
 * Failures return a stable `code` so a scenario can branch to an error path
 * instead of failing silently:
 *   409 SHAREPOINT_NOT_CONNECTED    — never connected, or no site/drive chosen
 *   409 SHAREPOINT_REAUTH_REQUIRED  — refresh token dead; a tenant admin must reconnect
 *
 * requireWebhookSecret is attached per-route rather than via router.use(): every
 * verb file in this folder shares one router, so a router.use() would also demand
 * the Make secret on the user-facing sibling routes.
 */
router.get('/token', requireWebhookSecret, asyncHandler(async (req, res) => {
  const tenantId = reqParam(req, 'tenantId').trim();

  if (!tenantId) {
    throw new HttpError(400, 'tenant_id is required', 'TENANT_ID_REQUIRED');
  }

  const token = await getValidAccessToken(tenantId);

  res.json({
    access_token: token.accessToken,
    site_id: token.siteId,
    drive_id: token.driveId,
    expires_at: token.expiresAt,
  });
}));

export default router;
