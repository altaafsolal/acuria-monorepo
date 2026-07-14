import { http, HttpResponse } from 'msw';
import type { Tenant, PlatformStats } from '../../../types';

export const sampleTenants: Tenant[] = [
  {
    id: '1', name: 'NM Prime', slug: 'nm-prime', status: 'active',
    createdAt: '2026-01-01T00:00:00Z', updatedAt: null,
    userCount: 3, clientCount: 25,
    brandingName: 'NM Prime', brandingOrias: '12345678',
    brandingAccent: '#3B82F6', hasBrandingLogo: false,
    workspaceId: '100', databaseId: '200', databaseToken: 'token-1',
    sharepointPathBase: null, email: 'contact@nmprime.fr', backofficeEmail: null,
  },
  {
    id: '2', name: 'Cabinet Test', slug: 'cabinet-test', status: 'active',
    createdAt: '2026-02-01T00:00:00Z', updatedAt: null,
    userCount: 1, clientCount: 10,
    brandingName: 'Cabinet Test', brandingOrias: null,
    brandingAccent: '#10B981', hasBrandingLogo: false,
    workspaceId: '101', databaseId: '201', databaseToken: 'token-2',
    sharepointPathBase: null, email: null, backofficeEmail: null,
  },
];

export const samplePlatformStats: PlatformStats = {
  tenants: { total: 2, active: 2, inactive: 0 },
  users: { total: 4, active: 4, inactive: 0 },
  clients: { total: 35, active: 30, inactive: 5 },
};

export const platformHandlers = [
  http.get('/api/platform/stats', () => {
    return HttpResponse.json(samplePlatformStats);
  }),

  http.get('/api/platform/tenants', () => {
    return HttpResponse.json({ tenants: sampleTenants });
  }),

  http.get('/api/platform/tenants/:tenantId', ({ params }) => {
    const tenant = sampleTenants.find((t) => t.id === params.tenantId);
    if (!tenant) return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    return HttpResponse.json({ tenant });
  }),

  http.post('/api/platform/tenants', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    const newTenant: Tenant = {
      ...sampleTenants[0],
      id: '99',
      name: String(body.name ?? 'New Tenant'),
      slug: String(body.slug ?? 'new-tenant'),
      status: 'provisioning',
    };
    return HttpResponse.json({ tenant: newTenant });
  }),

  http.put('/api/platform/tenants/:tenantId', async ({ params }) => {
    const tenant = sampleTenants.find((t) => t.id === params.tenantId);
    if (!tenant) return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    return HttpResponse.json({ tenant });
  }),

  http.get('/api/platform/tenants/:tenantId/users', () => {
    return HttpResponse.json({ users: [] });
  }),

  http.get('/api/platform/tenants/:tenantId/clients', () => {
    return HttpResponse.json({ clients: [] });
  }),
];
