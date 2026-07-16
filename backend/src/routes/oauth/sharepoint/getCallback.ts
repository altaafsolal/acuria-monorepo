import { Router } from 'express';
import { env } from '../../../config/env.js';
import * as usersRepo from '../../../services/baserow/users.js';
import {
  exchangeCodeForTokens,
  NONCE_COOKIE_NAME,
  resolveSiteAndDrive,
  storeConnection,
  verifyState,
} from '../../../services/sharepoint/oauth.js';
import { asyncHandler } from '../../../utils/index.js';

const router = Router({ mergeParams: true });

const RETURN_PATH = '/dashboard/integrations';

/**
 * Step 3 — Microsoft redirects the tenant admin's browser here after consent.
 *
 * Deliberately UNAUTHENTICATED: this is a top-level navigation from Microsoft, so
 * there is no Bearer token to check. Trust comes from two independent facts —
 * the `state` is a JWT we signed (so we minted this flow), and the nonce inside it
 * matches an HttpOnly cookie (so it came back to the browser that started it).
 *
 * Every exit path is a redirect to the SPA carrying a short reason code, never a
 * raw error. The frontend maps the code to a French message.
 */
function redirect(res: import('express').Response, params: Record<string, string>): void {
  const query = new URLSearchParams(params).toString();
  res.redirect(`${env.appUrl}${RETURN_PATH}?${query}`);
}

/** Maps Microsoft's error payload to a code the dashboard can explain.
 *  AADSTS65001 is the common one: the user consented but their org requires an
 *  admin to approve Sites.ReadWrite.All. */
function consentErrorReason(error: string, description: string): string {
  if (error === 'access_denied') return 'consent_denied';
  if (description.includes('AADSTS65001') || description.includes('AADSTS90094')) {
    return 'admin_consent_required';
  }
  return 'microsoft_error';
}

router.get('/callback', asyncHandler(async (req, res) => {
  const nonceCookie = (req.cookies?.[NONCE_COOKIE_NAME] as string | undefined) ?? '';
  // One-shot: clear it however this turns out, so a leaked callback URL can't be
  // replayed later in the same browser.
  res.clearCookie(NONCE_COOKIE_NAME, { path: '/api/oauth' });

  const query = req.query as Record<string, string | undefined>;

  if (query.error) {
    const reason = consentErrorReason(query.error, query.error_description ?? '');
    console.error(`[sharepoint] consent failed: ${query.error} (${reason})`);
    redirect(res, { sharepoint: 'error', reason });
    return;
  }

  const code = query.code;
  const state = query.state;
  if (!code || !state) {
    redirect(res, { sharepoint: 'error', reason: 'invalid_state' });
    return;
  }

  let tenantId: string;
  let userId: string;
  try {
    const parsed = verifyState(state);
    // Signature alone isn't enough — without the cookie comparison an attacker who
    // captured a state value could finish the flow from their own browser.
    if (!nonceCookie || parsed.nonce !== nonceCookie) {
      throw new Error('nonce mismatch');
    }
    tenantId = parsed.tenantId;
    userId = parsed.userId;
  } catch (error) {
    console.error(
      '[sharepoint] state verification failed:',
      error instanceof Error ? error.message : 'unknown error',
    );
    redirect(res, { sharepoint: 'error', reason: 'invalid_state' });
    return;
  }

  let tokens;
  try {
    tokens = await exchangeCodeForTokens(code);
  } catch (error) {
    // Never log or forward the auth code or the response body — assume it may
    // carry token material.
    console.error(
      `[sharepoint] code exchange failed for tenant ${tenantId}:`,
      error instanceof Error ? error.message : 'unknown error',
    );
    redirect(res, { sharepoint: 'error', reason: 'token_exchange_failed' });
    return;
  }

  // Best-effort attribution for the audit trail — a missing user row must not
  // sink an otherwise good connection.
  const user = await usersRepo.findUserById(userId).catch(() => null);
  const connectedBy = user?.email || userId;

  // Resolve where to upload. If this fails we still keep the tokens (they're the
  // expensive part — they cost the admin a consent round trip) and send them to
  // the manual Site/Drive entry form instead of throwing the connection away.
  try {
    const site = await resolveSiteAndDrive(tokens.accessToken);
    await storeConnection(tenantId, tokens, site, connectedBy);
    redirect(res, { sharepoint: 'connected' });
  } catch (error) {
    console.error(
      `[sharepoint] site resolution failed for tenant ${tenantId}:`,
      error instanceof Error ? error.message : 'unknown error',
    );
    await storeConnection(tenantId, tokens, null, connectedBy);
    redirect(res, { sharepoint: 'needs_config' });
  }
}));

export default router;
