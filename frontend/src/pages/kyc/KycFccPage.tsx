import { useState } from 'react';
import { FiRefreshCw } from 'react-icons/fi';

import ClientPanel from '../../components/clients/ClientPanel';
import PageLoading from '../../components/ui/PageLoading';
import {
  useAccueil,
  useFccDossiers,
  useKycFccClients,
  useQuickValidateFcc,
  useSendFcc,
  useSendFccDocuSign,
} from '../../hooks';
import { queryKeys } from '../../api/queryKeys';
import { useQueryClient } from '@tanstack/react-query';
import { useConfirm } from '../../context/ConfirmContext';
import {
  docBadgeClass,
  docBadgeLabel,
  formatDateFr,
  isPersonneMorale,
  statutClientBadgeClass,
} from '../../utils/kyc';

const FILTERS = [
  { value: '', label: 'Tous' },
  { value: 'non_envoye', label: 'Non envoyés' },
  { value: 'envoye', label: 'Envoyés' },
  { value: 'signe', label: 'Signés' },
  { value: 'renouveler', label: 'À renouveler' },
] as const;

type Tab = 'suivi' | 'dossiers';

function dossierStatutClass(statut: string | null): string {
  if (statut === 'Signé' || statut === 'Validé') return 'badge-doc-signe';
  if (statut === 'En review' || statut === 'Envoyé DocuSign') return 'badge-doc-envoye';
  if (statut === 'Incomplet' || statut === 'Rejeté') return 'badge-doc-renouveler';
  return 'badge-doc-non';
}

