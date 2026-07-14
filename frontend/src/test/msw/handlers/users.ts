import { http, HttpResponse } from 'msw';
import type { User } from '../../../types';

export const sampleUsers: User[] = [
  {
    id: '1', email: 'admin@example.com', name: 'Admin User',
    role: 'tenant_admin', tenantId: '1', status: 'active',
    createdAt: '2026-01-01T00:00:00Z', updatedAt: null,
  },
  {
    id: '2', email: 'user@example.com', name: 'Standard User',
    role: 'standard_user', tenantId: '1', status: 'active',
    createdAt: '2026-02-01T00:00:00Z', updatedAt: null,
  },
];

export const usersHandlers = [
  http.get('/api/users', () => {
    return HttpResponse.json({ users: sampleUsers });
  }),

  http.get('/api/users/:userId', ({ params }) => {
    const user = sampleUsers.find((u) => u.id === params.userId);
    if (!user) return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    return HttpResponse.json({ user, gestionnaire: null });
  }),

  http.post('/api/users', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    const newUser: User = {
      id: '99', email: String(body.email ?? ''), name: String(body.name ?? ''),
      role: (body.role as User['role']) ?? 'standard_user', tenantId: '1', status: 'active',
      createdAt: new Date().toISOString(), updatedAt: null,
    };
    return HttpResponse.json({ user: newUser, gestionnaire: null });
  }),

  http.put('/api/users/:userId', async ({ params, request }) => {
    const user = sampleUsers.find((u) => u.id === params.userId);
    if (!user) return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({ user: { ...user, ...body }, gestionnaire: null });
  }),

  http.delete('/api/users/:userId', () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.post('/api/users/:userId/reset-password', () => {
    return HttpResponse.json({ message: 'Password reset email sent' });
  }),
];
