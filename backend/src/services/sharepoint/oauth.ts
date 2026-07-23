/**
 * Per-tenant Microsoft 365 / SharePoint OAuth.
 *
 * WHY THIS EXISTS
 * Every tenant (cabinet) connects their OWN Microsoft 365 org. We hold one
 * multitenant Entra ID app registration; each tenant's admin grants it consent
 * inside their own org, and we store the resulting refresh token against that
 * tenant. Background jobs (Make.com scenarios) can then act on their behalf with
 * no user present, by calling our token broker.
 *
 * THE FLOW
 *   1. Tenant admin hits GET /api/tenants/:id/sharepoint/connect.
 *      We mint an authorize URL with a signed `state` + set a nonce cookie.
 *   2. Browser goes to Microsoft, admin consents.
 *   3. Microsoft redirects to GET /api/oauth/sharepoint/callback?code=…&state=…
 *      We verify state + nonce, swap the code for tokens, resolve their site and
 *      drive from Graph, and store everything (tokens encrypted).
 *   4. Make.com calls GET /api/tenants/:id/sharepoint/token whenever it needs to
 *      upload. We return a valid access token, refreshing first if needed.
 *
 * WHY /common/ THEN /{tid}/
 * The authorize + initial token calls use the `/common/` endpoint because we do
 * not know which Microsoft org the user belongs to until they have signed in.
 * The token response tells us (the `tid` claim), and from then on refreshes go to
 * that org's own endpoint — more precise, and it fails loudly if a token is ever
 * paired with the wrong tenant.
 *
 * SECURITY INVARIANTS
 * - Tokens are AES-256-GCM encrypted before they touch Baserow.
 * - Nothing here ever logs a token, an auth code, or the client secret.
 * - `state` is a signed JWT with its own `purpose` claim, so an access token from
 *   elsewhere in the app cannot be replayed as state.
 */
import crypto from 'crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env, isAzureConfigured } from '../../config/env.js';
import * as tenantsRepo from '../baserow/tenants.js';
import { decryptSecret, encryptSecret, isEncryptionConfigured } from '../../utils/crypto.js';
import { HttpError } from '../../utils/http.js';

const AUTHORITY = 'https://login.microsoftonline.com';
const GRAPH = 'https://graph.microsoft.com/v1.0';

/**
 * Sites.ReadWrite.All is the minimum that actually works here: we need to resolve
 * the org's root site via /sites/root and then write into its document library.
 * Files.ReadWrite.All is NOT a narrower substitute — it covers drive items but not
 * site resolution. offline_access is what gets us a refresh token at all.
 */
const SCOPES = ['https://graph.microsoft.com/Sites.ReadWrite.All', 'offline_access'].join(' ');

const STATE_PURPOSE = 'sharepoint_oauth';
const STATE_TTL = '10m';
export const NONCE_COOKIE_NAME = 'acuria_sp_oauth_nonce';

/** Refresh this far ahead of true expiry, so a token handed to Make.com does not
 *  expire mid-scenario. */
const EXPIRY_BUFFER_MS = 120_000;

export const ERR_NOT_CONNECTED = 'SHAREPOINT_NOT_CONNECTED';
export const ERR_REAUTH_REQUIRED = 'SHAREPOINT_REAUTH_REQUIRED';

export interface OAuthState {
  tenantId: string;
  userId: string;
  nonce: string;
}

export interface TokenSet {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  msTenantId: string;
}

export interface SiteTarget {
  siteId: string;
  siteDisplayName: string;
  driveId: string;
}

function assertConfigured(): void {
  if (!isAzureConfigured()) {
    throw new HttpError(
      503,
      'SharePoint integration is not configured on this server (AZURE_CLIENT_ID / AZURE_CLIENT_SECRET).',
    );
  }
  if (!isEncryptionConfigured()) {
    throw new HttpError(
      503,
      'SharePoint integration is not configured on this server (TOKEN_ENCRYPTION_KEY).',
    );
  }
}

// ── State ───────────────────────────────────────────────────────────────────

/**
 * `state` carries the tenant across the round trip to Microsoft. It MUST be
 * signed: an unsigned tenantId would let anyone attach their own Microsoft
 * account to someone else's tenant by editing the URL.
 *
 * The nonce is returned separately so the caller can also set it as a cookie —
 * signing alone proves we minted the state, the cookie proves it came back in
 * the same browser that started the flow (CSRF).
 */
export function createState(tenantId: string, userId: string): { state: string; nonce: string } {
  const nonce = crypto.randomBytes(16).toString('hex');
  const options: SignOptions = { expiresIn: STATE_TTL };
  const state = jwt.sign(
    { purpose: STATE_PURPOSE, tenantId, userId, nonce },
    env.jwt.accessSecret,
    options,
  );
  return { state, nonce };
}

