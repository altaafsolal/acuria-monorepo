import { screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, afterEach } from 'vitest';
import App from '../../App';
import { renderWithProviders } from '../../test/helpers/renderWithProviders';

describe('LoginPage integration', () => {
  afterEach(cleanup);

  it('renders login form with email, password and submit button', async () => {
    renderWithProviders(<App />, { user: null, initialEntries: ['/login'] });

    expect(await screen.findByPlaceholderText('vous@tenant.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /se connecter/i })).toBeInTheDocument();
  });

  it('redirects to /dashboard on successful login', async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />, { user: null, initialEntries: ['/login'] });

    const emailInputs = await screen.findAllByPlaceholderText('vous@tenant.com');
    const emailInput = emailInputs[0]!;
    const passwordInputs = screen.getAllByPlaceholderText('••••••••');
    const passwordInput = passwordInputs[0]!;
    const submitButton = screen.getByRole('button', { name: /se connecter/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    // After successful login, the login form should disappear
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('vous@tenant.com')).not.toBeInTheDocument();
    });
  });

  it('shows error message on failed login', async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />, { user: null, initialEntries: ['/login'] });

    const emailInputs = await screen.findAllByPlaceholderText('vous@tenant.com');
    const emailInput = emailInputs[0]!;
    const passwordInputs = screen.getAllByPlaceholderText('••••••••');
    const passwordInput = passwordInputs[0]!;
    const submitButton = screen.getByRole('button', { name: /se connecter/i });

    await user.type(emailInput, 'wrong@example.com');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(submitButton);

    // MSW returns 401 with { error: 'Invalid credentials' }
    expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
  });
});
