import { describe, it, expect, beforeEach } from 'vitest';
import { persistSession, clearSession } from './auth';
import { getAccessToken } from '../lib/http';

beforeEach(() => {
  localStorage.clear();
});

describe('persistSession', () => {
  it('stores access token and returns user', () => {
    const user = { id: 'u1', email: 'a@b.com', name: 'Test', role: 'tenant_admin' as const, tenantId: 't1', status: 'active' as const, createdAt: null, updatedAt: null };
    const result = persistSession({ accessToken: 'tok123', user });
    expect(result).toEqual(user);
    expect(getAccessToken()).toBe('tok123');
  });
});

describe('clearSession', () => {
  it('removes access token from storage', () => {
    localStorage.setItem('accessToken', 'tok');
    clearSession();
    expect(getAccessToken()).toBeNull();
  });
});