export function verifyState(state: string): OAuthState {
  const decoded = jwt.verify(state, env.jwt.accessSecret);
  if (typeof decoded === 'string' || decoded.purpose !== STATE_PURPOSE) {
    // Rejects any other token type signed with the same secret (e.g. an access
    // token) being replayed here.
    throw new Error('Invalid state purpose');
  }
  return {
    tenantId: String(decoded.tenantId),
    userId: String(decoded.userId),
    nonce: String(decoded.nonce),
  };
}

export function buildAuthorizeUrl(state: string): string {
  assertConfigured();
  const params = new URLSearchParams({
    client_id: env.azure.clientId,
    response_type: 'code',
    response_mode: 'query',
    redirect_uri: env.azure.redirectUri,
    scope: SCOPES,
    // Forces the account chooser — without it, a signed-in admin silently
    // reconnects the same account and can't switch orgs.
    prompt: 'select_account',
    state,
  });
  return `${AUTHORITY}/common/oauth2/v2.0/authorize?${params.toString()}`;
}

// ── Token endpoint ──────────────────────────────────────────────────────────

interface MsTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  id_token?: string;
  error?: string;
  error_description?: string;
}

function expiresAtFrom(expiresIn: number | undefined): string {
  // Microsoft normally returns ~3600s. Fall back conservatively rather than
  // assuming a long life we can't verify.
  return new Date(Date.now() + (expiresIn ?? 3600) * 1000).toISOString();
}

/** Reads the `tid` (Microsoft tenant id) claim without verifying the signature.
 *  Safe: the token came straight from Microsoft over TLS in a response to our own
 *  authenticated request — we are reading our own data, not trusting a caller. */
function readTidClaim(token: string | undefined): string {
  if (!token) return '';
  const payload = token.split('.')[1];
  if (!payload) return '';
  try {
    const json = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { tid?: string };
    return json.tid ?? '';
  } catch {
    return '';
  }
}

async function callTokenEndpoint(tenantPath: string, body: URLSearchParams): Promise<MsTokenResponse> {
  const res = await fetch(`${AUTHORITY}/${tenantPath}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await res.json() as MsTokenResponse;
  if (!res.ok || !data.access_token) {
    // error_description embeds the AADSTS code; it is safe to surface (no secrets)
    // and is the only practical way to diagnose consent failures.
    throw new Error(data.error_description || data.error || `Microsoft token endpoint returned ${res.status}`);
  }
  return data;
}

export async function exchangeCodeForTokens(code: string): Promise<TokenSet> {
  assertConfigured();
  const data = await callTokenEndpoint('common', new URLSearchParams({
    client_id: env.azure.clientId,
    client_secret: env.azure.clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: env.azure.redirectUri,
    scope: SCOPES,
  }));

  if (!data.refresh_token) {
    throw new Error('Microsoft did not return a refresh token — is offline_access granted on the app registration?');
  }

  return {
    accessToken: data.access_token!,
    refreshToken: data.refresh_token,
    expiresAt: expiresAtFrom(data.expires_in),
    msTenantId: readTidClaim(data.id_token) || readTidClaim(data.access_token),
  };
}

export async function refreshTokens(refreshToken: string, msTenantId: string): Promise<TokenSet> {
  assertConfigured();
  // Use the tenant's own authority once we know it; fall back to /common/ for
  // rows written before tid was captured.
  const data = await callTokenEndpoint(msTenantId || 'common', new URLSearchParams({
    client_id: env.azure.clientId,
    client_secret: env.azure.clientSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    scope: SCOPES,
  }));

  return {
    accessToken: data.access_token!,
    // Microsoft rotates refresh tokens: a response may carry a NEW refresh token,
    // and the old one may stop working. Always persist whatever came back, and
    // only reuse the previous one when the response omits it.
    refreshToken: data.refresh_token || refreshToken,
    expiresAt: expiresAtFrom(data.expires_in),
    msTenantId: readTidClaim(data.access_token) || msTenantId,
  };
}

// ── Microsoft Graph ─────────────────────────────────────────────────────────

/**
 * Resolves the tenant's default SharePoint site and its document library.
 *
 * Graph's host is the same for every org — the access token identifies which
 * tenant we're acting in, which is why there is no tid in these URLs.
 *
 * TODO: a "pick which site / library" UI would list `/sites?search=` and
 * `/sites/{id}/drives` instead of assuming the root site. The schema is already
 * shaped for it: sharepoint_site_id and sharepoint_drive_id are distinct columns
 * and both are independently overridable via PUT /sharepoint/config.
 */
export async function resolveSiteAndDrive(accessToken: string): Promise<SiteTarget> {
  const site = await graphGet<{ id?: string; displayName?: string; name?: string }>(
    `${GRAPH}/sites/root`,
    accessToken,
  );
  if (!site.id) throw new Error('Graph /sites/root returned no site id');

  const drive = await graphGet<{ id?: string }>(
    `${GRAPH}/sites/${site.id}/drive`,
    accessToken,
  );
  if (!drive.id) throw new Error(`Graph /sites/${site.id}/drive returned no drive id`);

  return {
    siteId: site.id,
    siteDisplayName: site.displayName || site.name || '',
    driveId: drive.id,
  };
}

async function graphGet<T>(url: string, accessToken: string): Promise<T> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Graph ${url} failed (${res.status}): ${text.slice(0, 300)}`);
  }
  return await res.json() as T;
}

