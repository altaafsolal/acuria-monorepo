import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { requireRole } from './requireRole.js';

function mockReqResNext(user?: Request['user']) {
  const req = { user } as Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  const next: NextFunction = vi.fn();
  return { req, res, next };
}

describe('requireRole', () => {
  it('returns 401 when no user is present', () => {
    const middleware = requireRole('tenant_admin');
    const { req, res, next } = mockReqResNext(undefined);

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when user has wrong role', () => {
    const middleware = requireRole('super_admin');
    const { req, res, next } = mockReqResNext({
      id: 'u1',
      email: 'a@b.com',
      name: 'Test',
      role: 'standard_user',
      tenantId: 't1',
    });

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() when user has the correct role', () => {
    const middleware = requireRole('tenant_admin');
    const { req, res, next } = mockReqResNext({
      id: 'u1',
      email: 'a@b.com',
      name: 'Test',
      role: 'tenant_admin',
      tenantId: 't1',
    });

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('accepts any of multiple allowed roles', () => {
    const middleware = requireRole('super_admin', 'tenant_admin');
    const { req, res, next } = mockReqResNext({
      id: 'u1',
      email: 'a@b.com',
      name: 'Test',
      role: 'tenant_admin',
      tenantId: 't1',
    });

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects a role not in the allowed list of multiple roles', () => {
    const middleware = requireRole('super_admin', 'tenant_admin');
    const { req, res, next } = mockReqResNext({
      id: 'u1',
      email: 'a@b.com',
      name: 'Test',
      role: 'standard_user',
      tenantId: 't1',
    });

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
