import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { FiArrowRight, FiLayout, FiLock, FiMail } from 'react-icons/fi';
import { useApp } from '../../context/AppContext';
import { useLogin } from '../../hooks';
import PageLoading from '../../components/ui/PageLoading';
import { DEV_SUPER_ADMIN } from '../../config/auth';


export default function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useApp();
  const loginMutation = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (isLoading) {
    return <PageLoading fullScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    loginMutation.mutate(
      { email, password },
      { onSuccess: () => navigate('/dashboard') },
    );
  };

  return (
    <div className="login-page">
      <div className="login-panel login-panel--brand">
        <div className="login-brand-content">
          <FiLayout className="login-logo" />
          <h1>Acuria Partners</h1>
          <p>Plateforme multi-tenants de gestion de patrimoine pour CGP et MFO.</p>
        </div>
        <p className="login-panel-footer">Hébergé en UE · Conforme RGPD</p>
      </div>

      <div className="login-panel login-panel--form">
        <div className="login-form-wrap">
          <header className="login-form-header">
            <h2>Connexion</h2>
            <p>Accédez à l&apos;espace de votre tenant</p>
          </header>

          <form className="login-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>E-mail</span>
              <div className="field-input">
                <FiMail />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@tenant.com"
                  autoComplete="email"
                  required
                />
              </div>
            </label>

            <label className="field">
              <span>Mot de passe</span>
              <div className="field-input">
                <FiLock />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </div>
            </label>

            <p className="login-forgot">
              <Link to="/forgot-password">Mot de passe oublié ?</Link>
            </p>

            {loginMutation.isError && (
              <p className="form-error">{loginMutation.error.message}</p>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? 'Connexion…' : 'Se connecter'}
              {!loginMutation.isPending && <FiArrowRight />}
            </button>
          </form>

          {import.meta.env.DEV && (
            <p className="login-dev-hint">
              {`Connexion dev : ${DEV_SUPER_ADMIN.email} / ${DEV_SUPER_ADMIN.password}`}
            </p>
          )}

          <p className="login-back">
            <Link to="/">← Retour à l&apos;accueil</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
