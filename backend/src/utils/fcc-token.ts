import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

/**
 * Binds a public /fcc/submit call to the tenant + client record the prefill link
 * was actually issued for. The link is generated server-side by an authenticated
 * gestionnaire (`buildFccPrefillLink`); the token travels in the link, comes back
 * with the submission, and is the ONLY source of truth for tenant_id/record_id —
 * the request body's own tenant_id/record_id are never trusted, otherwise anyone
 * could inject FCC dossiers into arbitrary tenants.
 */
const ALGORITHM = 'HS256' as const;
const TTL = '30d';

export interface FccPrefillClaims {
  tenant_id: string;
  record_id: string | null;
}

export function signFccPrefillToken(claims: FccPrefillClaims): string {
  return jwt.sign(
    { tid: claims.tenant_id, rid: claims.record_id ?? '' },
    env.fccPrefillSecret,
    { algorithm: ALGORITHM, expiresIn: TTL },
  );
}

/** Returns the verified claims, or null when the token is missing/invalid/expired. */
export function verifyFccPrefillToken(token: string | null | undefined): FccPrefillClaims | null {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, env.fccPrefillSecret, { algorithms: [ALGORITHM] });
    if (typeof decoded === 'string') return null;
    const tenantId = typeof decoded.tid === 'string' ? decoded.tid : '';
    if (!tenantId) return null;
    const recordId = typeof decoded.rid === 'string' && decoded.rid ? decoded.rid : null;
    return { tenant_id: tenantId, record_id: recordId };
  } catch {
    return null;
  }
}
