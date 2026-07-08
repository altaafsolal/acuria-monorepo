import { useMemo, useState } from "react";
import { FiRefreshCw, FiX } from "react-icons/fi";

import ClientPanel from "../../components/clients/ClientPanel";
import Modal from "../../components/ui/Modal";
import PageLoading from "../../components/ui/PageLoading";
import Select from "../../components/ui/Select";
import {
  useAccueil,
  useKycDerClients,
  useKycSignataires,
  useSendDer,
  useSendDerDocuSign,
  useSendLdm,
} from "../../hooks";
import { queryKeys } from "../../api/queryKeys";
import { useQueryClient } from "@tanstack/react-query";
import api from "../../api";
import { postAuthenticatedBlob } from "../../lib/authenticatedBlob";
import type { Client } from "../../types";
import {
  docBadgeClass,
  docBadgeLabel,
  formatDateFr,
  formatDateTimeFr,
  isPersonneMorale,
  ldmAvailableDate,
  ldmIsUnlocked,
  statutClientBadgeClass,
} from "../../utils/kyc";

const FILTERS = [
  { value: "", label: "Tous" },
  { value: "non_envoye", label: "Non envoyés" },
  { value: "envoye", label: "Envoyés" },
  { value: "signe", label: "Signés" },
] as const;

const VITE_DER_TEMPLATE_URL = import.meta.env.VITE_DER_TEMPLATE_URL as
  | string
  | undefined;
const DER_TEMPLATE_URL = VITE_DER_TEMPLATE_URL ? VITE_DER_TEMPLATE_URL : "";

type StatusMsg = { type: "success" | "error" | "loading"; text: string };

