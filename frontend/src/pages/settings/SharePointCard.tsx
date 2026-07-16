import { useEffect, useState } from "react";
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
import { formatIntegrationDate } from "./integrationDate";

/**
 * The SharePoint connection card. Self-contained: reads its own status and owns its
 * connect/config/disconnect actions. Renders a read-only variant for standard users.
 * Query-param result toasts (?sharepoint=…) are handled by the parent IntegrationsPage.
 */
export default function SharePointCard() {
  const { user, isTenantAdmin } = useApp();
  const tenantId = user?.tenantId ?? null;
  const { notify } = useNotifications();
  const confirm = useConfirm();

  const { data: sharepoint } = useSharepointStatus(tenantId);
  const connect = useSharepointConnect();
  const saveConfig = useSharepointConfig();
  const disconnect = useSharepointDisconnect();

  const [siteId, setSiteId] = useState("");
  const [driveId, setDriveId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!sharepoint) return;
    setSiteId(sharepoint.siteId ?? "");
    setDriveId(sharepoint.driveId ?? "");
  }, [sharepoint]);

  if (!tenantId) return null;

  const hasTokens = Boolean(
    sharepoint?.connected || sharepoint?.siteId || sharepoint?.connectedAt,
  );

  // ── Standard users: read-only ───────────────────────────────────────────────
  if (!isTenantAdmin) {
    return (
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
            : "SharePoint n'est pas encore connecté. Contactez l'administrateur de votre cabinet."}
        </p>
      </div>
    );
  }

  const handleConnect = () => {
    connect.mutate(
      { tenantId },
      {
        onSuccess: (data) => {
          window.location.href = data.authorizeUrl;
        },
        onError: (error) =>
          notify({ title: "Impossible de démarrer la connexion", message: error.message, variant: "error" }),
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

  return (
    <div className="sp-card">
      <div className="sp-card__head">
        <span className={`sp-card__icon${sharepoint?.connected ? " sp-card__icon--ok" : ""}`}>
          {sharepoint?.connected ? <FiCheckCircle /> : <FiCloud />}
        </span>
        <div>
          <h2 className="sp-card__title">Microsoft 365 / SharePoint</h2>
          <p className="sp-card__subtitle">
            {sharepoint?.connected ? "Connecté" : hasTokens ? "Configuration requise" : "Non connecté"}
          </p>
        </div>
      </div>

      {!hasTokens && (
        <>
          <p className="sp-card__text">
            Vous serez redirigé vers Microsoft pour vous connecter et autoriser l'accès
            en lecture et écriture à vos sites SharePoint.
          </p>
          <div className="sp-card__actions">
            <button type="button" className="btn-primary" onClick={handleConnect} disabled={connect.isPending}>
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
              {formatIntegrationDate(sharepoint.connectedAt)}
              {sharepoint.connectedBy ? ` par ${sharepoint.connectedBy}` : ""}.
            </p>
          ) : (
            <p className="sp-card__text">
              Compte Microsoft connecté, mais le site SharePoint cible n'est pas encore
              défini. Renseignez le Site ID et le Drive ID pour terminer.
            </p>
          )}

          <form className="sp-form" onSubmit={handleSaveConfig}>
            <label className="field field--full">
              <span>Site ID</span>
              <div className="field-input">
                <input type="text" value={siteId} onChange={(e) => setSiteId(e.target.value)} placeholder="contoso.sharepoint.com,8f1c…,3b2a…" />
              </div>
            </label>
            <label className="field field--full">
              <span>Drive ID</span>
              <div className="field-input">
                <input type="text" value={driveId} onChange={(e) => setDriveId(e.target.value)} placeholder="b!x9Kd…" />
              </div>
            </label>
            {formError && <p className="sp-form__error">{formError}</p>}
            <div className="sp-card__actions">
              <button type="submit" className="btn-primary" disabled={saveConfig.isPending}>
                {saveConfig.isPending ? "Enregistrement…" : "Enregistrer"}
              </button>
              <button type="button" className="btn-secondary" onClick={handleDisconnect} disabled={disconnect.isPending}>
                {disconnect.isPending ? "Déconnexion…" : "Déconnecter"}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
