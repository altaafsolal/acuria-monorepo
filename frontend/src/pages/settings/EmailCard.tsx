import { FiCheckCircle, FiMail } from "react-icons/fi";
import { useApp } from "../../context/AppContext";
import { useConfirm } from "../../context/ConfirmContext";
import { useNotifications } from "../../context/NotificationContext";
import { useEmailConnect, useEmailDisconnect, useEmailStatus } from "../../hooks";
import type { EmailProvider } from "../../types";
import { formatIntegrationDate } from "./integrationDate";

const PROVIDER_LABEL: Record<EmailProvider, string> = {
  microsoft: "Microsoft 365",
  google: "Gmail",
};

/**
 * The email connection card. A tenant connects EITHER Microsoft 365 OR Gmail as
 * their sending mailbox. Self-contained; result toasts (?email=…) are handled by the
 * parent IntegrationsPage. Read-only variant for standard users.
 */
export default function EmailCard() {
  const { user, isTenantAdmin } = useApp();
  const tenantId = user?.tenantId ?? null;
  const { notify } = useNotifications();
  const confirm = useConfirm();

  const { data: email } = useEmailStatus(tenantId);
  const connect = useEmailConnect();
  const disconnect = useEmailDisconnect();

  if (!tenantId) return null;

  const connected = Boolean(email?.connected);
  const scopeMissing = Boolean(email?.scopeMissing);

  // ── Standard users: read-only ───────────────────────────────────────────────
  if (!isTenantAdmin) {
    return (
      <div className="sp-card">
        <div className="sp-card__head">
          <span className="sp-card__icon"><FiMail /></span>
          <div>
            <h2 className="sp-card__title">Email d'envoi</h2>
            <p className="sp-card__subtitle">
              {connected && email?.provider
                ? `Connecté — ${email.senderAddress || PROVIDER_LABEL[email.provider]}`
                : "Non connecté"}
            </p>
          </div>
        </div>
        <p className="sp-card__text">
          {connected
            ? "La messagerie de votre cabinet est connectée. Aucune action requise de votre part."
            : "Aucune messagerie n'est connectée. Contactez l'administrateur de votre cabinet."}
        </p>
      </div>
    );
  }

  const handleConnect = (provider: EmailProvider) => {
    connect.mutate(
      { tenantId, provider },
      {
        onSuccess: (data) => {
          window.location.href = data.authorizeUrl;
        },
        onError: (error) =>
          notify({ title: "Impossible de démarrer la connexion", message: error.message, variant: "error" }),
      },
    );
  };

  const handleDisconnect = async () => {
    const confirmed = await confirm({
      title: "Déconnecter la messagerie ?",
      message:
        "Les emails ne seront plus envoyés depuis la boîte de votre cabinet tant qu'un administrateur n'aura pas reconnecté un compte.",
      confirmLabel: "Déconnecter",
      variant: "danger",
    });
    if (!confirmed) return;
    disconnect.mutate(
      { tenantId },
      {
        onSuccess: () => notify({ title: "Messagerie déconnectée", variant: "success" }),
        onError: (error) =>
          notify({ title: "Échec de la déconnexion", message: error.message, variant: "error" }),
      },
    );
  };

  const pendingProvider = connect.isPending;

  return (
    <div className="sp-card">
      <div className="sp-card__head">
        <span className={`sp-card__icon${connected ? " sp-card__icon--ok" : ""}`}>
          {connected ? <FiCheckCircle /> : <FiMail />}
        </span>
        <div>
          <h2 className="sp-card__title">Email d'envoi</h2>
          <p className="sp-card__subtitle">
            {connected && email?.provider ? `Connecté — ${PROVIDER_LABEL[email.provider]}` : "Non connecté"}
          </p>
        </div>
      </div>

      {/* Microsoft connected but missing Mail.Send (connected for SharePoint before
          email existed): prompt a reconnect. */}
      {scopeMissing && (
        <p className="sp-form__error">
          Nous avons ajouté l'envoi d'emails. Veuillez reconnecter votre compte Microsoft
          pour accorder l'autorisation d'envoi.
        </p>
      )}

      {!connected && (
        <>
          <p className="sp-card__text">
            Choisissez la messagerie depuis laquelle votre cabinet enverra ses emails
            (documents réglementaires, relances DocuSign). Les destinataires verront votre
            propre adresse.
          </p>
          <div className="sp-card__actions">
            <button
              type="button"
              className="btn-primary"
              onClick={() => handleConnect("microsoft")}
              disabled={pendingProvider}
            >
              {pendingProvider ? "Redirection…" : "Connecter Microsoft 365"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => handleConnect("google")}
              disabled={pendingProvider}
            >
              {pendingProvider ? "Redirection…" : "Connecter Gmail"}
            </button>
          </div>
        </>
      )}

      {connected && email && (
        <>
          <p className="sp-card__text">
            Emails envoyés depuis <strong>{email.senderAddress || "—"}</strong>
            {email.provider ? ` via ${PROVIDER_LABEL[email.provider]}` : ""}, connecté le{" "}
            {formatIntegrationDate(email.connectedAt)}
            {email.connectedBy ? ` par ${email.connectedBy}` : ""}.
          </p>
          <div className="sp-card__actions">
            {scopeMissing && (
              <button
                type="button"
                className="btn-primary"
                onClick={() => handleConnect("microsoft")}
                disabled={pendingProvider}
              >
                {pendingProvider ? "Redirection…" : "Reconnecter Microsoft 365"}
              </button>
            )}
            <button
              type="button"
              className="btn-secondary"
              onClick={handleDisconnect}
              disabled={disconnect.isPending}
            >
              {disconnect.isPending ? "Déconnexion…" : "Déconnecter"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
