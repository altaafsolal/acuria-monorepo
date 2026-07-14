import { within, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
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

describe('AccueilPage integration', () => {
  afterEach(cleanup);

  it('renders CRM stats cards with correct values', async () => {
    renderWithProviders(<App />, {
      user: makeUser(),
      initialEntries: ['/dashboard'],
    });

    const main = await waitForMainContent();
    const content = within(main);

    // The accueil handler returns crm: { total: 35, prospects: 5, actifs: 25, inactifs: 5 }
    // Use within(main) to avoid matching sidebar nav-badge "35"
    expect(await content.findByText('Clients actifs')).toBeInTheDocument();
    expect(content.getByText('25')).toBeInTheDocument();
    expect(content.getByText('Prospects')).toBeInTheDocument();
    expect(content.getByText('Inactifs')).toBeInTheDocument();
  });

  it('renders KYC todo items', async () => {
    renderWithProviders(<App />, {
      user: makeUser(),
      initialEntries: ['/dashboard'],
    });

    const main = await waitForMainContent();
    const content = within(main);

    // kycTodos: Jean Dupont — CNI expirée, Marie Martin — Justificatif domicile manquant
    expect(await content.findByText('CNI expirée')).toBeInTheDocument();
    expect(content.getByText('Justificatif domicile manquant')).toBeInTheDocument();
  });

  it('renders compliance todo items', async () => {
    renderWithProviders(<App />, {
      user: makeUser(),
      initialEntries: ['/dashboard'],
    });

    const main = await waitForMainContent();

    // complianceTodos: Jean Dupont — DER à envoyer
    // "DER à envoyer" also appears as a stat card label, so use todo-specific selector
    await waitFor(() => {
      const todoLabels = main.querySelectorAll('.todo-item__label');
      const labels = Array.from(todoLabels).map((el) => el.textContent);
      expect(labels).toContain('DER à envoyer');
    });
  });

  it('displays greeting with user name', async () => {
    renderWithProviders(<App />, {
      user: makeUser({ name: 'Alice Martin' }),
      initialEntries: ['/dashboard'],
    });

    const main = await waitForMainContent();

    // Greeting text may be split across elements — use a broader selector
    await waitFor(() => {
      const greeting = main.querySelector('.accueil-greeting');
      expect(greeting).not.toBeNull();
      expect(greeting!.textContent).toContain('Alice Martin');
    });
  });
});
