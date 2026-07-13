import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

vi.mock('../utils/index.js', () => ({
  verifyAccessToken: vi.fn(),
}));

vi.mock('../services/baserow/index.js', () => ({
  usersRepo: { findUserById: vi.fn() },
}));

import { authenticate } from './auth.js';
import { verifyAccessToken } from '../utils/index.js';
import { usersRepo } from '../services/baserow/index.js';

const mockDbUser = {
  id: 'u1',
  email: 'a@b.com',
  name: 'Test',
  role: 'tenant_admin',
  tenant_id: 't1',
  status: 'active',
  password_hash: '',
  reset_token_hash: null,
  reset_token_expires: null,
  otp_hash: null,
  otp_expires: null,
  created_on: null,
};

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

describe('authenticate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no authorization header is present', async () => {
    const { req, res, next } = mockReqResNext(undefined);

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing or invalid authorization header' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when header does not start with Bearer', async () => {
    const { req, res, next } = mockReqResNext('Basic abc123');

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing or invalid authorization header' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when verifyAccessToken throws', async () => {
    vi.mocked(verifyAccessToken).mockImplementation(() => {
      throw new Error('token expired');
    });
    const { req, res, next } = mockReqResNext('Bearer bad-token');

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired access token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when user is not found in database', async () => {
    vi.mocked(verifyAccessToken).mockReturnValue({ user_id: 'u-missing' } as any);
    vi.mocked(usersRepo.findUserById).mockResolvedValue(null);
    const { req, res, next } = mockReqResNext('Bearer valid-token');

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
    expect(next).not.toHaveBeenCalled();
  });

  it('sets req.user and calls next() for a valid token and user', async () => {
    vi.mocked(verifyAccessToken).mockReturnValue({ user_id: 'u1' } as any);
    vi.mocked(usersRepo.findUserById).mockResolvedValue(mockDbUser as any);
    const { req, res, next } = mockReqResNext('Bearer valid-token');

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({
      id: 'u1',
      email: 'a@b.com',
      name: 'Test',
      role: 'tenant_admin',
      tenantId: 't1',
    });
    expect(res.status).not.toHaveBeenCalled();
  });
});
