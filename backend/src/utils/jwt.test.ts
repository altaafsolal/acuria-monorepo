import { describe, it, expect } from 'vitest';
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  buildTokenPayload,
  refreshCookieOptions,
  REFRESH_COOKIE_NAME,
} from './jwt.js';
import type { TokenPayload, DbUser } from '../types/domain.js';

const samplePayload: TokenPayload = {
  user_id: '42',
  email: 'test@example.com',
  name: 'Test User',
  role: 'standard_user',
};

const sampleDbUser: DbUser = {
  id: '99',
  email: 'admin@example.com',
  password_hash: 'hashed',
  name: 'Admin User',
  role: 'tenant_admin',
  tenant_id: 'tenant-1',
  status: 'active',
  reset_token_hash: null,
  reset_token_expires: null,
  otp_hash: null,
  otp_expires: null,
  created_on: null,
  updated_on: null,
  airtable_record_id: null,
};

describe('signAccessToken', () => {
  it('produces a valid JWT string', () => {
    const token = signAccessToken(samplePayload);
    expect(typeof token).toBe('string');
    const parts = token.split('.');
    expect(parts).toHaveLength(3);
  });
});

describe('verifyAccessToken', () => {
  it('round-trips correctly', () => {
    const token = signAccessToken(samplePayload);
    const result = verifyAccessToken(token);
    expect(result.user_id).toBe(samplePayload.user_id);
    expect(result.email).toBe(samplePayload.email);
    expect(result.name).toBe(samplePayload.name);
    expect(result.role).toBe(samplePayload.role);
  });

  it('throws for invalid token', () => {
    expect(() => verifyAccessToken('not.a.valid.token')).toThrow();
  });
});

describe('verifyRefreshToken', () => {
  it('throws when given an access token (wrong secret)', () => {
    const accessToken = signAccessToken(samplePayload);
    expect(() => verifyRefreshToken(accessToken)).toThrow();
  });
});

describe('signRefreshToken + verifyRefreshToken', () => {
  it('round-trips correctly', () => {
    const token = signRefreshToken(samplePayload);
    const result = verifyRefreshToken(token);
    expect(result.user_id).toBe(samplePayload.user_id);
    expect(result.email).toBe(samplePayload.email);
    expect(result.name).toBe(samplePayload.name);
    expect(result.role).toBe(samplePayload.role);
  });
});

describe('buildTokenPayload', () => {
  it('maps DbUser fields correctly', () => {
    const payload = buildTokenPayload(sampleDbUser);
    expect(payload.user_id).toBe(sampleDbUser.id);
    expect(payload.email).toBe(sampleDbUser.email);
    expect(payload.name).toBe(sampleDbUser.name);
    expect(payload.role).toBe(sampleDbUser.role);
  });
});

describe('refreshCookieOptions', () => {
  it('returns httpOnly:true, sameSite:lax, correct path, and positive maxAge', () => {
    const opts = refreshCookieOptions();
    expect(opts.httpOnly).toBe(true);
    expect(opts.sameSite).toBe('lax');
    expect(opts.path).toBe('/api/auth');
    expect(typeof opts.maxAge).toBe('number');
    expect(opts.maxAge).toBeGreaterThan(0);
  });
});

describe('REFRESH_COOKIE_NAME', () => {
  it("equals 'acuria_refresh_token'", () => {
    expect(REFRESH_COOKIE_NAME).toBe('acuria_refresh_token');
  });
});