export default function KycFccPage() {
  const [filter, setFilter] = useState('');
  const [panelClientId, setPanelClientId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('suivi');

  const queryClient = useQueryClient();
  const { data: accueil } = useAccueil();
  const { data: clients = [], isLoading, isError, error, refetch, isFetching } = useKycFccClients(filter);
  const { data: dossiers = [], isLoading: dossiersLoading, refetch: refetchDossiers } = useFccDossiers();
  const sendFcc = useSendFcc();
  const sendFccDocuSign = useSendFccDocuSign();
  const quickValidate = useQuickValidateFcc();
  const confirm = useConfirm();

  const fccStats = accueil?.stats.fcc;

  const handleRefresh = () => {
    refetch();
    refetchDossiers();
    queryClient.invalidateQueries({ queryKey: queryKeys.accueil.data });
  };

  const handleSendFcc = async (clientId: string, clientName: string) => {
    const confirmed = await confirm({
      title: 'Envoyer la FCC',
      message: `Envoyer la Fiche Client Connaissance pour « ${clientName} » ?`,
      confirmLabel: 'Envoyer',
    });
    if (!confirmed) return;
    sendFcc.mutate({ clientId }, {
      onSuccess: (result) => {
        if (result.link) window.open(result.link, '_blank');
      },
    });
  };

  const handleDocuSign = async (clientId: string, clientName: string) => {
    const confirmed = await confirm({
      title: 'Envoyer vers DocuSign',
      message: `Envoyer la FCC de « ${clientName} » vers DocuSign pour signature électronique ?`,
      confirmLabel: 'Envoyer DocuSign',
    });
    if (!confirmed) return;
    sendFccDocuSign.mutate({ clientId });
  };

  const handleQuickValidate = async (clientId: string, fccClientId?: string) => {
    const confirmed = await confirm({
      title: 'Valider la FCC',
      message: 'Marquer cette FCC comme signée/validée manuellement ?',
      confirmLabel: 'Valider',
    });
    if (!confirmed) return;
    quickValidate.mutate({ clientId, fccClientId });
  };

  return (
    <div className="page-content">
      <div className="stats-row stats-row--5">
        <div className="stat-card">
          <div className="stat-label">Total</div>
          <div className="stat-val">{fccStats?.total ?? clients.length}</div>
          <div className="stat-sub">clients actifs</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">FCC à envoyer</div>
          <div className="stat-val stat-val--red">{fccStats?.aEnvoyer ?? '—'}</div>
          <div className="stat-sub trend-warn">Non traités</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">FCC envoyée</div>
          <div className="stat-val stat-val--blue">{fccStats?.envoye ?? '—'}</div>
          <div className="stat-sub">En attente signature</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">FCC signée</div>
          <div className="stat-val stat-val--green">{fccStats?.signe ?? '—'}</div>
          <div className="stat-sub trend-up">Complétés</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">À renouveler</div>
          <div className="stat-val stat-val--orange">{fccStats?.renouveler ?? '—'}</div>
          <div className="stat-sub trend-warn">Attention</div>
        </div>
      </div>

      <div className="card">
        <div className="card-toolbar">
          <h2 className="card-title">FCC — Fiches Connaissance Client</h2>
          <button type="button" className="btn-secondary btn-secondary--sm" onClick={handleRefresh} disabled={isFetching}>
            <FiRefreshCw className={isFetching ? 'animate-spin-app' : undefined} />
            Rafraîchir
          </button>
        </div>
        <div className="filter-bar">
          <button
            type="button"
            className={`status-pill${activeTab === 'suivi' ? ' active' : ''}`}
            onClick={() => setActiveTab('suivi')}
          >
            Suivi clients
          </button>
          <button
            type="button"
            className={`status-pill${activeTab === 'dossiers' ? ' active' : ''}`}
            onClick={() => setActiveTab('dossiers')}
          >
            Dossiers FCC{dossiers.length > 0 ? ` (${dossiers.length})` : ''}
          </button>
        </div>

        {activeTab === 'suivi' && (
          <>
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
                      <th>FCC statut</th>
                      <th>Date FCC</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="data-table__empty">Aucun client pour ce filtre.</td>
                      </tr>
                    ) : (
                      clients.map((client) => {
                        const isPm = isPersonneMorale(client.clientType);
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
                              <span className={`crm-badge ${docBadgeClass(client.fccStatut)}`}>
                                {docBadgeLabel(client.fccStatut)}
                              </span>
                            </td>
                            <td className="text-muted">{formatDateFr(client.fccDate)}</td>
                            <td style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                className="btn-secondary btn-sm"
                                onClick={() => handleSendFcc(client.id, client.name)}
                                disabled={sendFcc.isPending || sendFccDocuSign.isPending}
                              >
                                FCC
                              </button>
                              {client.fccStatut === 'Envoyé' && (
                                <button
                                  type="button"
                                  className="btn-secondary btn-sm"
                                  onClick={() => handleDocuSign(client.id, client.name)}
                                  disabled={sendFcc.isPending || sendFccDocuSign.isPending}
                                  title="Envoyer vers DocuSign pour signature"
                                >
                                  ✍️ DocuSign
                                </button>
                              )}
                              {(client.fccStatut === 'Soumis' || client.fccStatut === 'DocuSign envoyé') && (
                                <button
                                  type="button"
                                  className="btn-secondary btn-sm"
                                  onClick={() => handleQuickValidate(client.id)}
                                  disabled={quickValidate.isPending}
                                  title="Valider manuellement"
                                >
                                  ✓ Valider
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {activeTab === 'dossiers' && (
          <>
            {dossiersLoading && <PageLoading />}
            {!dossiersLoading && (
              <div className="data-table-wrap">
                <table className="nm-table">
                  <thead>
                    <tr>
                      <th>Date soumission</th>
                      <th>Type</th>
                      <th>Profil risque</th>
                      <th>Profil connaissance</th>
                      <th>Score conn.</th>
                      <th>Statut</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dossiers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="data-table__empty">Aucun dossier FCC enregistré.</td>
                      </tr>
                    ) : (
                      dossiers.map((sub) => (
                        <tr key={sub.id}>
                          <td className="text-muted">{formatDateFr(sub.dateSoumission)}</td>
                          <td>
                            <span className={`client-type type-${sub.typeFormulaire === 'PM' ? 'pm' : 'pp'}`}>
                              {sub.typeFormulaire}
                            </span>
                          </td>
                          <td>{sub.profilRisque ?? '—'}</td>
                          <td>{sub.profilConnaissance ?? '—'}</td>
                          <td>{sub.scoreConnaissance ?? '—'}</td>
                          <td>
                            <span className={`crm-badge ${dossierStatutClass(sub.statutDossier)}`}>
                              {sub.statutDossier ?? '—'}
                            </span>
                          </td>
                          <td>
                            {(sub.statutDossier === 'En attente' || sub.statutDossier === 'En review') && sub.clientId && (
                              <button
                                type="button"
                                className="btn-secondary btn-sm"
                                onClick={() => handleQuickValidate(sub.clientId!, sub.id)}
                                disabled={quickValidate.isPending}
                                title="Valider manuellement"
                              >
                                ✓ Valider
                              </button>
                            )}
                            {sub.clientId && (
                              <button
                                type="button"
                                className="btn-secondary btn-sm"
                                style={{ marginLeft: '0.25rem' }}
                                onClick={() => setPanelClientId(sub.clientId!)}
                              >
                                Client
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {panelClientId && (
        <ClientPanel clientId={panelClientId} onClose={() => setPanelClientId(null)} />
      )}
    </div>
  );
}
