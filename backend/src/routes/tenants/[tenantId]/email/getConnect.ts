import { Router } from 'express';
import { env } from '../../../../config/env.js';
import { authenticate } from '../../../../middleware/index.js';
import { buildAuthorizeUrl, createState, NONCE_COOKIE_NAME } from '../../../../services/email/oauth.js';
import { asyncHandler, HttpError, reqParam } from '../../../../utils/index.js';
import type { EmailProvider } from '../../../../types/domain.js';
import { assertTenantAdminFor } from './_guard.js';

const NONCE_TTL_MS = 10 * 60 * 1000;

const router = Router({ mergeParams: true });

/**
 * Step 1 — mint the provider's authorize URL for this tenant.
 *
 * Returns JSON, not a 302 (same reason as SharePoint: the SPA holds its bearer
 * token in localStorage, so it can't navigate the browser straight to an
 * authenticated endpoint). The frontend does `window.location = authorizeUrl`.
 *
 * `?provider=microsoft|google` picks the mailbox provider. The nonce cookie is the
 * CSRF half of the check; the signed state (which also carries the provider) is the
 * other half.
 */
router.get('/connect', authenticate, asyncHandler(async (req, res) => {
  const tenantId = reqParam(req, 'tenantId');
  assertTenantAdminFor(req, tenantId);

  const provider = req.query.provider;
  if (provider !== 'microsoft' && provider !== 'google') {
    throw new HttpError(400, "Query param 'provider' must be 'microsoft' or 'google'");
  }

  const { state, nonce } = createState(tenantId, req.user!.id, provider as EmailProvider);

  res.cookie(NONCE_COOKIE_NAME, nonce, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: env.isProduction ? 'none' : 'lax',
    maxAge: NONCE_TTL_MS,
    path: '/api/oauth',
  });

  res.json({ authorizeUrl: buildAuthorizeUrl(provider as EmailProvider, state) });
}));

export default router;
