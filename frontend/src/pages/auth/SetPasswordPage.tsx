import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FiArrowRight, FiLayout, FiLock } from 'react-icons/fi';
import { useSetPassword } from '../../hooks';


export default function SetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setPassword = useSetPassword();

  const uid = searchParams.get('uid') ?? '';
  const token = searchParams.get('token') ?? '';

  const [password, setPasswordValue] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!uid || !token) {
      setFormError('Lien invalide ou expiré.');
      return;
    }
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
        onSuccess: () => setSuccess(true),
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
          <p>Définissez votre mot de passe pour accéder à la plateforme.</p>
        </div>
      </div>

      <div className="login-panel login-panel--form">
        <div className="login-form-wrap">
          <header className="login-form-header">
            <h2>Nouveau mot de passe</h2>
            <p>Choisissez un mot de passe sécurisé pour votre compte.</p>
          </header>

          {success ? (
            <div className="auth-success">
              <p>Votre mot de passe a été enregistré.</p>
              <button
                type="button"
                className="btn-primary"
                onClick={() => navigate('/login')}
              >
                Se connecter
                <FiArrowRight />
              </button>
            </div>
          ) : (
            <form className="login-form" onSubmit={handleSubmit}>
              <label className="field">
                <span>Mot de passe</span>
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
