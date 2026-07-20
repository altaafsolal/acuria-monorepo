import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';

/** Length-checked constant-time string comparison — avoids leaking the secret
 *  one byte at a time through response timing. */
function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Middleware for inbound webhooks called by Make.com (or other external services).
 * Expects the Authorization header to match WEBHOOK_SECRET.
 * Usage: router.use(requireWebhookSecret);
 */
export function requireWebhookSecret(req: Request, res: Response, next: NextFunction): void {
  const provided = Array.isArray(req.headers['authorization'])
    ? req.headers['authorization'][0] ?? ''
    : req.headers['authorization'] || '';
  const expected = env.webhookSecret;

  if (!expected) {
    console.warn('[webhook] WEBHOOK_SECRET is not set — rejecting inbound webhook');
    res.status(503).json({ error: 'Webhook secret not configured' });
    return;
  }

  if (!timingSafeStringEqual(provided, expected)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
}
