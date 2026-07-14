import { http, HttpResponse } from 'msw';
import type { User } from '../../../types';

export const defaultUser: User = {
  id: '999',
  email: 'test@example.com',
  name: 'Test User',
  role: 'standard_user',
  tenantId: '1',
  status: 'active',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: null,
};

export const adminUser: User = {
  ...defaultUser,
  id: '888',
  email: 'admin@example.com',
  name: 'Admin User',
  role: 'tenant_admin',
};

export const superAdminUser: User = {
  ...defaultUser,
  id: '777',
  email: 'super@example.com',
  name: 'Super Admin',
  role: 'super_admin',
  tenantId: null,
};

let currentUser: User | null = defaultUser;

export function setMswUser(user: User | null): void {
  currentUser = user;
}

export function resetMswUser(): void {
  currentUser = defaultUser;
}

export const authHandlers = [
  http.get('/api/auth/me', () => {
    if (!currentUser) {
      return HttpResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    return HttpResponse.json({ user: currentUser });
  }),

  http.post('/api/auth/login', async ({ request }) => {
    const body = await request.json() as { email?: string; password?: string };
    if (body.email === 'test@example.com' && body.password === 'password123') {
      return HttpResponse.json({
        accessToken: 'fake-access-token',
        user: defaultUser,
      });
    }
    return HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }),

  http.post('/api/auth/refresh', () => {
    return HttpResponse.json({ accessToken: 'new-fake-token' });
  }),

  http.post('/api/auth/logout', () => {
    return HttpResponse.json({ message: 'Logged out' });
  }),

  http.post('/api/auth/forgot-password', () => {
    return HttpResponse.json({ message: 'OTP sent' });
  }),

  http.post('/api/auth/verify-otp', () => {
    return HttpResponse.json({ uid: '999', token: 'reset-token-123' });
  }),

  http.post('/api/auth/set-password', () => {
    return HttpResponse.json({ message: 'Password updated' });
  }),
];
