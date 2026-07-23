/**
 * Per-tenant transactional email OAuth — Microsoft 365 (Graph Mail.Send) OR Gmail
 * (Gmail API gmail.send).
 *
 * This mirrors services/sharepoint/oauth.ts (read that first). The extra dimension
 * here is the PROVIDER: every function branches on 'microsoft' | 'google'. The two
 * providers differ in three ways that matter:
 *   1. Endpoints + which client credentials to use (Azure app vs Google client).
 *   2. Microsoft returns a `tid` (the customer's tenant id) we use for refreshes;
 *      Google has no such concept.
 *   3. Refresh-token rotation: Microsoft may rotate on refresh (persist whatever
 *      comes back); Google keeps the same refresh token (and only returns one on
 *      the FIRST consent — hence access_type=offline + prompt=consent).
 *
 * Both providers redirect to ONE callback (env.emailRedirectUri); the signed state
 * carries which provider it was, so the callback knows which token exchange to run.
 * Register that same URL on both the Azure app and the Google OAuth client.
 *
 * Sender address + Microsoft `tid` are read from the OpenID `id_token` returned in
 * the token response (we request `openid email`), NOT from a follow-up Graph/Gmail
 * profile call. That avoids needing an extra read scope (User.Read / gmail.readonly)
 * on top of the send scope — least privilege, and the send scope alone would not
 * authorize a profile lookup anyway.
 *
 * SECURITY: tokens are AES-256-GCM encrypted before they touch Baserow; nothing
 * here logs a token, an auth code, or a client secret.
 */
import crypto from 'crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import {
  env,
  isGoogleEmailConfigured,
  isMicrosoftEmailConfigured,
} from '../../config/env.js';

/** Fallback for tenants that have not connected their own mailbox yet: send from the
 *  platform (super-admin) account. Make routes on the 'Super-Admin' provider to its
 *  own platform email, so no brokered access token is needed here. */
const SUPER_ADMIN_EMAIL_TOKEN: BrokeredEmailToken = {
  provider: 'Super-Admin',
  accessToken: '',
  senderAddress: env.superAdmin.email,
  expiresAt: '',
};
import * as tenantsRepo from '../baserow/tenants.js';
import { decryptSecret, encryptSecret, isEncryptionConfigured } from '../../utils/crypto.js';
import { HttpError } from '../../utils/http.js';
import type { EmailProvider } from '../../types/domain.js';

const MS_AUTHORITY = 'https://login.microsoftonline.com';
const GOOGLE_AUTHORIZE = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token';

// openid+email → the id_token carries the sender address (and `tid` for Microsoft),
// so we never need a separate read scope. offline_access/access_type=offline → a
// refresh token. The send scope is the only sensitive one.
const MS_SCOPES = 'openid email offline_access https://graph.microsoft.com/Mail.Send';
const GOOGLE_SCOPES = 'openid email https://www.googleapis.com/auth/gmail.send';

const STATE_PURPOSE = 'email_oauth';
const STATE_TTL = '10m';
export const NONCE_COOKIE_NAME = 'acuria_email_oauth_nonce';

const EXPIRY_BUFFER_MS = 120_000;

export const ERR_REAUTH_REQUIRED = 'EMAIL_REAUTH_REQUIRED';
export const ERR_SCOPE_MISSING = 'EMAIL_SCOPE_MISSING';

const MS_MAIL_SEND_SCOPE = 'mail.send';

export interface EmailOAuthState {
  tenantId: string;
  userId: string;
  provider: EmailProvider;
  nonce: string;
}

export interface EmailTokenSet {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  msTenantId: string;
  scopes: string;
  senderAddress: string;
}

export interface BrokeredEmailToken {
  provider: EmailProvider;
  accessToken: string;
  senderAddress: string;
  expiresAt: string;
}

function assertProviderConfigured(provider: EmailProvider): void {
  if (!isEncryptionConfigured()) {
    throw new HttpError(503, 'Email integration is not configured (TOKEN_ENCRYPTION_KEY).');
  }
  if (provider === 'microsoft' && !isMicrosoftEmailConfigured()) {
    throw new HttpError(503, 'Microsoft email is not configured on this server (AZURE_CLIENT_ID / AZURE_CLIENT_SECRET).');
  }
  if (provider === 'google' && !isGoogleEmailConfigured()) {
    throw new HttpError(503, 'Gmail is not configured on this server (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).');
  }
}

// ── State (identical shape to SharePoint, plus `provider`) ────────────────────

export function createState(
  tenantId: string,
  userId: string,
  provider: EmailProvider,
): { state: string; nonce: string } {
  const nonce = crypto.randomBytes(16).toString('hex');
  const options: SignOptions = { expiresIn: STATE_TTL };
  const state = jwt.sign(
    { purpose: STATE_PURPOSE, tenantId, userId, provider, nonce },
    env.jwt.accessSecret,
    options,
  );
  return { state, nonce };
}

