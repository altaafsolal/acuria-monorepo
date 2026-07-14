import { describe, it, expect, afterEach } from 'vitest';
import { waitFor, within, cleanup } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import App from '../App';
import { renderWithProviders } from '../test/helpers/renderWithProviders';
import { makeUser, makeSuperAdmin, makeClient } from '../test/helpers/fixtures';
import { server } from '../test/msw/server';

async function waitForMainContent(): Promise<HTMLElement> {
  let el: HTMLElement | null = null;
  await waitFor(() => {
    el = document.querySelector('.dashboard-main') as HTMLElement;
    expect(el).not.toBeNull();
  }, { timeout: 5000 });
  return el!;
}

async function waitForSidebar(): Promise<HTMLElement> {
  let el: HTMLElement | null = null;
  await waitFor(() => {
    el = document.querySelector('.dashboard-sidebar') as HTMLElement;
    expect(el).not.toBeNull();
  }, { timeout: 5000 });
  return el!;
}

describe('Multi-tenant integration', () => {
  afterEach(cleanup);

  describe('Branding isolation', () => {
    it('displays tenant A branding (NM Prime) in sidebar', async () => {
      server.use(
        http.get('/api/tenant/branding', () =>
          HttpResponse.json({
            branding: {
              name: 'NM Prime',
              orias: '12345678',
              accent: '#3B82F6',
              hasLogo: false,
              logoDataUrl: null,
            },
          }),
        ),
      );

      renderWithProviders(<App />, {
        user: makeUser({ tenantId: '1' }),
        initialEntries: ['/dashboard'],
      });

      const sidebar = await waitForSidebar();

      await waitFor(() => {
        const footer = sidebar.querySelector('.sidebar-footer');
        expect(footer?.textContent).toContain('NM Prime');
        expect(footer?.textContent).toContain('ORIAS 12345678');
      });
    });

    it('displays tenant B branding (Cabinet Dupont) in sidebar', async () => {
      server.use(
        http.get('/api/tenant/branding', () =>
          HttpResponse.json({
            branding: {
              name: 'Cabinet Dupont',
              orias: '87654321',
              accent: '#10B981',
              hasLogo: false,
              logoDataUrl: null,
            },
          }),
        ),
      );

      renderWithProviders(<App />, {
        user: makeUser({ id: '20', tenantId: '2', email: 'user@dupont.fr' }),
        initialEntries: ['/dashboard'],
      });

      const sidebar = await waitForSidebar();

      await waitFor(() => {
        const footer = sidebar.querySelector('.sidebar-footer');
        expect(footer?.textContent).toContain('Cabinet Dupont');
        expect(footer?.textContent).toContain('ORIAS 87654321');
      });
    });

    it('applies tenant accent color as CSS variable', async () => {
      server.use(
        http.get('/api/tenant/branding', () =>
          HttpResponse.json({
            branding: {
              name: 'Cabinet Rouge',
              orias: null,
              accent: '#FF0000',
              hasLogo: false,
              logoDataUrl: null,
            },
          }),
        ),
      );

      renderWithProviders(<App />, {
        user: makeUser({ tenantId: '3' }),
        initialEntries: ['/dashboard'],
      });

      await waitForSidebar();

      await waitFor(() => {
        const accent = document.documentElement.style.getPropertyValue('--color-bronze');
        expect(accent).toBe('#FF0000');
      });
    });

    it('super_admin dashboard does not fetch tenant branding', async () => {
      let brandingFetched = false;
      server.use(
        http.get('/api/tenant/branding', () => {
          brandingFetched = true;
          return HttpResponse.json({
            branding: { name: 'Should not appear', orias: null, accent: null, hasLogo: false, logoDataUrl: null },
          });
        }),
      );

      renderWithProviders(<App />, {
        user: makeSuperAdmin(),
        initialEntries: ['/dashboard'],
      });

      await waitForSidebar();

      // useTenantBranding(!isSuperAdmin) is disabled for super_admin
      expect(brandingFetched).toBe(false);
    });
  });

  describe('Data scoping', () => {
    it('tenant A clients page shows only tenant A data', async () => {
      server.use(
        http.get('/api/clients', () =>
          HttpResponse.json({
            clients: [
              makeClient({ id: '1', name: 'Alice (Tenant A)' }),
              makeClient({ id: '2', name: 'Bob (Tenant A)' }),
            ],
          }),
        ),
      );

      renderWithProviders(<App />, {
        user: makeUser({ tenantId: '1' }),
        initialEntries: ['/dashboard/clients'],
      });

      const main = await waitForMainContent();
      const content = within(main);

      expect(await content.findByText('Alice (Tenant A)')).toBeInTheDocument();
      expect(content.getByText('Bob (Tenant A)')).toBeInTheDocument();
      // No tenant B data should be present
      expect(content.queryByText('Xavier (Tenant B)')).not.toBeInTheDocument();
    });
  });
});
