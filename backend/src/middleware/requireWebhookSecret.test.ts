import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

vi.mock('../config/env.js', () => ({
  env: { webhookSecret: 'test-secret-123' },
}));

import { requireWebhookSecret } from './requireWebhookSecret.js';
import { env } from '../config/env.js';

function mockReqResNext(authHeader?: string) {
  const req = {
    headers: authHeader !== undefined ? { authorization: authHeader } : {},
  } as unknown as Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  const next: NextFunction = vi.fn();
  return { req, res, next };
}

describe('requireWebhookSecret', () => {
  beforeEach(() => {
    (env as any).webhookSecret = 'test-secret-123';
  });

  it('returns 503 when WEBHOOK_SECRET is not configured', () => {
    (env as any).webhookSecret = '';
    const { req, res, next } = mockReqResNext('anything');

    requireWebhookSecret(req, res, next);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: 'Webhook secret not configured' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when authorization header does not match', () => {
    const { req, res, next } = mockReqResNext('wrong-secret');

    requireWebhookSecret(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when authorization header is missing', () => {
    const { req, res, next } = mockReqResNext(undefined);

    requireWebhookSecret(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() when authorization header matches the secret', () => {
    const { req, res, next } = mockReqResNext('test-secret-123');

    requireWebhookSecret(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
