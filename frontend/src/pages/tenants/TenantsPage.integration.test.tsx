import { waitFor, within, cleanup } from '@testing-library/react';
import { describe, expect, it, afterEach } from 'vitest';
import { renderWithProviders } from '../../test/helpers/renderWithProviders';
import { makeSuperAdmin, makeUser } from '../../test/helpers/fixtures';
import App from '../../App';

async function waitForMainContent(): Promise<HTMLElement> {
  let el: HTMLElement | null = null;
  await waitFor(() => {
    el = document.querySelector('.dashboard-main') as HTMLElement;
    expect(el).not.toBeNull();
  }, { timeout: 5000 });
  return el!;
}

describe('TenantsPage integration', () => {
  afterEach(cleanup);

  it('renders tenant list for super_admin', async () => {
    renderWithProviders(<App />, {
      user: makeSuperAdmin(),
      initialEntries: ['/dashboard/tenants'],
    });

    const main = await waitForMainContent();
    const content = within(main);

    expect(await content.findByText('NM Prime')).toBeInTheDocument();
    expect(content.getByText('Cabinet Test')).toBeInTheDocument();
  });

  it('shows tenant details — slugs and status badges', async () => {
    renderWithProviders(<App />, {
      user: makeSuperAdmin(),
      initialEntries: ['/dashboard/tenants'],
    });

    const main = await waitForMainContent();
    const content = within(main);

    // Wait for the table to render
    expect(await content.findByText('NM Prime')).toBeInTheDocument();

    // Slugs
    expect(content.getByText('nm-prime')).toBeInTheDocument();
    expect(content.getByText('cabinet-test')).toBeInTheDocument();

    // Status badges — both tenants are "active"
    const statusBadges = content.getAllByText('Actif');
    expect(statusBadges.length).toBeGreaterThanOrEqual(2);
  });

  it('redirects non-super_admin away from TenantsPage', async () => {
    renderWithProviders(<App />, {
      user: makeUser(),
      initialEntries: ['/dashboard/tenants'],
    });

    // Standard user should be redirected — tenants table should not appear
    await waitFor(() => {
      const main = document.querySelector('.dashboard-main');
      if (!main) return;
      expect(main.querySelector('.data-table, .nm-table')).toBeNull();
    });
  });
});
