import { waitFor, within, cleanup } from '@testing-library/react';
import { describe, expect, it, afterEach } from 'vitest';
import { renderWithProviders } from '../../test/helpers/renderWithProviders';
import { makeTenantAdmin, makeUser } from '../../test/helpers/fixtures';
import App from '../../App';

async function waitForMainContent(): Promise<HTMLElement> {
  let el: HTMLElement | null = null;
  await waitFor(() => {
    el = document.querySelector('.dashboard-main') as HTMLElement;
    expect(el).not.toBeNull();
  }, { timeout: 5000 });
  return el!;
}

describe('UsersPage integration', () => {
  afterEach(cleanup);

  it('renders user list for tenant_admin', async () => {
    renderWithProviders(<App />, {
      user: makeTenantAdmin(),
      initialEntries: ['/dashboard/users'],
    });

    const main = await waitForMainContent();
    const content = within(main);

    // User names are rendered in <strong> tags in the data-table
    expect(await content.findByText('Admin User')).toBeInTheDocument();
    // Standard User should also appear
    const standardUsers = content.getAllByText('Standard User');
    expect(standardUsers.length).toBeGreaterThanOrEqual(1);
  });

  it('shows user roles', async () => {
    renderWithProviders(<App />, {
      user: makeTenantAdmin(),
      initialEntries: ['/dashboard/users'],
    });

    const main = await waitForMainContent();
    const content = within(main);

    // Wait for the table to render
    expect(await content.findByText('Admin User')).toBeInTheDocument();

    // ROLE_LABELS: tenant_admin → "Administrateur tenant", standard_user → "Utilisateur standard"
    // These appear in .role-pill spans within the main content
    const adminPills = content.getAllByText('Administrateur tenant');
    expect(adminPills.length).toBeGreaterThanOrEqual(1);
    const userPills = content.getAllByText('Utilisateur standard');
    expect(userPills.length).toBeGreaterThanOrEqual(1);
  });

  it('redirects standard_user away from UsersPage (adminOnly guard)', async () => {
    renderWithProviders(<App />, {
      user: makeUser(),
      initialEntries: ['/dashboard/users'],
    });

    // Standard user should be redirected — data-table for users should not appear
    await waitFor(() => {
      const main = document.querySelector('.dashboard-main');
      if (!main) return;
      expect(main.querySelector('.data-table')).toBeNull();
    });
  });
});
