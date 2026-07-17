import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { usersRepo, tenantsRepo } from './baserow/index.js';
import { sendOtpEmail, sendPasswordSetEmail } from './make/index.js';
import type { DbUser } from '../types/domain.js';

type TenantContext = { id: string; name: string; email: string };

const { hasUserEmail } = usersRepo;

const SET_PASSWORD_TTL_MS = 72 * 60 * 60 * 1000;
const OTP_TTL_MS = 10 * 60 * 1000;
const MIN_PASSWORD_LENGTH = 8;

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function randomToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function randomOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function timingSafeEqualHex(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, 'hex');
    const bufB = Buffer.from(b, 'hex');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export function buildSetPasswordLink(uid: string, token: string): string {
  const base = env.appUrl;
  const params = new URLSearchParams({ uid, token });
  return `${base}/set-password?${params.toString()}`;
}

export function validatePasswordPair(password: string, passwordConfirm: string): void {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }
  if (password !== passwordConfirm) {
    throw new Error('Passwords do not match');
  }
}

export async function issueSetPasswordToken(
  user: Pick<DbUser, 'id' | 'email' | 'name'>,
  tenant?: TenantContext,
): Promise<void> {
  if (!hasUserEmail(user)) {
    throw new Error('User has no email address');
  }

  const token = randomToken();
  const hash = sha256(token);
  const expires = new Date(Date.now() + SET_PASSWORD_TTL_MS).toISOString();

  await usersRepo.updateUser(user.id, {
    reset_token_hash: hash,
    reset_token_expires: expires,
    otp_hash: '',
    otp_expires: '',
  });

  const link = buildSetPasswordLink(user.id, token);
  await sendPasswordSetEmail(user.email, user.name, link, tenant?.name, tenant?.email, tenant?.id);
}

export async function verifySetPasswordToken(uid: string, rawToken: string): Promise<DbUser> {
  const user = await usersRepo.findUserById(uid);
  if (!user?.reset_token_hash || !user.reset_token_expires) {
    throw new Error('Invalid or expired token');
  }
  if (new Date(user.reset_token_expires).getTime() < Date.now()) {
    throw new Error('Invalid or expired token');
  }
  if (!timingSafeEqualHex(sha256(rawToken), user.reset_token_hash)) {
    throw new Error('Invalid or expired token');
  }
  return user;
}

export async function issueOtp(
  user: Pick<DbUser, 'id' | 'email' | 'name'>,
  tenant?: TenantContext,
): Promise<void> {
  const otp = randomOtp();
  const hash = sha256(otp);
  const expires = new Date(Date.now() + OTP_TTL_MS).toISOString();

  await usersRepo.updateUser(user.id, {
    otp_hash: hash,
    otp_expires: expires,
  });

  await sendOtpEmail(user.email, user.name, otp, tenant?.name, tenant?.email, tenant?.id);
}

export async function verifyOtp(email: string, code: string): Promise<{ uid: string; token: string }> {
  const user = await usersRepo.findUserByEmail(email);
  if (!user?.otp_hash || !user.otp_expires) {
    throw new Error('Invalid or expired OTP');
  }
  if (new Date(user.otp_expires).getTime() < Date.now()) {
    throw new Error('Invalid or expired OTP');
  }
  if (!timingSafeEqualHex(sha256(code.trim()), user.otp_hash)) {
    throw new Error('Invalid or expired OTP');
  }

  const token = randomToken();
  const hash = sha256(token);
  const expires = new Date(Date.now() + SET_PASSWORD_TTL_MS).toISOString();

  await usersRepo.updateUser(user.id, {
    reset_token_hash: hash,
    reset_token_expires: expires,
    otp_hash: '',
    otp_expires: '',
  });

  return { uid: user.id, token };
}

export async function finalizeNewPassword(uid: string, newPassword: string): Promise<DbUser> {
  const password_hash = await bcrypt.hash(newPassword, 10);
  return usersRepo.updateUser(uid, {
    password_hash,
    status: 'active',
    reset_token_hash: '',
    reset_token_expires: '',
    otp_hash: '',
    otp_expires: '',
  });
}

export async function requestPasswordResetOtp(email: string): Promise<void> {
  const user = await usersRepo.findUserByEmail(email);
  if (!user || user.status === 'inactive') return;
  let tenant: TenantContext | undefined;
  if (user.tenant_id) {
    const t = await tenantsRepo.findTenantById(user.tenant_id).catch(() => null);
    if (t) tenant = { id: t.id, name: t.branding_name || t.name, email: t.email || '' };
  }
  await issueOtp(user, tenant);
}
