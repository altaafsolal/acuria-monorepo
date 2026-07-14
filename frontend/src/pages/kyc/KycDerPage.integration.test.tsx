import { describe, it, expect, afterEach } from 'vitest';
import { within, waitFor, cleanup } from '@testing-library/react';

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

describe('KycDerPage integration', () => {
  afterEach(cleanup);

  it('renders the DER page with title and stats', async () => {
    renderWithProviders(<App />, {
      user: makeUser(),
      initialEntries: ['/dashboard/kyc/der'],
    });

    const main = await waitForMainContent();
    const content = within(main);

    // The page title should appear
    expect(await content.findByText('Suivi DER / Lettre de Mission')).toBeInTheDocument();
  });

  it('shows DER status information', async () => {
    renderWithProviders(<App />, {
      user: makeUser(),
      initialEntries: ['/dashboard/kyc/der'],
    });

    const main = await waitForMainContent();
    const content = within(main);

    expect(await content.findByText('Suivi DER / Lettre de Mission')).toBeInTheDocument();

    // Client names rendered as .link-name buttons in the table
    const linkNames = main.querySelectorAll('.link-name');
    expect(linkNames.length).toBeGreaterThanOrEqual(1);
  });

  it('renders the DER/LdM action buttons', async () => {
    renderWithProviders(<App />, {
      user: makeUser(),
      initialEntries: ['/dashboard/kyc/der'],
    });

    const main = await waitForMainContent();
    const content = within(main);

    expect(await content.findByText('Suivi DER / Lettre de Mission')).toBeInTheDocument();

    // DER/LdM action buttons are present for each client row
    const actionButtons = content.getAllByRole('button', { name: /DER|LdM/i });
    expect(actionButtons.length).toBeGreaterThanOrEqual(1);
  });
});
