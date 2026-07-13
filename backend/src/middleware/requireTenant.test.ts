import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { requireTenant } from './requireTenant.js';

function mockReqResNext(user?: Request['user']) {
  const req = { user } as Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  const next: NextFunction = vi.fn();
  return { req, res, next };
}

describe('requireTenant', () => {
  it('sets req.tenantId and calls next() when tenantId is present', () => {
    const { req, res, next } = mockReqResNext({
      id: 'u1',
      email: 'a@b.com',
      name: 'Test',
      role: 'tenant_admin',
      tenantId: 't1',
    });

    requireTenant(req, res, next);

    expect(req.tenantId).toBe('t1');
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 403 when user has no tenantId', () => {
    const { req, res, next } = mockReqResNext({
      id: 'u1',
      email: 'a@b.com',
      name: 'Test',
      role: 'super_admin',
      tenantId: null,
    });

    requireTenant(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'No tenant assigned to this account' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when there is no user at all', () => {
    const { req, res, next } = mockReqResNext(undefined);

    requireTenant(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'No tenant assigned to this account' });
    expect(next).not.toHaveBeenCalled();
  });
});
