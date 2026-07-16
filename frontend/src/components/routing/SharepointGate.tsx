import { useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { FiCloud } from "react-icons/fi";
import { useApp } from "../../context/AppContext";
import { useSharepointStatus } from "../../hooks";
import PageLoading from "../ui/PageLoading";
import IntegrationsPage from "../../pages/settings/IntegrationsPage";

const INTEGRATIONS_PATH = "/dashboard/integrations";

interface SharepointGateProps {
  children: ReactNode;
}

/**
 * Blocks the dashboard until the tenant has connected their own SharePoint.
 *
 * Wraps the single dashboard shell in App.tsx, so one placement covers every
 * dashboard route. Super admins are platform-level and have no tenant to connect,
 * so they pass straight through.
 *
 * The tenant admin is the only one who can fix this, so they get the connect flow
 * itself; a standard user only gets told who to ask.
 */
export default function SharepointGate({ children }: SharepointGateProps) {
  const { user, isSuperAdmin, isTenantAdmin, isLoading } = useApp();
  const location = useLocation();
  const tenantId = user?.tenantId ?? null;

  const { data: sharepoint, isLoading: statusLoading } = useSharepointStatus(
    isSuperAdmin ? null : tenantId,
  );

  if (isLoading) return <PageLoading fullScreen />;

  // Platform-level users, and anyone not yet resolved to a tenant, are not gated.
  if (isSuperAdmin || !tenantId) return children;

  // Never gate the settings page itself — it is where the connection gets made,
  // and it is also where the OAuth callback lands.
  if (location.pathname === INTEGRATIONS_PATH) return children;

  if (statusLoading) return <PageLoading fullScreen />;
  if (sharepoint?.connected) return children;

  if (isTenantAdmin) return <IntegrationsPage fullScreen />;

  return (
    <div className="sp-screen">
      <div className="sp-card">
        <div className="sp-card__head">
          <span className="sp-card__icon"><FiCloud /></span>
          <div>
            <h2 className="sp-card__title">SharePoint n'est pas connecté</h2>
            <p className="sp-card__subtitle">Action administrateur requise</p>
          </div>
        </div>
        <p className="sp-card__text">
          L'administrateur de votre cabinet doit connecter votre compte Microsoft
          365 avant que la plateforme puisse être utilisée. Contactez-le pour
          débloquer l'accès.
        </p>
      </div>
    </div>
  );
}
