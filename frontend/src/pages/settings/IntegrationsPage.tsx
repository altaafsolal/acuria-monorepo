import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FiCheckCircle, FiCloud } from "react-icons/fi";
import { useApp } from "../../context/AppContext";
import { useConfirm } from "../../context/ConfirmContext";
import { useNotifications } from "../../context/NotificationContext";
import {
  useSharepointConfig,
  useSharepointConnect,
  useSharepointDisconnect,
  useSharepointStatus,
} from "../../hooks";
import PageLoading from "../../components/ui/PageLoading";

/** Microsoft's failure modes, translated. The callback only ever sends us a short
 *  reason code — never a raw error — so this is the whole vocabulary. */
const ERROR_MESSAGES: Record<string, string> = {
  consent_denied:
    "Vous avez refusé l'autorisation. Réessayez et acceptez pour connecter SharePoint.",
  admin_consent_required:
    "Votre organisation Microsoft exige l'approbation d'un administrateur pour cette application. Demandez à l'administrateur Microsoft 365 de votre cabinet d'accorder le consentement, puis réessayez.",
  invalid_state:
    "La session de connexion a expiré ou n'est pas valide. Relancez la connexion depuis cette page.",
  token_exchange_failed:
    "Microsoft a refusé la connexion. Réessayez, et contactez le support si le problème persiste.",
  microsoft_error:
    "Microsoft a renvoyé une erreur pendant la connexion. Réessayez.",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

interface IntegrationsPageProps {
  /** Rendered by SharepointGate as a blocking first-run screen rather than as a
   *  normal settings page. Only changes the framing. */
  fullScreen?: boolean;
}

export default function IntegrationsPage({ fullScreen = false }: IntegrationsPageProps) {
  const { user, isTenantAdmin } = useApp();
  const tenantId = user?.tenantId ?? null;
  const navigate = useNavigate();
  const location = useLocation();
  const { notify } = useNotifications();
  const confirm = useConfirm();

  const { data: sharepoint, isLoading } = useSharepointStatus(tenantId);
  const connect = useSharepointConnect();
  const saveConfig = useSharepointConfig();
  const disconnect = useSharepointDisconnect();

  const [siteId, setSiteId] = useState("");
  const [driveId, setDriveId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Prefill from whatever the callback auto-resolved, so the common path is
  // "read the values, click Enregistrer" rather than "go find them in Graph".
  useEffect(() => {
    if (!sharepoint) return;
    setSiteId(sharepoint.siteId ?? "");
    setDriveId(sharepoint.driveId ?? "");
  }, [sharepoint]);

  // The OAuth callback redirects back here with ?sharepoint=…&reason=…. Report it,
  // then strip the params so a refresh doesn't replay the toast.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const result = params.get("sharepoint");
    if (!result) return;

    if (result === "connected") {
      notify({ title: "SharePoint connecté", variant: "success" });
    } else if (result === "needs_config") {
      notify({
        title: "Compte Microsoft connecté",
        message:
          "Nous n'avons pas pu détecter votre site SharePoint automatiquement. Saisissez le Site ID et le Drive ID ci-dessous.",
        variant: "info",
      });
    } else {
      const reason = params.get("reason") ?? "";
      notify({
        title: "Échec de la connexion SharePoint",
        message: ERROR_MESSAGES[reason] ?? ERROR_MESSAGES.microsoft_error,
        variant: "error",
      });
    }

    navigate(location.pathname, { replace: true });
  }, [location.search, location.pathname, navigate, notify]);

  if (!tenantId) return null;
  if (isLoading) return <PageLoading fullScreen={fullScreen} />;

  const hasTokens = Boolean(
    sharepoint?.connected || sharepoint?.siteId || sharepoint?.connectedAt,
  );

  const handleConnect = () => {
    connect.mutate(
      { tenantId },
      {
        // The backend hands back a URL instead of redirecting, because this
        // request needs our Bearer token. We do the navigation ourselves.
        onSuccess: (data) => {
          window.location.href = data.authorizeUrl;
        },
        onError: (error) => {
          notify({
            title: "Impossible de démarrer la connexion",
            message: error.message,
            variant: "error",
          });
        },
      },
    );
  };

  const handleSaveConfig = (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (!siteId.trim() || !driveId.trim()) {
      setFormError("Le Site ID et le Drive ID sont obligatoires.");
      return;
    }

    saveConfig.mutate(
      { tenantId, siteId: siteId.trim(), driveId: driveId.trim() },
      {
        onSuccess: () => notify({ title: "Configuration enregistrée", variant: "success" }),
        onError: (error) => setFormError(error.message),
      },
    );
  };

  const handleDisconnect = async () => {
    const confirmed = await confirm({
      title: "Déconnecter SharePoint ?",
      message:
        "Les documents ne seront plus envoyés vers SharePoint tant qu'un administrateur n'aura pas reconnecté un compte Microsoft.",
      confirmLabel: "Déconnecter",
      variant: "danger",
    });
    if (!confirmed) return;

    disconnect.mutate(
      { tenantId },
      {
        onSuccess: () => notify({ title: "SharePoint déconnecté", variant: "success" }),
        onError: (error) =>
          notify({ title: "Échec de la déconnexion", message: error.message, variant: "error" }),
      },
    );
  };

  // ── Standard users: read-only, cannot act ──────────────────────────────────
  if (!isTenantAdmin) {
    const body = (
      <div className="sp-card">
        <div className="sp-card__head">
          <span className="sp-card__icon"><FiCloud /></span>
          <div>
            <h2 className="sp-card__title">Microsoft 365 / SharePoint</h2>
            <p className="sp-card__subtitle">
              {sharepoint?.connected
                ? `Connecté — ${sharepoint.siteDisplayName || "site inconnu"}`
                : "Non connecté"}
            </p>
          </div>
        </div>
        <p className="sp-card__text">
          {sharepoint?.connected
            ? "Votre cabinet est connecté à SharePoint. Aucune action requise de votre part."
            : "SharePoint n'est pas encore connecté. Contactez l'administrateur de votre cabinet pour l'activer."}
        </p>
      </div>
    );
    return fullScreen ? <div className="sp-screen">{body}</div> : (
      <div className="sp-page">
        <h1 className="sp-page__title">Intégrations</h1>
        {body}
      </div>
    );
  }

  // ── Tenant admin ────────────────────────────────────────────────────────────
  const card = (
    <div className="sp-card">
      <div className="sp-card__head">
        <span className={`sp-card__icon${sharepoint?.connected ? " sp-card__icon--ok" : ""}`}>
          {sharepoint?.connected ? <FiCheckCircle /> : <FiCloud />}
        </span>
        <div>
          <h2 className="sp-card__title">Microsoft 365 / SharePoint</h2>
          <p className="sp-card__subtitle">
            {sharepoint?.connected
              ? "Connecté"
              : hasTokens
                ? "Configuration requise"
                : "Non connecté"}
          </p>
        </div>
      </div>

      {!hasTokens && (
        <>
          <p className="sp-card__text">
            Vous serez redirigé vers Microsoft pour vous connecter et autoriser
            l'accès en lecture et écriture à vos sites SharePoint.
          </p>
          <div className="sp-card__actions">
            <button
              type="button"
              className="btn-primary"
              onClick={handleConnect}
              disabled={connect.isPending}
            >
              {connect.isPending ? "Redirection…" : "Connecter SharePoint"}
            </button>
          </div>
        </>
      )}

      {hasTokens && (
        <>
          {sharepoint?.connected ? (
            <p className="sp-card__text">
              Connecté à <strong>{sharepoint.siteDisplayName || "—"}</strong> le{" "}
              {formatDate(sharepoint.connectedAt)}
              {sharepoint.connectedBy ? ` par ${sharepoint.connectedBy}` : ""}.
            </p>
          ) : (
            <p className="sp-card__text">
              Compte Microsoft connecté, mais le site SharePoint cible n'est pas
              encore défini. Renseignez le Site ID et le Drive ID pour terminer.
            </p>
          )}

          <form className="sp-form" onSubmit={handleSaveConfig}>
            <label className="field field--full">
              <span>Site ID</span>
              <div className="field-input">
                <input
                  type="text"
                  value={siteId}
                  onChange={(e) => setSiteId(e.target.value)}
                  placeholder="contoso.sharepoint.com,8f1c…,3b2a…"
                />
              </div>
            </label>

            <label className="field field--full">
              <span>Drive ID</span>
              <div className="field-input">
                <input
                  type="text"
                  value={driveId}
                  onChange={(e) => setDriveId(e.target.value)}
                  placeholder="b!x9Kd…"
                />
              </div>
            </label>

            {formError && <p className="sp-form__error">{formError}</p>}

            <div className="sp-card__actions">
              <button type="submit" className="btn-primary" disabled={saveConfig.isPending}>
                {saveConfig.isPending ? "Enregistrement…" : "Enregistrer"}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleDisconnect}
                disabled={disconnect.isPending}
              >
                {disconnect.isPending ? "Déconnexion…" : "Déconnecter"}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="sp-screen">
        <div className="sp-screen__intro">
          <h1 className="sp-screen__title">Connectez votre SharePoint</h1>
          <p className="sp-screen__lead">
            Avant d'utiliser la plateforme, connectez le compte Microsoft 365 de
            votre cabinet. Les documents réglementaires (DER, Lettre de Mission,
            FCC) seront déposés dans votre propre SharePoint.
          </p>
        </div>
        {card}
      </div>
    );
  }

  return (
    <div className="sp-page">
      <h1 className="sp-page__title">Intégrations</h1>
      {card}
    </div>
  );
}