export default function KycDerPage() {
  const [filter, setFilter] = useState("");
  const [panelClientId, setPanelClientId] = useState<string | null>(null);
  const [modalClient, setModalClient] = useState<Client | null>(null);
  const [signataireName, setSignataireName] = useState("");
  const [signataireEmail, setSignataireEmail] = useState("");
  const [ldmType, setLdmType] = useState("PP_SANS");
  const [montantForfait, setMontantForfait] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<StatusMsg | null>(null);

  const queryClient = useQueryClient();
  const { data: accueil } = useAccueil();
  const {
    data: clients = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useKycDerClients(filter);
  const { data: signataires = [] } = useKycSignataires();
  const sendDer = useSendDer();
  const sendDerDocuSign = useSendDerDocuSign();
  const sendLdm = useSendLdm();

  const stats = accueil?.stats.der;

  const handleRefresh = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: queryKeys.accueil.data });
  };

  const openModal = (client: Client) => {
    setModalClient(client);
    setStatusMsg(null);
    setMontantForfait("");
    const defaultSig = signataires[0];
    setSignataireName(defaultSig?.name || "");
    setSignataireEmail(defaultSig?.email || "");
    const isPm = isPersonneMorale(client.clientType);
    setLdmType(isPm ? "PM_SANS" : "PP_SANS");
  };

  const closeModal = () => {
    setModalClient(null);
    setStatusMsg(null);
    setMontantForfait("");
  };

  const handleSignataireChange = (name: string) => {
    setSignataireName(name);
    const sig = signataires.find((s) => s.name === name);
    if (sig) setSignataireEmail(sig.email);
  };

  const handlePreviewDer = () => {
    if (!DER_TEMPLATE_URL) {
      setStatusMsg({
        type: "error",
        text: "VITE_DER_TEMPLATE_ID non configuré dans frontend/.env",
      });
      return;
    }
    window.open(DER_TEMPLATE_URL, "_blank");
  };

  const handlePreviewLdm = async () => {
    if (!modalClient || !ldmType) return;
    setPreviewLoading(true);
    setStatusMsg({
      type: "loading",
      text: "Génération de la prévisualisation…",
    });
    try {
      const blob = await postAuthenticatedBlob(api.kycLdmPreview, {
        clientId: modalClient.id,
        signataireName,
        signataireEmail,
        ldmType,
        montantForfait: montantForfait || undefined,
      });
      window.open(URL.createObjectURL(blob), "_blank");
      setStatusMsg({
        type: "success",
        text: "Prévisualisation ouverte dans un nouvel onglet.",
      });
    } catch (e) {
      setStatusMsg({
        type: "error",
        text: e instanceof Error ? e.message : "Erreur de génération",
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSendDer = () => {
    if (!modalClient) return;
    setStatusMsg(null);
    sendDer.mutate(
      {
        clientId: modalClient.id,
        signataireName,
        signataireEmail,
        ldmType,
        montantForfait: montantForfait || undefined,
      },
      {
        onSuccess: () =>
          setStatusMsg({
            type: "success",
            text: "DER envoyée par email ! LdM disponible dans 48h.",
          }),
        onError: (e) =>
          setStatusMsg({
            type: "error",
            text: e instanceof Error ? e.message : "Échec de l'envoi",
          }),
      },
    );
  };

  const handleSendDerDocuSign = () => {
    if (!modalClient) return;
    setStatusMsg(null);
    sendDerDocuSign.mutate(
      {
        clientId: modalClient.id,
        signataireName,
        signataireEmail,
        ldmType,
        montantForfait: montantForfait || undefined,
      },
      {
        onSuccess: () =>
          setStatusMsg({
            type: "success",
            text: "DER envoyée via DocuSign ! LdM disponible dans 48h.",
          }),
        onError: (e) =>
          setStatusMsg({
            type: "error",
            text: e instanceof Error ? e.message : "Échec de l'envoi",
          }),
      },
    );
  };

  const handleSendLdm = () => {
    if (!modalClient) return;
    if (
      (ldmType === "PP_AVEC" || ldmType === "PM_AVEC") &&
      !montantForfait.trim()
    ) {
      setStatusMsg({
        type: "error",
        text: "Montant forfaitaire obligatoire pour ce type de LdM.",
      });
      return;
    }
    setStatusMsg(null);
    sendLdm.mutate(
      {
        clientId: modalClient.id,
        signataireName,
        signataireEmail,
        ldmType,
        montantForfait: montantForfait || undefined,
      },
      {
        onSuccess: () =>
          setStatusMsg({
            type: "success",
            text: "LdM envoyée en signature DocuSign !",
          }),
        onError: (e) =>
          setStatusMsg({
            type: "error",
            text: e instanceof Error ? e.message : "Échec de l'envoi",
          }),
      },
    );
  };

  const derStats = useMemo(
    () =>
      stats ?? {
        total: clients.length,
        aEnvoyer: 0,
        derEnvoye: 0,
        ldmEnvoye: 0,
        signe: 0,
      },
    [stats, clients.length],
  );

  const isPmClient = modalClient
    ? isPersonneMorale(modalClient.clientType)
    : false;
  const modalAvail = modalClient ? ldmAvailableDate(modalClient.derDate) : null;
  const ldmUnlocked = modalClient ? ldmIsUnlocked(modalClient.derDate) : false;

  return (
    <div className="page-content">
      <div className="stats-row stats-row--5">
        <div className="stat-card">
          <div className="stat-label">Total</div>
          <div className="stat-val">{derStats.total}</div>
          <div className="stat-sub">clients actifs</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">DER à envoyer</div>
          <div className="stat-val stat-val--red">{derStats.aEnvoyer}</div>
          <div className="stat-sub trend-warn">Non traités</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">DER envoyée</div>
          <div className="stat-val stat-val--orange">{derStats.derEnvoye}</div>
          <div className="stat-sub">En attente LdM</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">LdM envoyée</div>
          <div className="stat-val stat-val--blue">{derStats.ldmEnvoye}</div>
          <div className="stat-sub">En attente signature</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">LdM signée</div>
          <div className="stat-val stat-val--green">{derStats.signe}</div>
          <div className="stat-sub trend-up">Complétés</div>
        </div>
      </div>

      <div className="card">
        <div className="card-toolbar">
          <h2 className="card-title">Suivi DER / Lettre de Mission</h2>
          <button
            type="button"
            className="btn-secondary btn-secondary--sm"
            onClick={handleRefresh}
            disabled={isFetching}
          >
            <FiRefreshCw
              className={isFetching ? "animate-spin-app" : undefined}
            />
            Rafraîchir
          </button>
        </div>
        <div className="filter-bar">
          {FILTERS.map((f) => (
            <button
              key={f.value || "all"}
              type="button"
              className={`status-pill${filter === f.value ? " active" : ""}`}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {isLoading && <PageLoading />}
        {isError && <p className="form-error">{error.message}</p>}

        {!isLoading && !isError && (
          <div className="data-table-wrap">
            <table className="nm-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Type</th>
                  <th>Statut</th>
                  <th>DER</th>
                  <th>LdM dispo le</th>
                  <th>Lettre de mission</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="data-table__empty">
                      Aucun client pour ce filtre.
                    </td>
                  </tr>
                ) : (
                  clients.map((client) => {
                    const isPm = isPersonneMorale(client.clientType);
                    const rowAvail = ldmAvailableDate(client.derDate);
                    const rowUnlocked = ldmIsUnlocked(client.derDate);
                    return (
                      <tr key={client.id}>
                        <td>
                          <button
                            type="button"
                            className="link-name"
                            onClick={() => setPanelClientId(client.id)}
                          >
                            {client.name}
                          </button>
                        </td>
                        <td>
                          <span
                            className={`client-type type-${isPm ? "pm" : "pp"}`}
                          >
                            {isPm ? "PM" : "PP"}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`crm-badge ${statutClientBadgeClass(client.statutClient)}`}
                          >
                            {client.statutClient}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`crm-badge ${docBadgeClass(client.derStatut)}`}
                          >
                            {docBadgeLabel(client.derStatut)}
                          </span>
                          {client.derEnvoiTimestamp && (
                            <small className="der-timestamp">
                              📧 {formatDateTimeFr(client.derEnvoiTimestamp)}
                            </small>
                          )}
                        </td>
                        <td>
                          {rowAvail ? (
                            <span
                              className={
                                rowUnlocked ? "text-green" : "text-orange"
                              }
                            >
                              {rowUnlocked ? "✅" : "⏳"}{" "}
                              {formatDateFr(rowAvail.toISOString())}
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td>
                          <span
                            className={`crm-badge ${docBadgeClass(client.ldmStatut)}`}
                          >
                            {docBadgeLabel(client.ldmStatut)}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn-bronze btn-sm"
                            onClick={() => openModal(client)}
                          >
                            DER / LdM
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {panelClientId && (
        <ClientPanel
          clientId={panelClientId}
          onClose={() => setPanelClientId(null)}
        />
      )}

      <Modal
        open={Boolean(modalClient)}
        onClose={closeModal}
        className="modal-card--wide modal-card--form modal-card--shell"
        titleId="kyc-der-modal-title"
      >
        {modalClient && (
          <>
            <header className="modal-card__header">
              <h2 id="kyc-der-modal-title" className="modal-card__title">
                DER &amp; Lettre de Mission
              </h2>
              <button
                type="button"
                className="modal-card__close"
                onClick={closeModal}
                aria-label="Fermer"
              >
                <FiX aria-hidden="true" />
              </button>
            </header>

            <div className="modal-card__body">
              {/* Client info bar */}
              <div className="kyc-der-client-info">
                <strong>{modalClient.name}</strong>
                <span>·</span>
                <span
                  className={`client-type type-${isPmClient ? "pm" : "pp"}`}
                >
                  {isPmClient ? "PM" : "PP"}
                </span>
                <span>·</span>
                <span
                  className={`crm-badge ${docBadgeClass(modalClient.derStatut)}`}
                >
                  {docBadgeLabel(modalClient.derStatut)} DER
                </span>
                <span>·</span>
                <span
                  className={`crm-badge ${docBadgeClass(modalClient.ldmStatut)}`}
                >
                  {docBadgeLabel(modalClient.ldmStatut)} LdM
                </span>
              </div>

              {/* Étape 1 — DER */}
              <div className="kyc-step-panel">
                <div className="kyc-step-title">
                  Étape 1 — Document d&apos;Entrée en Relation (DER)
                </div>
                <p className="kyc-step-desc">
                  Envoyée par email au client (preuve horodatée). Délai AMF{" "}
                  <strong>48h minimum</strong> avant la LdM.
                </p>
                <div className="cp-form-grid">
                  <label className="cp-field">
                    <span>
                      Signataire NM Prime
                      <span className="field-required"> *</span>
                    </span>
                    <Select
                      value={signataireName}
                      onChange={(e) => handleSignataireChange(e.target.value)}
                    >
                      {signataires.map((s) => (
                        <option key={s.name} value={s.name}>
                          {s.name}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <label className="cp-field">
                    <span>Email signataire</span>
                    <input
                      value={signataireEmail}
                      onChange={(e) => setSignataireEmail(e.target.value)}
                    />
                  </label>
                </div>
                <div className="kyc-step-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handlePreviewDer}
                  >
                    Prévisualiser DER
                  </button>
                  <button
                    type="button"
                    className="btn-bronze"
                    onClick={handleSendDer}
                    disabled={sendDer.isPending}
                  >
                    {sendDer.isPending
                      ? "⏳ Envoi…"
                      : "Envoyer la DER par email"}
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleSendDerDocuSign}
                    disabled={sendDerDocuSign.isPending}
                  >
                    {sendDerDocuSign.isPending
                      ? "⏳ Envoi…"
                      : "✍️ Envoyer la DER via DocuSign"}
                  </button>
                </div>
              </div>

              {/* Étape 2 — LdM */}
              <div className="kyc-step-panel">
                <div className="kyc-step-title">
                  Étape 2 — Lettre de Mission (LdM)
                </div>

                {/* Delay info — shown when DER sent but 48h not elapsed */}
                {modalClient.derDate && !ldmUnlocked && (
                  <div className="kyc-delay-info">
                    ⏳ LdM disponible à partir du{" "}
                    <strong>
                      {modalAvail
                        ? formatDateFr(modalAvail.toISOString())
                        : "—"}
                    </strong>{" "}
                    (délai AMF 48h)
                  </div>
                )}

                <label className="cp-field cp-field-full">
                  <span>
                    Type de lettre de mission
                    <span className="field-required"> *</span>
                  </span>
                  <Select
                    value={ldmType}
                    onChange={(e) => {
                      setLdmType(e.target.value);
                      setMontantForfait("");
                    }}
                  >
                    {!isPmClient && (
                      <>
                        <option value="PP_SANS">
                          PP — Sans rémunération forfaitaire
                        </option>
                        <option value="PP_AVEC">
                          PP — Avec rémunération forfaitaire
                        </option>
                      </>
                    )}
                    {isPmClient && (
                      <>
                        <option value="PM_SANS">
                          PM — Sans rémunération forfaitaire
                        </option>
                        <option value="PM_AVEC">
                          PM — Avec rémunération forfaitaire
                        </option>
                      </>
                    )}
                  </Select>
                </label>

                {/* Forfait amount — conditional on AVEC type */}
                {(ldmType === "PP_AVEC" || ldmType === "PM_AVEC") && (
                  <label
                    className="cp-field cp-field-full"
                    style={{ marginTop: "12px" }}
                  >
                    <span>
                      Montant forfaitaire annuel{" "}
                      {ldmType.startsWith("PP") ? "TTC" : "HT"} (€)
                      <span className="field-required"> *</span>
                    </span>
                    <input
                      type="text"
                      value={montantForfait}
                      placeholder="ex. 1 200"
                      onChange={(e) => setMontantForfait(e.target.value)}
                    />
                    <small className="kyc-form-hint">
                      {ldmType.startsWith("PP")
                        ? "0,36% TTC du patrimoine supervisé"
                        : "0,30% HT du patrimoine supervisé"}
                    </small>
                  </label>
                )}

                <div className="kyc-step-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handlePreviewLdm}
                    disabled={previewLoading || !ldmType}
                  >
                    {previewLoading ? "⏳ Génération…" : "Prévisualiser LdM"}
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleSendLdm}
                    disabled={sendLdm.isPending || !ldmUnlocked}
                    title={
                      !ldmUnlocked
                        ? "Délai AMF 48h non écoulé depuis la DER"
                        : undefined
                    }
                  >
                    {sendLdm.isPending
                      ? "⏳ Envoi…"
                      : "Envoyer la LdM (DocuSign)"}
                  </button>
                </div>
              </div>

              {/* Status feedback */}
              {statusMsg && (
                <div
                  className={`kyc-status-msg kyc-status-msg--${statusMsg.type}`}
                >
                  {statusMsg.text}
                </div>
              )}
            </div>

            <footer className="modal-card__footer">
              <div className="modal-card__actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeModal}
                >
                  Fermer
                </button>
              </div>
            </footer>
          </>
        )}
      </Modal>
    </div>
  );
}
