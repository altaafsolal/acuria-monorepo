import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiArrowRight, FiLayout, FiLock, FiMail } from 'react-icons/fi';
import { useForgotPassword, useSetPassword, useVerifyOtp } from '../../hooks';


type Step = 'email' | 'otp' | 'password' | 'done';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const forgotPassword = useForgotPassword();
  const verifyOtp = useVerifyOtp();
  const setPassword = useSetPassword();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [uid, setUid] = useState('');
  const [token, setToken] = useState('');
  const [password, setPasswordValue] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const handleEmailSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    forgotPassword.mutate(
      { email: email.trim() },
      {
        onSuccess: () => setStep('otp'),
        onError: (error) => setFormError(error.message),
      },
    );
  };

  const handleOtpSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    verifyOtp.mutate(
      { email: email.trim(), otp: otp.trim() },
      {
        onSuccess: (data) => {
          setUid(data.uid);
          setToken(data.token);
          setStep('password');
        },
        onError: (error) => setFormError(error.message),
      },
    );
  };

  const handlePasswordSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (password.length < 8) {
      setFormError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (password !== passwordConfirm) {
      setFormError('Les mots de passe ne correspondent pas.');
      return;
    }

    setPassword.mutate(
      { uid, token, password, passwordConfirm },
      {
        onSuccess: () => setStep('done'),
        onError: (error) => setFormError(error.message),
      },
    );
  };

  return (
    <div className="login-page">
      <div className="login-panel login-panel--brand">
        <div className="login-brand-content">
          <FiLayout className="login-logo" />
          <h1>Acuria Partners</h1>
          <p>Réinitialisez votre mot de passe en toute sécurité.</p>
        </div>
      </div>

      <div className="login-panel login-panel--form">
        <div className="login-form-wrap">
          <header className="login-form-header">
            <h2>Mot de passe oublié</h2>
            <p>
              {step === 'email' && 'Saisissez votre e-mail pour recevoir un code de vérification.'}
              {step === 'otp' && 'Entrez le code reçu par e-mail.'}
              {step === 'password' && 'Choisissez un nouveau mot de passe.'}
              {step === 'done' && 'Votre mot de passe a été mis à jour.'}
            </p>
          </header>

          {step === 'done' ? (
            <div className="auth-success">
              <button
                type="button"
                className="btn-primary"
                onClick={() => navigate('/login')}
              >
                Se connecter
                <FiArrowRight />
              </button>
            </div>
          ) : step === 'email' ? (
            <form className="login-form" onSubmit={handleEmailSubmit}>
              <label className="field">
                <span>E-mail</span>
                <div className="field-input">
                  <FiMail />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
              </label>

              {formError && <p className="form-error">{formError}</p>}

              <button
                type="submit"
                className="btn-primary"
                disabled={forgotPassword.isPending}
              >
                {forgotPassword.isPending ? 'Envoi…' : 'Envoyer le code'}
                {!forgotPassword.isPending && <FiArrowRight />}
              </button>
            </form>
          ) : step === 'otp' ? (
            <form className="login-form" onSubmit={handleOtpSubmit}>
              <label className="field">
                <span>Code de vérification</span>
                <div className="field-input">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    autoComplete="one-time-code"
                    required
                  />
                </div>
              </label>

              {formError && <p className="form-error">{formError}</p>}

              <button
                type="submit"
                className="btn-primary"
                disabled={verifyOtp.isPending}
              >
                {verifyOtp.isPending ? 'Vérification…' : 'Vérifier le code'}
                {!verifyOtp.isPending && <FiArrowRight />}
              </button>
            </form>
          ) : (
            <form className="login-form" onSubmit={handlePasswordSubmit}>
              <label className="field">
                <span>Nouveau mot de passe</span>
                <div className="field-input">
                  <FiLock />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPasswordValue(e.target.value)}
                    autoComplete="new-password"
                    required
                    minLength={8}
                  />
                </div>
              </label>

              <label className="field">
                <span>Confirmation</span>
                <div className="field-input">
                  <FiLock />
                  <input
                    type="password"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    autoComplete="new-password"
                    required
                    minLength={8}
                  />
                </div>
              </label>

              {formError && <p className="form-error">{formError}</p>}

              <button
                type="submit"
                className="btn-primary"
                disabled={setPassword.isPending}
              >
                {setPassword.isPending ? 'Enregistrement…' : 'Enregistrer le mot de passe'}
                {!setPassword.isPending && <FiArrowRight />}
              </button>
            </form>
          )}

          <p className="login-back">
            <Link to="/login">← Retour à la connexion</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
