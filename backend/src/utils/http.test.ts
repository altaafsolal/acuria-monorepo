import { describe, it, expect, vi } from 'vitest';
import { HttpError, asyncHandler, requireTenant, reqParam, errorHandler } from './http.js';

describe('HttpError', () => {
  it('sets status, message, and name', () => {
    const err = new HttpError(404, 'Not found');
    expect(err.status).toBe(404);
    expect(err.message).toBe('Not found');
    expect(err.name).toBe('HttpError');
  });

  it('is an instance of Error', () => {
    const err = new HttpError(500, 'Server error');
    expect(err).toBeInstanceOf(Error);
  });
});

describe('asyncHandler', () => {
  it('calls the handler and does not call next on success', async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    const next = vi.fn();
    const req = {} as any;
    const res = {} as any;

    const wrapped = asyncHandler(handler);
    await wrapped(req, res, next);

    expect(handler).toHaveBeenCalledWith(req, res, next);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next with the error when handler rejects', async () => {
    const error = new Error('boom');
    const handler = vi.fn().mockRejectedValue(error);
    const next = vi.fn();
    const req = {} as any;
    const res = {} as any;

    const wrapped = asyncHandler(handler);
    await wrapped(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});

describe('requireTenant', () => {
  it('returns tenantId when present on req.user', () => {
    const req = { user: { tenantId: 'tenant-123' } } as any;
    expect(requireTenant(req)).toBe('tenant-123');
  });

  it('throws HttpError(403) when tenantId is missing', () => {
    const req = { user: { tenantId: null } } as any;
    expect(() => requireTenant(req)).toThrow(HttpError);
    try {
      requireTenant(req);
    } catch (e) {
      expect((e as HttpError).status).toBe(403);
    }
  });

  it('throws HttpError(403) when user is undefined', () => {
    const req = {} as any;
    expect(() => requireTenant(req)).toThrow(HttpError);
    try {
      requireTenant(req);
    } catch (e) {
      expect((e as HttpError).status).toBe(403);
    }
  });
});

describe('reqParam', () => {
  it('returns the param value', () => {
    const req = { params: { id: '42' } } as any;
    expect(reqParam(req, 'id')).toBe('42');
  });

  it('returns the first element when param is an array', () => {
    const req = { params: { id: ['first', 'second'] } } as any;
    expect(reqParam(req, 'id')).toBe('first');
  });

  it('returns empty string for missing param', () => {
    const req = { params: {} } as any;
    expect(reqParam(req, 'id')).toBe('');
  });
});

describe('errorHandler', () => {
  const makeRes = () => ({
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    headersSent: false,
  }) as any;

  const makeReq = () => ({ method: 'GET', url: '/test' }) as any;

  it('responds with correct status and json for HttpError', () => {
    const req = makeReq();
    const res = makeRes();
    const next = vi.fn();
    const err = new HttpError(422, 'Validation failed');

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({ error: 'Validation failed' });
    expect(next).not.toHaveBeenCalled();
  });

  it('responds with 500 for a generic Error', () => {
    const req = makeReq();
    const res = makeRes();
    const next = vi.fn();
    const err = new Error('something broke');

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'something broke' });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next when headers are already sent', () => {
    const req = makeReq();
    const res = makeRes();
    res.headersSent = true;
    const next = vi.fn();
    const err = new Error('late error');

    errorHandler(err, req, res, next);

    expect(next).toHaveBeenCalledWith(err);
    expect(res.status).not.toHaveBeenCalled();
  });
});
