import { useState } from 'react';
import { FiRefreshCw } from 'react-icons/fi';

import ClientPanel from '../../components/clients/ClientPanel';
import PageLoading from '../../components/ui/PageLoading';
import { useAccueil, useKycFccClients, useSendFcc } from '../../hooks';
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

export default function KycFccPage() {
  const [filter, setFilter] = useState('');
  const [panelClientId, setPanelClientId] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { data: accueil } = useAccueil();
  const { data: clients = [], isLoading, isError, error, refetch, isFetching } = useKycFccClients(filter);
  const sendFcc = useSendFcc();
  const confirm = useConfirm();

  const fccStats = accueil?.stats.fcc;

  const handleRefresh = () => {
    refetch();
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
          <h2 className="card-title">Suivi FCC — Fiches Connaissance Client</h2>
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
                        <td>
                          <button
                            type="button"
                            className="btn-secondary btn-sm"
                            onClick={() => handleSendFcc(client.id, client.name)}
                            disabled={sendFcc.isPending}
                          >
                            FCC
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
    </div>
  );
}
