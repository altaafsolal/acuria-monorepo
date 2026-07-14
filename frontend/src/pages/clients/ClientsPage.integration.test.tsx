import { describe, it, expect, afterEach } from 'vitest';
import { screen, waitFor, within, cleanup } from '@testing-library/react';

import App from '../../App';
import { renderWithProviders } from '../../test/helpers/renderWithProviders';
import { makeUser } from '../../test/helpers/fixtures';

async function waitForMainContent(): Promise<HTMLElement> {
  let el: HTMLElement | null = null;
  await waitFor(() => {
    el = document.querySelector('.dashboard-main') as HTMLElement;
    expect(el).not.toBeNull();
  }, { timeout: 5000 });
  return el!;
}

describe('ClientsPage integration', () => {
  afterEach(cleanup);

  it('renders client list with names from API', async () => {
    renderWithProviders(<App />, {
      user: makeUser(),
      initialEntries: ['/dashboard/clients'],
    });

    const main = await waitForMainContent();
    const content = within(main);

    expect(await content.findByText('Jean Dupont')).toBeInTheDocument();
    expect(content.getByText('Marie Martin')).toBeInTheDocument();
  });

  it('displays client status badges', async () => {
    renderWithProviders(<App />, {
      user: makeUser(),
      initialEntries: ['/dashboard/clients'],
    });

    const main = await waitForMainContent();
    const content = within(main);

    // Wait for the table to render
    expect(await content.findByText('Jean Dupont')).toBeInTheDocument();

    // Both clients have status badges; use getAllByText since text may repeat
    const actifBadges = content.getAllByText('Actif');
    expect(actifBadges.length).toBeGreaterThanOrEqual(1);
    const prospectBadges = content.getAllByText('Prospect');
    expect(prospectBadges.length).toBeGreaterThanOrEqual(1);
  });

  it('redirects unauthenticated user to login', async () => {
    renderWithProviders(<App />, {
      user: null,
      initialEntries: ['/dashboard/clients'],
    });

    // ProtectedRoute redirects to /login when not authenticated
    await waitFor(() => {
      expect(screen.getByText('Connexion')).toBeInTheDocument();
    });
  });
});