export function verifyState(state: string): EmailOAuthState {
  const decoded = jwt.verify(state, env.jwt.accessSecret);
  if (typeof decoded === 'string' || decoded.purpose !== STATE_PURPOSE) {
    throw new Error('Invalid state purpose');
  }
  const provider = decoded.provider === 'microsoft' || decoded.provider === 'google'
    ? decoded.provider
    : null;
  if (!provider) throw new Error('Invalid state provider');
  return {
    tenantId: String(decoded.tenantId),
    userId: String(decoded.userId),
    provider,
    nonce: String(decoded.nonce),
  };
}

export function buildAuthorizeUrl(provider: EmailProvider, state: string): string {
  assertProviderConfigured(provider);

  if (provider === 'microsoft') {
    const params = new URLSearchParams({
      client_id: env.azure.clientId,
      response_type: 'code',
      response_mode: 'query',
      redirect_uri: env.emailRedirectUri,
      scope: MS_SCOPES,
      prompt: 'select_account',
      state,
    });
    return `${MS_AUTHORITY}/common/oauth2/v2.0/authorize?${params.toString()}`;
  }

  // Google. access_type=offline + prompt=consent are BOTH required to reliably get
  // a refresh token — without prompt=consent, Google omits the refresh token on any
  // re-authorization of an already-consented account.
  const params = new URLSearchParams({
    client_id: env.google.clientId,
    response_type: 'code',
    redirect_uri: env.emailRedirectUri,
    scope: GOOGLE_SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  return `${GOOGLE_AUTHORIZE}?${params.toString()}`;
}

// ── Token endpoint ────────────────────────────────────────────────────────────

interface OAuthTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  id_token?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

function expiresAtFrom(expiresIn: number | undefined): string {
  return new Date(Date.now() + (expiresIn ?? 3600) * 1000).toISOString();
}

/** Reads claims from an id_token without verifying the signature — safe because it
 *  arrived directly from the provider over TLS in response to our own request. */
function readIdTokenClaims(idToken: string | undefined): { email: string; tid: string } {
  if (!idToken) return { email: '', tid: '' };
  const payload = idToken.split('.')[1];
  if (!payload) return { email: '', tid: '' };
  try {
    const json = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      email?: string;
      preferred_username?: string;
      tid?: string;
    };
    return {
      email: json.email || json.preferred_username || '',
      tid: json.tid || '',
    };
  } catch {
    return { email: '', tid: '' };
  }
}

function tokenEndpoint(provider: EmailProvider, msTenantId = 'common'): string {
  return provider === 'microsoft'
    ? `${MS_AUTHORITY}/${msTenantId}/oauth2/v2.0/token`
    : GOOGLE_TOKEN;
}

function clientCreds(provider: EmailProvider): { id: string; secret: string } {
  return provider === 'microsoft'
    ? { id: env.azure.clientId, secret: env.azure.clientSecret }
    : { id: env.google.clientId, secret: env.google.clientSecret };
}

async function callTokenEndpoint(url: string, body: URLSearchParams): Promise<OAuthTokenResponse> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await res.json() as OAuthTokenResponse;
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || `Token endpoint returned ${res.status}`);
  }
  return data;
}

export async function exchangeCodeForTokens(
  provider: EmailProvider,
  code: string,
): Promise<EmailTokenSet> {
  assertProviderConfigured(provider);
  const creds = clientCreds(provider);
  const data = await callTokenEndpoint(tokenEndpoint(provider), new URLSearchParams({
    client_id: creds.id,
    client_secret: creds.secret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: env.emailRedirectUri,
    scope: provider === 'microsoft' ? MS_SCOPES : GOOGLE_SCOPES,
  }));

  if (!data.refresh_token) {
    throw new Error(
      provider === 'google'
        ? 'Google did not return a refresh token — ensure access_type=offline and prompt=consent.'
        : 'Microsoft did not return a refresh token — is offline_access granted?',
    );
  }

  const claims = readIdTokenClaims(data.id_token);
  return {
    accessToken: data.access_token!,
    refreshToken: data.refresh_token,
    expiresAt: expiresAtFrom(data.expires_in),
    msTenantId: claims.tid,
    scopes: data.scope || '',
    senderAddress: claims.email,
  };
}

export async function refreshTokens(
  provider: EmailProvider,
  refreshToken: string,
  msTenantId: string,
): Promise<EmailTokenSet> {
  assertProviderConfigured(provider);
  const creds = clientCreds(provider);
  const data = await callTokenEndpoint(
    tokenEndpoint(provider, provider === 'microsoft' ? (msTenantId || 'common') : undefined),
    new URLSearchParams({
      client_id: creds.id,
      client_secret: creds.secret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      scope: provider === 'microsoft' ? MS_SCOPES : GOOGLE_SCOPES,
    }),
  );

  const claims = readIdTokenClaims(data.id_token);
  return {
    accessToken: data.access_token!,
    // Microsoft rotates; Google usually omits refresh_token on refresh. Persist the
    // new one if present, otherwise keep the existing.
    refreshToken: data.refresh_token || refreshToken,
    expiresAt: expiresAtFrom(data.expires_in),
    msTenantId: claims.tid || msTenantId,
    scopes: data.scope || '',
    senderAddress: claims.email,
  };
}

