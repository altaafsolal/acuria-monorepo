import { describe, it, expect, afterEach } from 'vitest';
import { within, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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

describe('KycFccPage integration', () => {
  afterEach(cleanup);

  it('renders the default Suivi clients tab with client data', async () => {
    renderWithProviders(<App />, {
      user: makeUser(),
      initialEntries: ['/dashboard/kyc/fcc'],
    });

    const main = await waitForMainContent();
    const content = within(main);

    // Page should have FCC-related content
    const titles = await content.findAllByText(/FCC/);
    expect(titles.length).toBeGreaterThanOrEqual(1);

    // "Suivi clients" tab should be present
    expect(content.getByText('Suivi clients')).toBeInTheDocument();

    // Client data rendered as .link-name buttons in the table
    const linkNames = main.querySelectorAll('.link-name');
    expect(linkNames.length).toBeGreaterThanOrEqual(1);
  });

  it('shows FCC action buttons for clients', async () => {
    renderWithProviders(<App />, {
      user: makeUser(),
      initialEntries: ['/dashboard/kyc/fcc'],
    });

    const main = await waitForMainContent();
    const content = within(main);

    const titles = await content.findAllByText(/FCC/);
    expect(titles.length).toBeGreaterThanOrEqual(1);

    // The FCC action button is present
    const fccButtons = content.getAllByRole('button', { name: /FCC/i });
    expect(fccButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('can switch to Dossiers FCC tab and see submissions', async () => {
    const user = userEvent.setup();

    renderWithProviders(<App />, {
      user: makeUser(),
      initialEntries: ['/dashboard/kyc/fcc'],
    });

    const main = await waitForMainContent();
    const content = within(main);

    const titles = await content.findAllByText(/FCC/);
    expect(titles.length).toBeGreaterThanOrEqual(1);

    // The Dossiers FCC tab button
    const dossiersTab = content.getByText(/Dossiers FCC/);
    await user.click(dossiersTab);

    // After switching, submission data should appear
    expect(await content.findByText('Prudent')).toBeInTheDocument();
    expect(content.getByText('En attente')).toBeInTheDocument();
  });
});
