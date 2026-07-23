import { useState, type CSSProperties, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { FiArrowRight, FiLayout, FiLock, FiMail } from 'react-icons/fi';
import { useApp } from '../../context/AppContext';
import { useLogin, usePublicBranding } from '../../hooks';
import { clearSession } from '../../api/auth';
import { queryKeys } from '../../api/queryKeys';
import PageLoading from '../../components/ui/PageLoading';
import { DEV_SUPER_ADMIN } from '../../config/auth';
import { IS_SINGLE_TENANT } from '../../config/tenant';
import type { PublicTenantBranding, User } from '../../types';

/** Super admins have no tenant, so they may always sign in. Everyone else must belong
 *  to the tenant this deployment is pinned to. */
function isUserAllowed(user: User, brand: PublicTenantBranding | null): boolean {
  if (!IS_SINGLE_TENANT) return true;
  if (user.role === 'super_admin') return true;
  return Boolean(brand) && user.tenantId === brand!.id;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading } = useApp();
  const loginMutation = useLogin();
  const branding = usePublicBranding();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accessDenied, setAccessDenied] = useState(
    new URLSearchParams(location.search).has('denied'),
  );

  const brand = (IS_SINGLE_TENANT && branding.data?.tenant) || null;

  if (isLoading) {
    return <PageLoading fullScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAccessDenied(false);
    loginMutation.mutate(
      { email, password },
      {
        onSuccess: (data) => {
          if (!isUserAllowed(data.user, brand)) {
            // Undo the session the login hook just persisted — this account may not
            // sign in on this deployment.
            clearSession();
            queryClient.setQueryData(queryKeys.auth.session, null);
            setAccessDenied(true);
            return;
          }
          navigate('/dashboard');
        },
      },
    );
  };

  const brandName = brand ? brand.name : 'Acuria Partners';
  const brandTagline = brand
    ? (brand.orias ? `ORIAS n° ${brand.orias}` : 'Espace client sécurisé')
    : 'Plateforme multi-tenants de gestion de patrimoine pour CGP et MFO.';
  const formSubtitle = brand
    ? `Accédez à votre espace ${brand.name}`
    : "Accédez à l'espace de votre tenant";

  const pageStyle = brand
    ? ({ '--color-bronze': brand.accent } as CSSProperties)
    : undefined;

  return (
    <div className="login-page" style={pageStyle}>
      <div className="login-panel login-panel--brand">
        <div className="login-brand-content">
          {brand?.hasLogo && brand.logoDataUrl ? (
            <img src={brand.logoDataUrl} alt={brandName} className="login-logo login-logo--img" />
          ) : (
            <FiLayout className="login-logo" />
          )}
          <h1>{brandName}</h1>
          <p>{brandTagline}</p>
        </div>
        <p className="login-panel-footer">Hébergé en UE · Conforme RGPD</p>
      </div>

      <div className="login-panel login-panel--form">
        <div className="login-form-wrap">
          <header className="login-form-header">
            <h2>Connexion</h2>
            <p>{formSubtitle}</p>
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

            {accessDenied && (
              <p className="form-error">
                {`Cet espace est réservé aux utilisateurs de ${brandName}.`}
              </p>
            )}

            {loginMutation.isError && !accessDenied && (
              <p className="form-error">{loginMutation.error.message}</p>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={loginMutation.isPending || (IS_SINGLE_TENANT && branding.isLoading)}
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
