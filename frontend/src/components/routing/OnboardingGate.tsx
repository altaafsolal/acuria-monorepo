import type { ReactNode } from "react";
import { FiCloud, FiMail } from "react-icons/fi";
import { useApp } from "../../context/AppContext";
import { useEmailStatus, useSharepointStatus } from "../../hooks";
import PageLoading from "../ui/PageLoading";
import IntegrationsPage from "../../pages/settings/IntegrationsPage";
import GateLogoutButton from "./GateLogoutButton";

interface OnboardingGateProps {
  children: ReactNode;
}

/** Standard-user blocking screen for a not-yet-connected integration. They can't
 *  fix it themselves, so they're told who to ask — plus a way to sign out. */
function AwaitingAdmin({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="sp-screen">
      <div className="sp-card">
        <div className="sp-card__head">
          <span className="sp-card__icon">{icon}</span>
          <div>
            <h2 className="sp-card__title">{title}</h2>
            <p className="sp-card__subtitle">Action administrateur requise</p>
          </div>
        </div>
        <p className="sp-card__text">
          L'administrateur de votre cabinet doit terminer la configuration avant que la
          plateforme puisse être utilisée. Contactez-le pour débloquer l'accès.
        </p>
      </div>
      <GateLogoutButton />
    </div>
  );
}

/**
 * Two-step onboarding gate: a tenant must connect SharePoint AND an email provider
 * before reaching the dashboard. Wraps the single dashboard shell in App.tsx, so one
 * placement covers every dashboard route.
 *
 * Super admins are platform-level (no tenant to connect) and pass through. The
 * tenant admin gets the connect flow for whichever step is pending; a standard user
 * only gets told who to ask.
 */
export default function OnboardingGate({ children }: OnboardingGateProps) {
  const { user, isSuperAdmin, isTenantAdmin, isLoading } = useApp();
  const tenantId = user?.tenantId ?? null;
  const gatedTenant = isSuperAdmin ? null : tenantId;

  const { data: sharepoint, isLoading: spLoading } = useSharepointStatus(gatedTenant);
  const { data: email, isLoading: emailLoading } = useEmailStatus(gatedTenant);

  if (isLoading) return <PageLoading fullScreen />;

  // Platform-level users, and anyone not yet resolved to a tenant, are not gated.
  if (isSuperAdmin || !tenantId) return children;

  // NB: the settings page (/dashboard/integrations) is intentionally gated too. The
  // blocking screen IS the connect/reconnect UI, so a disconnected admin lands on it
  // immediately (disconnect invalidates the status queries → this re-renders). The
  // OAuth callbacks redirect here as well; the fullscreen IntegrationsPage still runs
  // the ?sharepoint=/?email= result toasts. When both are connected, the gate passes
  // and the real settings page renders inside the dashboard.

  if (spLoading || emailLoading) return <PageLoading fullScreen />;

  // Step 1: SharePoint.
  if (!sharepoint?.connected) {
    return isTenantAdmin
      ? <IntegrationsPage fullScreen focus="sharepoint" />
      : <AwaitingAdmin icon={<FiCloud />} title="SharePoint n'est pas connecté" />;
  }

  // Step 2: email provider.
  if (!email?.connected) {
    return isTenantAdmin
      ? <IntegrationsPage fullScreen focus="email" />
      : <AwaitingAdmin icon={<FiMail />} title="Aucune messagerie n'est connectée" />;
  }

  return children;
}
