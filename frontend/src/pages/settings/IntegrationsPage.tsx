import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { useNotifications } from "../../context/NotificationContext";
import SharePointCard from "./SharePointCard";
import EmailCard from "./EmailCard";
import GateLogoutButton from "../../components/routing/GateLogoutButton";

/** Callback reason codes → French messages. Shared by both SharePoint and email
 *  results (the callbacks emit the same vocabulary). */
const ERROR_MESSAGES: Record<string, string> = {
  consent_denied:
    "Vous avez refusé l'autorisation. Réessayez et acceptez pour connecter.",
  admin_consent_required:
    "Votre organisation Microsoft exige l'approbation d'un administrateur pour cette application. Demandez à l'administrateur Microsoft 365 de votre cabinet d'accorder le consentement, puis réessayez.",
  invalid_state:
    "La session de connexion a expiré ou n'est pas valide. Relancez la connexion depuis cette page.",
  token_exchange_failed:
    "Le fournisseur a refusé la connexion. Réessayez, et contactez le support si le problème persiste.",
  provider_error: "Le fournisseur a renvoyé une erreur pendant la connexion. Réessayez.",
  microsoft_error: "Microsoft a renvoyé une erreur pendant la connexion. Réessayez.",
};

type IntegrationFocus = "sharepoint" | "email";

interface IntegrationsPageProps {
  /** Rendered by OnboardingGate as a blocking first-run screen. */
  fullScreen?: boolean;
  /** In gate mode, show only the step being onboarded. Omitted on the settings
   *  route, where both cards appear. */
  focus?: IntegrationFocus;
}

const SCREEN_COPY: Record<IntegrationFocus, { title: string; lead: string }> = {
  sharepoint: {
    title: "Connectez votre SharePoint",
    lead:
      "Connectez le compte Microsoft 365 de votre cabinet. Les documents réglementaires (DER, Lettre de Mission, FCC) seront déposés dans votre propre SharePoint.",
  },
  email: {
    title: "Connectez votre messagerie",
    lead:
      "Choisissez la messagerie depuis laquelle votre cabinet enverra ses emails. Vos destinataires verront votre propre adresse — pas une adresse partagée.",
  },
};

export default function IntegrationsPage({ fullScreen = false, focus }: IntegrationsPageProps) {
  const { user } = useApp();
  const tenantId = user?.tenantId ?? null;
  const navigate = useNavigate();
  const location = useLocation();
  const { notify } = useNotifications();

  // Both OAuth callbacks land here with ?sharepoint=… OR ?email=…&provider=…. Report
  // the result, then strip the query so a refresh doesn't replay the toast.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sp = params.get("sharepoint");
    const em = params.get("email");
    if (!sp && !em) return;

    if (sp === "connected") {
      notify({ title: "SharePoint connecté", variant: "success" });
    } else if (sp === "needs_config") {
      notify({
        title: "Compte Microsoft connecté",
        message:
          "Nous n'avons pas pu détecter votre site SharePoint automatiquement. Saisissez le Site ID et le Drive ID.",
        variant: "info",
      });
    } else if (sp) {
      notify({
        title: "Échec de la connexion SharePoint",
        message: ERROR_MESSAGES[params.get("reason") ?? ""] ?? ERROR_MESSAGES.provider_error,
        variant: "error",
      });
    }

    if (em === "connected") {
      notify({ title: "Messagerie connectée", variant: "success" });
    } else if (em) {
      notify({
        title: "Échec de la connexion de la messagerie",
        message: ERROR_MESSAGES[params.get("reason") ?? ""] ?? ERROR_MESSAGES.provider_error,
        variant: "error",
      });
    }

    navigate(location.pathname, { replace: true });
  }, [location.search, location.pathname, navigate, notify]);

  if (!tenantId) return null;

  // Gate mode: a single full-screen card for the step being onboarded.
  if (fullScreen && focus) {
    const copy = SCREEN_COPY[focus];
    return (
      <div className="sp-screen">
        <div className="sp-screen__intro">
          <h1 className="sp-screen__title">{copy.title}</h1>
          <p className="sp-screen__lead">{copy.lead}</p>
        </div>
        {focus === "sharepoint" ? <SharePointCard /> : <EmailCard />}
        <GateLogoutButton />
      </div>
    );
  }

  // Settings route: both integrations stacked.
  return (
    <div className="sp-page">
      <h1 className="sp-page__title">Intégrations</h1>
      <div className="sp-stack">
        <SharePointCard />
        <EmailCard />
      </div>
    </div>
  );
}
