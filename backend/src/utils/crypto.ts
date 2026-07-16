import crypto from 'crypto';
import { env } from '../config/env.js';

/**
 * Symmetric encryption for secrets we must be able to read back — currently the
 * per-tenant Microsoft OAuth tokens stored in Baserow.
 *
 * AES-256-GCM: authenticated, so a tampered ciphertext fails to decrypt rather
 * than silently yielding garbage. A fresh random IV per call means encrypting the
 * same token twice produces different ciphertext.
 *
 * Format: `v1:<ivB64>:<tagB64>:<cipherB64>`. The version prefix exists so a future
 * key rotation or algorithm change can decrypt old values while writing new ones.
 *
 * NOTE: this is deliberately the one place in the backend with no dev fallback.
 * Everything in config/env.ts defaults to a working dev value; a missing
 * encryption key must fail loudly instead of encrypting under a guessable
 * default that would look fine in dev and be worthless in production.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12; // 96-bit IV — the size GCM is specified for
const KEY_BYTES = 32; // AES-256
const VERSION = 'v1';

function getKey(): Buffer {
  const raw = env.tokenEncryptionKey;
  if (!raw) {
    throw new Error(
      'TOKEN_ENCRYPTION_KEY is not set. Generate one with: '
      + 'node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
    );
  }
  if (!/^[0-9a-fA-F]{64}$/.test(raw)) {
    throw new Error(
      `TOKEN_ENCRYPTION_KEY must be ${KEY_BYTES} bytes as 64 hex characters (got ${raw.length} chars).`,
    );
  }
  return Buffer.from(raw, 'hex');
}

export function isEncryptionConfigured(): boolean {
  return /^[0-9a-fA-F]{64}$/.test(env.tokenEncryptionKey);
}

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString('base64'),
    tag.toString('base64'),
    ciphertext.toString('base64'),
  ].join(':');
}

export function decryptSecret(payload: string): string {
  const parts = payload.split(':');
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error('Malformed encrypted value (expected v1:<iv>:<tag>:<ciphertext>)');
  }
  const [, ivB64, tagB64, cipherB64] = parts;
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(cipherB64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}
