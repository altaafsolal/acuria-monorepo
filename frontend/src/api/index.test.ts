import { describe, it, expect } from 'vitest';
import api from './index';

describe('api URL builders', () => {
  it('builds static URLs with /api prefix', () => {
    expect(api.health).toBe('/api/health');
    expect(api.login).toBe('/api/auth/login');
    expect(api.clients).toBe('/api/clients');
    expect(api.gestionnaires).toBe('/api/gestionnaires');
  });

  it('builds client URLs with id', () => {
    expect(api.clientById('abc')).toBe('/api/clients/abc');
    expect(api.clientTimeline('xyz')).toBe('/api/clients/xyz/timeline');
    expect(api.clientNotes('c1')).toBe('/api/clients/c1/notes');
    expect(api.clientNoteById('c1', 'n1')).toBe('/api/clients/c1/notes/n1');
  });

  it('builds relation/task/kyc-document URLs', () => {
    expect(api.clientRelationById('c1', 'r1')).toBe('/api/clients/c1/relations/r1');
    expect(api.clientTaskById('c1', 't1')).toBe('/api/clients/c1/tasks/t1');
    expect(api.clientKycDocumentById('c1', 'd1')).toBe('/api/clients/c1/kyc-documents/d1');
  });

  it('builds KYC URLs with optional filter', () => {
    expect(api.kycDer()).toBe('/api/kyc/der');
    expect(api.kycDer('Envoyé')).toBe('/api/kyc/der?filter=Envoy%C3%A9');
    expect(api.kycFcc()).toBe('/api/kyc/fcc');
    expect(api.kycFcc('Signé')).toBe('/api/kyc/fcc?filter=Sign%C3%A9');
  });

  it('builds FCC history URL with optional clientId', () => {
    expect(api.fccHistory()).toBe('/api/fcc/history');
    expect(api.fccHistory('c1')).toBe('/api/fcc/history?clientId=c1');
  });

  it('builds user URLs', () => {
    expect(api.userById('u1')).toBe('/api/users/u1');
    expect(api.userResetPassword('u1')).toBe('/api/users/u1/reset-password');
  });

  it('builds platform tenant URLs', () => {
    expect(api.tenantById('t1')).toBe('/api/platform/tenants/t1');
    expect(api.tenantUsers('t1')).toBe('/api/platform/tenants/t1/users');
    expect(api.tenantUserById('t1', 'u1')).toBe('/api/platform/tenants/t1/users/u1');
    expect(api.tenantUserResetPassword('t1', 'u1')).toBe('/api/platform/tenants/t1/users/u1/reset-password');
    expect(api.tenantClients('t1')).toBe('/api/platform/tenants/t1/clients');
  });

  it('builds audit log URLs with query params', () => {
    const url = api.platformAuditLogs({ page: 2, pageSize: 20, search: 'test' });
    expect(url).toContain('/api/platform/audit?');
    expect(url).toContain('page=2');
    expect(url).toContain('pageSize=20');
    expect(url).toContain('search=test');
  });

  it('builds audit log URLs without params', () => {
    expect(api.platformAuditLogs()).toBe('/api/platform/audit');
    expect(api.auditLogs()).toBe('/api/audit');
  });
});
