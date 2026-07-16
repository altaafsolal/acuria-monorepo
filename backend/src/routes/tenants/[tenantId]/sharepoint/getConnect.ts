import { Router } from 'express';
import { env } from '../../../../config/env.js';
import { authenticate } from '../../../../middleware/index.js';
import { buildAuthorizeUrl, createState, NONCE_COOKIE_NAME } from '../../../../services/sharepoint/oauth.js';
import { asyncHandler, reqParam } from '../../../../utils/index.js';
import { assertTenantAdminFor } from './_guard.js';

const NONCE_TTL_MS = 10 * 60 * 1000;

const router = Router({ mergeParams: true });

/**
 * Step 1 of the OAuth flow — mint the Microsoft authorize URL for this tenant.
 *
 * Returns JSON rather than a 302 on purpose. The SPA keeps its access token in
 * localStorage, so a `window.location` navigation straight to this endpoint would
 * arrive with no Authorization header and 401. Instead the frontend fetches this
 * normally and then does the top-level navigation itself.
 *
 * The nonce cookie is the CSRF half of the check: the signed state proves WE
 * minted it, the cookie proves it came back to the same browser that asked for it.
 * SameSite=lax is required — the callback arrives as a cross-site top-level GET
 * from Microsoft, which 'strict' would strip the cookie from.
 *
 * (authenticate is attached per-route rather than via router.use — see the note
 * in getStatus.ts.)
 */
router.get('/connect', authenticate, asyncHandler(async (req, res) => {
  const tenantId = reqParam(req, 'tenantId');
  assertTenantAdminFor(req, tenantId);

  const { state, nonce } = createState(tenantId, req.user!.id);

  res.cookie(NONCE_COOKIE_NAME, nonce, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: env.isProduction ? 'none' : 'lax',
    maxAge: NONCE_TTL_MS,
    path: '/api/oauth',
  });

  res.json({ authorizeUrl: buildAuthorizeUrl(state) });
}));

export default router;
