import { useEffect, useMemo, useState } from "react";
import { FiCheckCircle, FiCloud } from "react-icons/fi";
import { useApp } from "../../context/AppContext";
import { useConfirm } from "../../context/ConfirmContext";
import { useNotifications } from "../../context/NotificationContext";
import {
  useSharepointConfig,
  useSharepointConnect,
  useSharepointDisconnect,
  useSharepointDrives,
  useSharepointSites,
  useSharepointStatus,
} from "../../hooks";
import { formatIntegrationDate } from "./integrationDate";

const SITE_SEARCH_DEBOUNCE_MS = 300;

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

  const [siteSearch, setSiteSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [siteId, setSiteId] = useState("");
  const [siteDisplayName, setSiteDisplayName] = useState("");
  const [driveId, setDriveId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(siteSearch.trim());
    }, SITE_SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [siteSearch]);

  useEffect(() => {
    if (!sharepoint) return;
    setSiteId(sharepoint.siteId ?? "");
    setSiteDisplayName(sharepoint.siteDisplayName ?? "");
    setDriveId(sharepoint.driveId ?? "");
  }, [sharepoint]);

  const hasTokens = Boolean(
    sharepoint?.connected || sharepoint?.siteId || sharepoint?.connectedAt,
  );

  const {
    data: sites,
    isFetching: sitesLoading,
    error: sitesError,
  } = useSharepointSites(tenantId, debouncedSearch, hasTokens && Boolean(isTenantAdmin));

  const {
    data: drives,
    isFetching: drivesLoading,
    error: drivesError,
  } = useSharepointDrives(tenantId, siteId, hasTokens && Boolean(isTenantAdmin) && Boolean(siteId));

  const siteOptions = useMemo(() => {
    const list = sites ?? [];
    if (siteId && !list.some((site) => site.id === siteId)) {
      return [
        {
          id: siteId,
          displayName: siteDisplayName || siteId,
          webUrl: null,
        },
        ...list,
      ];
    }
    return list;
  }, [sites, siteId, siteDisplayName]);

  const driveOptions = useMemo(() => {
    const list = drives ?? [];
    if (driveId && !list.some((drive) => drive.id === driveId)) {
      return [{ id: driveId, name: "Bibliothèque actuelle" }, ...list];
    }
    return list;
  }, [drives, driveId]);

  // When drives load for a newly chosen site with no drive yet, prefer Documents.
  useEffect(() => {
    if (!drives || drives.length === 0) return;
    if (driveId) return;
    const preferred =
      drives.find((drive) => /documents?/i.test(drive.name))
      ?? drives[0];
    if (preferred) setDriveId(preferred.id);
  }, [drives, driveId]);

  if (!tenantId) return null;

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

  const handleSiteChange = (nextSiteId: string) => {
    setSiteId(nextSiteId);
    const selected = siteOptions.find((site) => site.id === nextSiteId);
    setSiteDisplayName(selected?.displayName ?? "");
    setDriveId("");
    setFormError(null);
  };

  const handleSaveConfig = (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (!siteId.trim() || !driveId.trim()) {
      setFormError("Choisissez un site et une bibliothèque de documents.");
      return;
    }
    const displayName =
      siteDisplayName
      || siteOptions.find((site) => site.id === siteId)?.displayName
      || undefined;
    saveConfig.mutate(
      {
        tenantId,
        siteId: siteId.trim(),
        driveId: driveId.trim(),
        ...(displayName ? { siteDisplayName: displayName } : {}),
      },
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

  const listError = sitesError?.message || drivesError?.message || null;

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
              défini. Choisissez un site et une bibliothèque pour terminer.
            </p>
          )}

          <form className="sp-form" onSubmit={handleSaveConfig}>
            <label className="field field--full">
              <span>Rechercher un site</span>
              <div className="field-input">
                <input
                  type="search"
                  value={siteSearch}
                  onChange={(e) => setSiteSearch(e.target.value)}
                  placeholder="Nom du site SharePoint…"
                  autoComplete="off"
                />
              </div>
            </label>

            <label className="field field--full">
              <span>Site SharePoint</span>
              <div className="field-input">
                <select
                  value={siteId}
                  onChange={(e) => handleSiteChange(e.target.value)}
                  disabled={sitesLoading && siteOptions.length === 0}
                >
                  <option value="">
                    {sitesLoading ? "Chargement…" : "Sélectionner un site"}
                  </option>
                  {siteOptions.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.displayName}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <label className="field field--full">
              <span>Bibliothèque de documents</span>
              <div className="field-input">
                <select
                  value={driveId}
                  onChange={(e) => {
                    setDriveId(e.target.value);
                    setFormError(null);
                  }}
                  disabled={!siteId || (drivesLoading && driveOptions.length === 0)}
                >
                  <option value="">
                    {!siteId
                      ? "Choisissez d'abord un site"
                      : drivesLoading
                        ? "Chargement…"
                        : "Sélectionner une bibliothèque"}
                  </option>
                  {driveOptions.map((drive) => (
                    <option key={drive.id} value={drive.id}>
                      {drive.name}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            {(formError || listError) && (
              <p className="sp-form__error">{formError || listError}</p>
            )}
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
