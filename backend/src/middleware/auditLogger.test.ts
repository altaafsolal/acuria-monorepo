import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';
import type { Request, NextFunction } from 'express';

vi.mock('../services/baserow/index.js', () => ({
  auditLogsRepo: { createAuditLog: vi.fn().mockResolvedValue(undefined) },
}));

import { sanitizeBody, deriveAuditMeta, auditLogger } from './auditLogger.js';
import { auditLogsRepo } from '../services/baserow/index.js';

describe('sanitizeBody', () => {
  it('returns null for null input', () => {
    expect(sanitizeBody(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(sanitizeBody(undefined)).toBeNull();
  });

  it('returns string representation for non-object input', () => {
    expect(sanitizeBody('hello')).toBe('hello');
    expect(sanitizeBody(42)).toBe('42');
    expect(sanitizeBody(true)).toBe('true');
  });

  it('redacts sensitive keys', () => {
    const body = { email: 'a@b.com', password: 's3cret', token: 'abc123' };
    const result = JSON.parse(sanitizeBody(body)!);

    expect(result.email).toBe('a@b.com');
    expect(result.password).toBe('[REDACTED]');
    expect(result.token).toBe('[REDACTED]');
  });

  it('passes through clean objects as JSON', () => {
    const body = { name: 'Test', status: 'active' };
    const result = JSON.parse(sanitizeBody(body)!);

    expect(result).toEqual({ name: 'Test', status: 'active' });
  });

  it('redacts all known sensitive keys', () => {
    const body = {
      password: 'x',
      password_hash: 'x',
      accessToken: 'x',
      refreshToken: 'x',
      token: 'x',
      database_token: 'x',
      safe_field: 'visible',
    };
    const result = JSON.parse(sanitizeBody(body)!);

    expect(result.password).toBe('[REDACTED]');
    expect(result.password_hash).toBe('[REDACTED]');
    expect(result.accessToken).toBe('[REDACTED]');
    expect(result.refreshToken).toBe('[REDACTED]');
    expect(result.token).toBe('[REDACTED]');
    expect(result.database_token).toBe('[REDACTED]');
    expect(result.safe_field).toBe('visible');
  });
});

describe('deriveAuditMeta', () => {
  it('derives entityType and action for POST /api/clients', () => {
    const result = deriveAuditMeta('POST', '/api/clients');

    expect(result.entityType).toBe('clients');
    expect(result.entityId).toBeNull();
    expect(result.action).toBe('create.clients');
  });

  it('extracts entityId for PUT /api/clients/123', () => {
    const result = deriveAuditMeta('PUT', '/api/clients/123');

    expect(result.entityType).toBe('clients');
    expect(result.entityId).toBe('123');
    expect(result.action).toBe('update.clients');
  });

  it('handles DELETE with nested path', () => {
    const result = deriveAuditMeta('DELETE', '/api/platform/tenants/456');

    expect(result.entityType).toBe('platform');
    expect(result.entityId).toBe('456');
    expect(result.action).toBe('delete.platform');
  });

  it('strips query string before parsing', () => {
    const result = deriveAuditMeta('POST', '/api/clients?page=1&limit=10');

    expect(result.entityType).toBe('clients');
    expect(result.entityId).toBeNull();
    expect(result.action).toBe('create.clients');
  });

  it('returns "unknown" entityType for empty path', () => {
    const result = deriveAuditMeta('GET', '/api/');

    expect(result.entityType).toBe('unknown');
  });

  it('uses method lowercase as verb for non-mapped methods', () => {
    const result = deriveAuditMeta('GET', '/api/clients');

    expect(result.action).toBe('get.clients');
  });

  it('maps PATCH to update', () => {
    const result = deriveAuditMeta('PATCH', '/api/clients/789');

    expect(result.action).toBe('update.clients');
    expect(result.entityId).toBe('789');
  });
});

describe('auditLogger middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls next() immediately', () => {
    const req = {
      method: 'POST',
      originalUrl: '/api/clients',
      headers: {},
      user: { id: 'u1', email: 'a@b.com', name: 'Test', role: 'tenant_admin', tenantId: 't1' },
      body: { name: 'New Client' },
    } as unknown as Request;
    const res = Object.assign(new EventEmitter(), { statusCode: 200 }) as any;
    const next: NextFunction = vi.fn();

    auditLogger(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('calls createAuditLog on res finish for a POST with user', async () => {
    const req = {
      method: 'POST',
      originalUrl: '/api/clients',
      headers: {},
      user: { id: 'u1', email: 'a@b.com', name: 'Test', role: 'tenant_admin', tenantId: 't1' },
      body: { name: 'New Client' },
    } as unknown as Request;
    const res = Object.assign(new EventEmitter(), { statusCode: 201 }) as any;
    const next: NextFunction = vi.fn();

    auditLogger(req, res, next);
    res.emit('finish');

    // Allow the microtask (void promise) to settle
    await vi.waitFor(() => {
      expect(auditLogsRepo.createAuditLog).toHaveBeenCalledTimes(1);
    });

    expect(auditLogsRepo.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'u1',
        user_email: 'a@b.com',
        action: 'create.clients',
        method: 'POST',
        path: '/api/clients',
        status_code: 201,
        entity_type: 'clients',
      }),
    );
  });

  it('does not call createAuditLog for GET requests', () => {
    const req = {
      method: 'GET',
      originalUrl: '/api/clients',
      headers: {},
      user: { id: 'u1', email: 'a@b.com', name: 'Test', role: 'tenant_admin', tenantId: 't1' },
    } as unknown as Request;
    const res = Object.assign(new EventEmitter(), { statusCode: 200 }) as any;
    const next: NextFunction = vi.fn();

    auditLogger(req, res, next);
    res.emit('finish');

    expect(auditLogsRepo.createAuditLog).not.toHaveBeenCalled();
  });
});
