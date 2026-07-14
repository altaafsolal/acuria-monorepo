import { signAccessToken, signRefreshToken } from '../../utils/jwt.js';
import type { Role, TokenPayload } from '../../types/domain.js';

export interface TestUserOptions {
  userId?: string;
  email?: string;
  name?: string;
  role?: Role;
  tenantId?: string;
}

const defaults: Required<TestUserOptions> = {
  userId: '999',
  email: 'test@example.com',
  name: 'Test User',
  role: 'standard_user',
  tenantId: '1',
};

export function makeTokenPayload(opts: TestUserOptions = {}): TokenPayload {
  const o = { ...defaults, ...opts };
  return { user_id: o.userId, email: o.email, name: o.name, role: o.role };
}

export function makeBearerToken(opts: TestUserOptions = {}): string {
  return signAccessToken(makeTokenPayload(opts));
}

export function makeRefreshToken(opts: TestUserOptions = {}): string {
  return signRefreshToken(makeTokenPayload(opts));
}

export function authHeader(opts: TestUserOptions = {}): string {
  return `Bearer ${makeBearerToken(opts)}`;
}
