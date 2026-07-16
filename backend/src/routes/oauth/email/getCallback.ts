import { Router } from 'express';
import { env } from '../../../config/env.js';
import * as usersRepo from '../../../services/baserow/users.js';
import {
  exchangeCodeForTokens,
  NONCE_COOKIE_NAME,
  storeConnection,
  verifyState,
} from '../../../services/email/oauth.js';
import { asyncHandler } from '../../../utils/index.js';

const router = Router({ mergeParams: true });

const RETURN_PATH = '/dashboard/integrations';

/**
 * Both email providers (Microsoft + Google) redirect the admin's browser here after
 * consent. The signed `state` carries which provider it was, so one callback serves
 * both. UNAUTHENTICATED by necessity (top-level redirect, no bearer token); trust
 * comes from the signed state + the nonce cookie.
 *
 * Every exit is a redirect to the SPA with a short reason code, never a raw error.
 */
function redirect(res: import('express').Response, params: Record<string, string>): void {
  const query = new URLSearchParams(params).toString();
  res.redirect(`${env.appUrl}${RETURN_PATH}?${query}`);
}

/** access_denied → user declined; AADSTS65001 (Microsoft) → admin consent required. */
function consentErrorReason(error: string, description: string): string {
  if (error === 'access_denied') return 'consent_denied';
  if (description.includes('AADSTS65001') || description.includes('AADSTS90094')) {
    return 'admin_consent_required';
  }
  return 'provider_error';
}

router.get('/callback', asyncHandler(async (req, res) => {
  const nonceCookie = (req.cookies?.[NONCE_COOKIE_NAME] as string | undefined) ?? '';
  res.clearCookie(NONCE_COOKIE_NAME, { path: '/api/oauth' });

  const query = req.query as Record<string, string | undefined>;

  if (query.error) {
    const reason = consentErrorReason(query.error, query.error_description ?? '');
    console.error(`[email] consent failed: ${query.error} (${reason})`);
    redirect(res, { email: 'error', reason });
    return;
  }

  const code = query.code;
  const state = query.state;
  if (!code || !state) {
    redirect(res, { email: 'error', reason: 'invalid_state' });
    return;
  }

  let tenantId: string;
  let userId: string;
  let provider: 'microsoft' | 'google';
  try {
    const parsed = verifyState(state);
    if (!nonceCookie || parsed.nonce !== nonceCookie) {
      throw new Error('nonce mismatch');
    }
    tenantId = parsed.tenantId;
    userId = parsed.userId;
    provider = parsed.provider;
  } catch (error) {
    console.error(
      '[email] state verification failed:',
      error instanceof Error ? error.message : 'unknown error',
    );
    redirect(res, { email: 'error', reason: 'invalid_state' });
    return;
  }

  let tokens;
  try {
    tokens = await exchangeCodeForTokens(provider, code);
  } catch (error) {
    // Never log the code or the response body — assume it carries token material.
    console.error(
      `[email] code exchange failed for tenant ${tenantId} (${provider}):`,
      error instanceof Error ? error.message : 'unknown error',
    );
    redirect(res, { email: 'error', reason: 'token_exchange_failed' });
    return;
  }

  // Best-effort attribution — a missing user row must not sink a good connection.
  const user = await usersRepo.findUserById(userId).catch(() => null);
  const connectedBy = user?.email || userId;

  await storeConnection(tenantId, provider, tokens, connectedBy);
  redirect(res, { email: 'connected', provider });
}));

export default router;
