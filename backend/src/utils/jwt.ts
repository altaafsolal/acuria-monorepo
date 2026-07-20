import jwt, { type SignOptions } from 'jsonwebtoken';
import type { CookieOptions } from 'express';
import { env } from '../config/env.js';
import dayjs from './dayjs.js';
import type { DbUser, Role, TokenPayload } from '../types/domain.js';

function parseTokenPayload(decoded: jwt.JwtPayload | string): TokenPayload {
  if (typeof decoded === 'string') {
    throw new Error('Invalid token payload');
  }
  return {
    user_id: String(decoded.user_id),
    email: String(decoded.email),
    name: String(decoded.name),
    role: decoded.role as Role,
  };
}

/** HMAC only — pin the algorithm on both sign and verify so a token can never be
 *  accepted under a different (e.g. `none` or asymmetric) algorithm. */
const JWT_ALGORITHM = 'HS256' as const;

export function signAccessToken(payload: TokenPayload): string {
  const options: SignOptions = {
    expiresIn: env.jwt.accessExpiresIn as SignOptions['expiresIn'],
    algorithm: JWT_ALGORITHM,
  };
  return jwt.sign(payload, env.jwt.accessSecret, options);
}

export function signRefreshToken(payload: TokenPayload): string {
  const options: SignOptions = {
    expiresIn: env.jwt.refreshExpiresIn as SignOptions['expiresIn'],
    algorithm: JWT_ALGORITHM,
  };
  return jwt.sign(payload, env.jwt.refreshSecret, options);
}

export function verifyAccessToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, env.jwt.accessSecret, { algorithms: [JWT_ALGORITHM] });
  return parseTokenPayload(decoded as jwt.JwtPayload | string);
}

export function verifyRefreshToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, env.jwt.refreshSecret, { algorithms: [JWT_ALGORITHM] });
  return parseTokenPayload(decoded as jwt.JwtPayload | string);
}

export const REFRESH_COOKIE_NAME = 'acuria_refresh_token';

export function refreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: env.isProduction ? 'none' : 'lax',
    maxAge: dayjs().add(7, 'day').diff(dayjs()),
    path: '/api/auth',
  };
}

export function buildTokenPayload(user: DbUser): TokenPayload {
  return {
    user_id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as Role,
  };
}
