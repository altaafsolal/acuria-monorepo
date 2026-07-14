import { screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, afterEach } from 'vitest';
import App from '../../App';
import { renderWithProviders } from '../../test/helpers/renderWithProviders';

describe('ForgotPasswordPage integration', () => {
  afterEach(cleanup);

  it('renders the email form initially', async () => {
    renderWithProviders(<App />, { user: null, initialEntries: ['/forgot-password'] });

    expect(await screen.findByText('Mot de passe oublié')).toBeInTheDocument();
    expect(screen.getByText('Saisissez votre e-mail pour recevoir un code de vérification.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /envoyer le code/i })).toBeInTheDocument();
  });

  it('completes the full forgot-password flow: email → OTP → new password → success', async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />, { user: null, initialEntries: ['/forgot-password'] });

    // Step 1: Enter email — no placeholder, find by label
    const emailLabel = await screen.findByText('E-mail');
    const emailField = emailLabel.closest('.field')!;
    const emailInput = emailField.querySelector('input')!;
    const sendButton = screen.getByRole('button', { name: /envoyer le code/i });

    await user.type(emailInput, 'test@example.com');
    await user.click(sendButton);

    // Step 2: OTP form appears
    expect(await screen.findByText('Entrez le code reçu par e-mail.')).toBeInTheDocument();
    const otpLabel = screen.getByText('Code de vérification');
    const otpField = otpLabel.closest('.field')!;
    const otpInput = otpField.querySelector('input')!;
    const verifyButton = screen.getByRole('button', { name: /vérifier le code/i });

    await user.type(otpInput, '123456');
    await user.click(verifyButton);

    // Step 3: Password form appears
    expect(await screen.findByText('Choisissez un nouveau mot de passe.')).toBeInTheDocument();
    const newPwLabel = screen.getByText('Nouveau mot de passe');
    const newPwField = newPwLabel.closest('.field')!;
    const newPwInput = newPwField.querySelector('input')!;
    const confirmLabel = screen.getByText('Confirmation');
    const confirmField = confirmLabel.closest('.field')!;
    const confirmInput = confirmField.querySelector('input')!;
    const saveButton = screen.getByRole('button', { name: /enregistrer le mot de passe/i });

    await user.type(newPwInput, 'newSecurePass1');
    await user.type(confirmInput, 'newSecurePass1');
    await user.click(saveButton);

    // Step 4: Success message
    expect(await screen.findByText('Votre mot de passe a été mis à jour.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /se connecter/i })).toBeInTheDocument();
  });
});