// ── Persistence ─────────────────────────────────────────────────────────────

export async function storeConnection(
  tenantId: string,
  provider: EmailProvider,
  tokens: EmailTokenSet,
  connectedBy: string,
): Promise<void> {
  await tenantsRepo.patchTenantEmail(tenantId, {
    provider,
    accessToken: encryptSecret(tokens.accessToken),
    refreshToken: encryptSecret(tokens.refreshToken),
    tokenExpiresAt: tokens.expiresAt,
    msTenantId: tokens.msTenantId,
    senderAddress: tokens.senderAddress,
    scopesGranted: tokens.scopes,
    connectedAt: new Date().toISOString(),
    connectedBy,
  });
}

// ── Token broker ────────────────────────────────────────────────────────────

const inFlightRefreshes = new Map<string, Promise<EmailTokenSet>>();

export async function getValidEmailToken(tenantId: string): Promise<BrokeredEmailToken> {
  if (!isEncryptionConfigured()) {
    throw new HttpError(503, 'Email integration is not configured (TOKEN_ENCRYPTION_KEY).');
  }

  const tenant = await tenantsRepo.findTenantById(tenantId);
  if (!tenant) throw new HttpError(404, 'Tenant not found');

  const provider = tenant.email_provider;
  if (!provider || provider === 'Super-Admin' || !tenant.email_refresh_token) {
    // No mailbox connected for this tenant yet — fall back to the platform
    // (super-admin) account instead of failing the send.
    return SUPER_ADMIN_EMAIL_TOKEN;
  }

  // A Microsoft grant that predates the email feature (SharePoint-only) lacks
  // Mail.Send — sending would 403. Surface it distinctly so the UI prompts re-consent.
  if (
    provider === 'microsoft'
    && !(tenant.email_scopes_granted || '').toLowerCase().includes(MS_MAIL_SEND_SCOPE)
  ) {
    throw new HttpError(
      409,
      'The Microsoft connection is missing the Mail.Send permission — a tenant admin must reconnect.',
      ERR_SCOPE_MISSING,
    );
  }

  const expiresAt = tenant.email_token_expires_at;
  const stillValid = Boolean(
    tenant.email_access_token
    && expiresAt
    && new Date(expiresAt).getTime() - Date.now() > EXPIRY_BUFFER_MS,
  );

  if (stillValid) {
    return {
      provider,
      accessToken: decryptSecret(tenant.email_access_token!),
      senderAddress: tenant.email_sender_address || '',
      expiresAt: expiresAt!,
    };
  }

  const tokens = await refreshForTenant(
    tenantId,
    provider,
    tenant.email_refresh_token,
    tenant.email_ms_tenant_id ?? '',
  );

  return {
    provider,
    accessToken: tokens.accessToken,
    senderAddress: tokens.senderAddress || tenant.email_sender_address || '',
    expiresAt: tokens.expiresAt,
  };
}

function refreshForTenant(
  tenantId: string,
  provider: EmailProvider,
  encryptedRefreshToken: string,
  msTenantId: string,
): Promise<EmailTokenSet> {
  const existing = inFlightRefreshes.get(tenantId);
  if (existing) return existing;

  const promise = (async (): Promise<EmailTokenSet> => {
    let tokens: EmailTokenSet;
    try {
      tokens = await refreshTokens(provider, decryptSecret(encryptedRefreshToken), msTenantId);
    } catch (error) {
      // Refresh token is dead (revoked / expired / app removed). Null the tokens so
      // the connection reads as disconnected and the admin is re-prompted; keep the
      // provider + sender for display context.
      await tenantsRepo.patchTenantEmail(tenantId, {
        accessToken: '',
        refreshToken: '',
        tokenExpiresAt: '',
      }).catch(() => undefined);
      console.error(
        `[email] refresh failed for tenant ${tenantId} (${provider}):`,
        error instanceof Error ? error.message : 'unknown error',
      );
      throw new HttpError(
        409,
        'The email connection has expired or been revoked. A tenant admin must reconnect.',
        ERR_REAUTH_REQUIRED,
      );
    }

    await tenantsRepo.patchTenantEmail(tenantId, {
      accessToken: encryptSecret(tokens.accessToken),
      refreshToken: encryptSecret(tokens.refreshToken),
      tokenExpiresAt: tokens.expiresAt,
      msTenantId: tokens.msTenantId,
      // Google refresh responses may omit scope; only overwrite when present.
      ...(tokens.scopes ? { scopesGranted: tokens.scopes } : {}),
    });

    return tokens;
  })().finally(() => {
    inFlightRefreshes.delete(tenantId);
  });

  inFlightRefreshes.set(tenantId, promise);
  return promise;
}
