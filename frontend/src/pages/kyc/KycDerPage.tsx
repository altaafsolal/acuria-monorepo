import { useMemo, useState } from 'react';
import { FiRefreshCw, FiX } from 'react-icons/fi';

import ClientPanel from '../../components/clients/ClientPanel';
import Modal from '../../components/ui/Modal';
import PageLoading from '../../components/ui/PageLoading';
import Select from '../../components/ui/Select';
import {
  useAccueil,
  useKycDerClients,
  useKycSignataires,
  useSendDer,
  useSendLdm,
} from '../../hooks';
import { queryKeys } from '../../api/queryKeys';
import { useQueryClient } from '@tanstack/react-query';
import { useConfirm } from '../../context/ConfirmContext';
import type { Client } from '../../types';
import {
  docBadgeClass,
  docBadgeLabel,
  formatDateFr,
  formatDateTimeFr,
  isPersonneMorale,
  ldmAvailableDate,
  ldmIsUnlocked,
  statutClientBadgeClass,
} from '../../utils/kyc';

const FILTERS = [
  { value: '', label: 'Tous' },
  { value: 'non_envoye', label: 'Non envoyés' },
  { value: 'envoye', label: 'Envoyés' },
  { value: 'signe', label: 'Signés' },
] as const;

export default function KycDerPage() {
  const [filter, setFilter] = useState('');
  const [panelClientId, setPanelClientId] = useState<string | null>(null);
  const [modalClient, setModalClient] = useState<Client | null>(null);
  const [signataireName, setSignataireName] = useState('');
  const [signataireEmail, setSignataireEmail] = useState('');
  const [ldmType, setLdmType] = useState('PP_SANS');

  const queryClient = useQueryClient();
  const { data: accueil } = useAccueil();
  const { data: clients = [], isLoading, isError, error, refetch, isFetching } = useKycDerClients(filter);
  const { data: signataires = [] } = useKycSignataires();
  const sendDer = useSendDer();
  const sendLdm = useSendLdm();
  const confirm = useConfirm();

  const stats = accueil?.stats.der;

  const handleRefresh = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: queryKeys.accueil.data });
  };

  const openModal = (client: Client) => {
    setModalClient(client);
    const defaultSig = signataires[0];
    setSignataireName(defaultSig?.name || '');
    setSignataireEmail(defaultSig?.email || '');
    const isPm = isPersonneMorale(client.clientType);
    setLdmType(isPm ? 'PM_SANS' : 'PP_SANS');
  };

  const handleSignataireChange = (name: string) => {
    setSignataireName(name);
    const sig = signataires.find((s) => s.name === name);
    if (sig) setSignataireEmail(sig.email);
  };

  const handleSendDer = async () => {
    if (!modalClient) return;
    const confirmed = await confirm({
      title: 'Envoyer le DER',
      message: `Le DER sera envoyé à ${signataireEmail || 'le signataire'} pour signature. Continuer ?`,
      confirmLabel: 'Envoyer',
    });
    if (!confirmed) return;
    sendDer.mutate({
      clientId: modalClient.id,
      signataireName,
      signataireEmail,
      ldmType,
    }, { onSuccess: () => setModalClient(null) });
  };

  const handleSendLdm = async () => {
    if (!modalClient) return;
    const confirmed = await confirm({
      title: 'Envoyer la Lettre de Mission',
      message: `La Lettre de Mission sera envoyée à ${signataireEmail || 'le signataire'} pour signature. Continuer ?`,
      confirmLabel: 'Envoyer',
    });
    if (!confirmed) return;
    sendLdm.mutate({
      clientId: modalClient.id,
      signataireName,
      signataireEmail,
      ldmType,
    }, { onSuccess: () => setModalClient(null) });
  };

  const derStats = useMemo(() => stats ?? {
    total: clients.length,
    aEnvoyer: 0,
    derEnvoye: 0,
    ldmEnvoye: 0,
    signe: 0,
  }, [stats, clients.length]);

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
          <button type="button" className="btn-secondary btn-secondary--sm" onClick={handleRefresh} disabled={isFetching}>
            <FiRefreshCw className={isFetching ? 'animate-spin-app' : undefined} />
            Rafraîchir
          </button>
        </div>
        <div className="filter-bar">
          {FILTERS.map((f) => (
            <button
              key={f.value || 'all'}
              type="button"
              className={`status-pill${filter === f.value ? ' active' : ''}`}
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
                    <td colSpan={7} className="data-table__empty">Aucun client pour ce filtre.</td>
                  </tr>
                ) : (
                  clients.map((client) => {
                    const isPm = isPersonneMorale(client.clientType);
                    const avail = ldmAvailableDate(client.derDate);
                    const unlocked = ldmIsUnlocked(client.derDate);
                    return (
                      <tr key={client.id}>
                        <td>
                          <button type="button" className="link-name" onClick={() => setPanelClientId(client.id)}>
                            {client.name}
                          </button>
                        </td>
                        <td>
                          <span className={`client-type type-${isPm ? 'pm' : 'pp'}`}>
                            {isPm ? 'PM' : 'PP'}
                          </span>
                        </td>
                        <td>
                          <span className={`crm-badge ${statutClientBadgeClass(client.statutClient)}`}>
                            {client.statutClient}
                          </span>
                        </td>
                        <td>
                          <span className={`crm-badge ${docBadgeClass(client.derStatut)}`}>
                            {docBadgeLabel(client.derStatut)}
                          </span>
                          {client.derEnvoiTimestamp && (
                            <small className="der-timestamp">
                              📧
                              {' '}
                              {formatDateTimeFr(client.derEnvoiTimestamp)}
                            </small>
                          )}
                        </td>
                        <td>
                          {avail ? (
                            <span className={unlocked ? 'text-green' : 'text-orange'}>
                              {unlocked ? '✅' : '⏳'}
                              {' '}
                              {formatDateFr(avail.toISOString())}
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td>
                          <span className={`crm-badge ${docBadgeClass(client.ldmStatut)}`}>
                            {docBadgeLabel(client.ldmStatut)}
                          </span>
                        </td>
                        <td>
                          <button type="button" className="btn-bronze btn-sm" onClick={() => openModal(client)}>
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
        <ClientPanel clientId={panelClientId} onClose={() => setPanelClientId(null)} />
      )}

      <Modal
        open={Boolean(modalClient)}
        onClose={() => setModalClient(null)}
        className="modal-card--wide modal-card--form modal-card--shell"
        titleId="kyc-der-modal-title"
      >
        {modalClient && (
          <>
            <header className="modal-card__header">
              <h2 id="kyc-der-modal-title" className="modal-card__title">
                DER / LdM — {modalClient.name}
              </h2>
              <button
                type="button"
                className="modal-card__close"
                onClick={() => setModalClient(null)}
                aria-label="Fermer"
              >
                <FiX aria-hidden="true" />
              </button>
            </header>
            <div className="modal-card__body">
              <div className="cp-form-grid">
                <label className="cp-field">
                  <span>Signataire</span>
                  <Select value={signataireName} onChange={(e) => handleSignataireChange(e.target.value)}>
                    {signataires.map((s) => (
                      <option key={s.name} value={s.name}>{s.name}</option>
                    ))}
                  </Select>
                </label>
                <label className="cp-field">
                  <span>Email signataire</span>
                  <input value={signataireEmail} onChange={(e) => setSignataireEmail(e.target.value)} />
                </label>
                <label className="cp-field cp-field-full">
                  <span>Type LdM</span>
                  <Select value={ldmType} onChange={(e) => setLdmType(e.target.value)}>
                    <option value="PP_SANS">PP — Sans forfait</option>
                    <option value="PP_AVEC">PP — Avec forfait</option>
                    <option value="PM_SANS">PM — Sans forfait</option>
                    <option value="PM_AVEC">PM — Avec forfait</option>
                  </Select>
                </label>
              </div>
            </div>
            <footer className="modal-card__footer">
              <div className="modal-card__actions">
                <button type="button" className="btn-secondary" onClick={() => setModalClient(null)}>Annuler</button>
                <button type="button" className="btn-bronze" onClick={handleSendDer} disabled={sendDer.isPending}>
                  Envoyer DER
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleSendLdm}
                  disabled={sendLdm.isPending || !ldmIsUnlocked(modalClient.derDate)}
                >
                  Envoyer LdM
                </button>
              </div>
            </footer>
          </>
        )}
      </Modal>
    </div>
  );
}