// ── Persistence ─────────────────────────────────────────────────────────────

export async function storeConnection(
  tenantId: string,
  tokens: TokenSet,
  site: SiteTarget | null,
  connectedBy: string,
): Promise<void> {
  await tenantsRepo.patchTenantSharepoint(tenantId, {
    accessToken: encryptSecret(tokens.accessToken),
    refreshToken: encryptSecret(tokens.refreshToken),
    tokenExpiresAt: tokens.expiresAt,
    msTenantId: tokens.msTenantId,
    connectedAt: new Date().toISOString(),
    connectedBy,
    ...(site
      ? {
        siteId: site.siteId,
        driveId: site.driveId,
        siteDisplayName: site.siteDisplayName,
        // Only "connected" once we know where to write. If site resolution failed
        // the tokens are still stored, but the tenant must supply the ids by hand
        // before anything will upload.
        connected: true,
      }
      : { connected: false }),
  });
}

// ── Token broker ────────────────────────────────────────────────────────────

/**
 * Two Make.com scenarios firing at once would otherwise both see an expired token
 * and both refresh. Since Microsoft rotates refresh tokens, the slower response
 * would overwrite the faster one's rotated token with a now-dead value — breaking
 * the connection until the tenant reconnects by hand. Collapsing concurrent
 * refreshes onto one in-flight promise per tenant avoids that race.
 * (Single-process only; mirrors the JWT cache in services/baserow/api.ts.)
 */
const inFlightRefreshes = new Map<string, Promise<TokenSet>>();

export interface BrokeredToken {
  accessToken: string;
  siteId: string;
  driveId: string;
  expiresAt: string;
}

export async function getValidAccessToken(tenantId: string): Promise<BrokeredToken> {
  assertConfigured();

  const tenant = await tenantsRepo.findTenantById(tenantId);
  if (!tenant) throw new HttpError(404, 'Tenant not found');

  if (!tenant.sharepoint_refresh_token || !tenant.sharepoint_connected) {
    throw new HttpError(
      200,
      "This tenant has not connected SharePoint yet.",
      ERR_NOT_CONNECTED,
    );
  }
  if (!tenant.sharepoint_site_id || !tenant.sharepoint_drive_id) {
    throw new HttpError(
      200,
      "This tenant is connected but no SharePoint site/drive has been selected.",
      ERR_NOT_CONNECTED,
    );
  }

  const expiresAt = tenant.sharepoint_token_expires_at;
  const stillValid = Boolean(
    tenant.sharepoint_access_token
    && expiresAt
    && new Date(expiresAt).getTime() - Date.now() > EXPIRY_BUFFER_MS,
  );

  if (stillValid) {
    return {
      accessToken: decryptSecret(tenant.sharepoint_access_token!),
      siteId: tenant.sharepoint_site_id,
      driveId: tenant.sharepoint_drive_id,
      expiresAt: expiresAt!,
    };
  }

  const tokens = await refreshForTenant(tenantId, tenant.sharepoint_refresh_token, tenant.sharepoint_ms_tenant_id ?? '');

  return {
    accessToken: tokens.accessToken,
    siteId: tenant.sharepoint_site_id,
    driveId: tenant.sharepoint_drive_id,
    expiresAt: tokens.expiresAt,
  };
}

function refreshForTenant(
  tenantId: string,
  encryptedRefreshToken: string,
  msTenantId: string,
): Promise<TokenSet> {
  const existing = inFlightRefreshes.get(tenantId);
  if (existing) return existing;

  const promise = (async (): Promise<TokenSet> => {
    let tokens: TokenSet;
    try {
      tokens = await refreshTokens(decryptSecret(encryptedRefreshToken), msTenantId);
    } catch (error) {
      // The refresh token itself is dead — revoked, expired, or the admin removed
      // our app. Nothing the platform can do without the tenant re-consenting, so
      // mark it disconnected: that re-raises the connect screen for their admin
      // and makes subsequent broker calls fail fast with a clear code.
      await tenantsRepo.patchTenantSharepoint(tenantId, { connected: false }).catch(() => undefined);
      console.error(
        `[sharepoint] refresh failed for tenant ${tenantId}:`,
        error instanceof Error ? error.message : 'unknown error',
      );
      throw new HttpError(
        409,
        'The SharePoint connection has expired or been revoked. A tenant admin must reconnect.',
        ERR_REAUTH_REQUIRED,
      );
    }

    await tenantsRepo.patchTenantSharepoint(tenantId, {
      accessToken: encryptSecret(tokens.accessToken),
      refreshToken: encryptSecret(tokens.refreshToken),
      tokenExpiresAt: tokens.expiresAt,
      msTenantId: tokens.msTenantId,
    });

    return tokens;
  })().finally(() => {
    inFlightRefreshes.delete(tenantId);
  });

  inFlightRefreshes.set(tenantId, promise);
  return promise;
}
