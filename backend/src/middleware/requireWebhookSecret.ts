import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';

/**
 * Middleware for inbound webhooks called by Make.com (or other external services).
 * Expects the Authorization header to match WEBHOOK_SECRET.
 * Usage: router.use(requireWebhookSecret);
 */
export function requireWebhookSecret(req: Request, res: Response, next: NextFunction): void {
  const provided = req.headers['authorization'] || '';
  const expected = env.webhookSecret;

  if (!expected) {
    console.warn('[webhook] WEBHOOK_SECRET is not set — rejecting inbound webhook');
    res.status(503).json({ error: 'Webhook secret not configured' });
    return;
  }

  if (provided !== expected) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
}
