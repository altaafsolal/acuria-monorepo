import { useMemo, useState, type FormEvent } from 'react';
import { FiPlus, FiRefreshCw } from 'react-icons/fi';
import './crm.css';
import ClientPanel from '../../components/clients/ClientPanel';
import LoadingPopup from '../../components/ui/LoadingPopup';
import Modal from '../../components/ui/Modal';
import PageLoading from '../../components/ui/PageLoading';
import Select from '../../components/ui/Select';
import {
  useAccueil,
  useClients,
  useCreateClient,
} from '../../hooks';
import { queryKeys } from '../../api/queryKeys';
import { useQueryClient } from '@tanstack/react-query';
import { useConfirm } from '../../context/ConfirmContext';
import { filterBySearch } from '../../utils';
import {
  docBadgeClass,
  docBadgeLabel,
  formatDateFr,
  isPersonneMorale,
  statutClientBadgeClass,
} from '../../utils/kyc';
import type { CreateClientInput } from '../../types';

const STATUT_FILTERS = ['', 'Prospect', 'Client actif', 'Inactif'] as const;

export default function ClientsPage() {
  const queryClient = useQueryClient();
  const { data: clients = [], isLoading, isError, error, refetch, isFetching } = useClients();
  const { data: accueil } = useAccueil();
  const createClient = useCreateClient();
  const confirm = useConfirm();
  const [search, setSearch] = useState('');
  const [statutFilter, setStatutFilter] = useState('');
  const [panelClientId, setPanelClientId] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientType, setNewClientType] = useState<'PP' | 'PM'>('PP');

  const stats = useMemo(() => {
    const active = clients.filter((c) => c.statutClient !== 'Archivé');
    return {
      total: active.length,
      prospects: active.filter((c) => c.statutClient === 'Prospect').length,
      actifs: active.filter((c) => c.statutClient === 'Client actif').length,
      inactifs: active.filter((c) => c.statutClient === 'Inactif').length,
      fccPending: active.filter((c) => !c.fccStatut || c.fccStatut === 'Non envoyé').length,
    };
  }, [clients]);

  const filtered = useMemo(() => {
    let list = clients.filter((c) => c.statutClient !== 'Archivé');
    if (statutFilter) {
      list = list.filter((c) => c.statutClient === statutFilter);
    }
    return filterBySearch(list, search, (client) => [
      client.name,
      client.email,
      client.clientType,
      client.statutClient,
    ]);
  }, [clients, search, statutFilter]);

  const handleRefresh = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: queryKeys.accueil.data });
  };

  const handleCreateClient = async (e: FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;
    const confirmed = await confirm({
      title: 'Créer le client',
      message: `Créer le client « ${newClientName.trim()} » ?`,
      confirmLabel: 'Créer',
    });
    if (!confirmed) return;
    const input: CreateClientInput = {
      name: newClientName.trim(),
      clientType: newClientType,
      statutClient: 'Prospect',
      status: 'prospect',
      kycStatus: 'pending',
    };
    createClient.mutate(input, {
      onSuccess: (data) => {
        setShowNewModal(false);
        setNewClientName('');
        setPanelClientId(data.client.id);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="page-content">
        <PageLoading message="Chargement des clients…" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="page-content">
        <p className="form-error">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="page-content">
      <LoadingPopup
        show={createClient.isPending}
        title="Création du client"
        message="Nous enregistrons le client et actualisons le portefeuille."
      />

      <div className="crm-stats">
        <div className="crm-stat">
          <div className="crm-stat-val">{accueil?.stats.crm.total ?? stats.total}</div>
          <div className="crm-stat-label">Total</div>
        </div>
        <div className="crm-stat">
          <div className="crm-stat-val stat-val--blue">{accueil?.stats.crm.prospects ?? stats.prospects}</div>
          <div className="crm-stat-label">Prospects</div>
        </div>
        <div className="crm-stat">
          <div className="crm-stat-val stat-val--green">{accueil?.stats.crm.actifs ?? stats.actifs}</div>
          <div className="crm-stat-label">Clients actifs</div>
        </div>
        <div className="crm-stat">
          <div className="crm-stat-val stat-val--muted">{accueil?.stats.crm.inactifs ?? stats.inactifs}</div>
          <div className="crm-stat-label">Inactifs</div>
        </div>
        <div className="crm-stat">
          <div className="crm-stat-val stat-val--red">{stats.fccPending}</div>
          <div className="crm-stat-label">FCC en attente</div>
        </div>
      </div>

      <div className="crm-action-bar">
        <input
          type="search"
          className="crm-search"
          placeholder="Rechercher par nom, email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="status-pills">
          {STATUT_FILTERS.map((f) => (
            <button
              key={f || 'all'}
              type="button"
              className={`status-pill${statutFilter === f ? ' active' : ''}`}
              onClick={() => setStatutFilter(f)}
            >
              {f || 'Tous'}
            </button>
          ))}
        </div>
        <button type="button" className="btn-bronze" onClick={() => setShowNewModal(true)}>
          <FiPlus />
          Nouveau client
        </button>
        <button
          type="button"
          className="btn-secondary btn-secondary--sm"
          onClick={handleRefresh}
          disabled={isFetching}
          title="Rafraîchir"
        >
          <FiRefreshCw className={isFetching ? 'spin' : undefined} />
        </button>
      </div>

      <div className="table-wrap">
        <div className="table-header">
          <div className="table-title">Portefeuille clients</div>
          <div className="text-muted">{filtered.length} client(s)</div>
        </div>
        <div className="data-table-wrap">
          <table className="nm-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Type</th>
                <th>Statut</th>
                <th>Gestionnaire</th>
                <th>FCC</th>
                <th>DER</th>
                <th>LdM</th>
                <th>Entrée</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="data-table__empty">
                    Aucun client pour ce filtre.
                  </td>
                </tr>
              ) : (
                filtered.map((client) => {
                  const isPm = isPersonneMorale(client.clientType);
                  return (
                    <tr
                      key={client.id}
                      className="nm-table__row--clickable"
                      onClick={() => setPanelClientId(client.id)}
                    >
                      <td>
                        <div className="client-name">{client.name}</div>
                        <div className="client-email">{client.email || '—'}</div>
                      </td>
                      <td>
                        <span className={`client-type type-${isPm ? 'pm' : 'pp'}`}>
                          {isPm ? 'PM' : 'PP'}
                        </span>
                      </td>
                      <td>
                        <span className={`crm-badge ${statutClientBadgeClass(client.statutClient)}`}>
                          {client.statutClient || '—'}
                        </span>
                      </td>
                      <td className="text-muted">{client.gestionnaire || '—'}</td>
                      <td>
                        <span className={`crm-badge ${docBadgeClass(client.fccStatut)}`}>
                          {docBadgeLabel(client.fccStatut)}
                        </span>
                      </td>
                      <td>
                        <span className={`crm-badge ${docBadgeClass(client.derStatut)}`}>
                          {docBadgeLabel(client.derStatut)}
                        </span>
                      </td>
                      <td>
                        <span className={`crm-badge ${docBadgeClass(client.ldmStatut)}`}>
                          {docBadgeLabel(client.ldmStatut)}
                        </span>
                      </td>
                      <td className="text-muted">{formatDateFr(client.dateEntree)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {panelClientId && (
        <ClientPanel clientId={panelClientId} onClose={() => setPanelClientId(null)} />
      )}

      <Modal open={showNewModal} onClose={() => setShowNewModal(false)} className="modal-card--form">
        <h2 className="modal-card__title">Nouveau client</h2>
        <form className="modal-form" onSubmit={handleCreateClient}>
          <div className="modal-form__fields">
            <label className="field field--full">
              <span>Nom / Dénomination</span>
              <div className="field-input">
                <input
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </label>
            <label className="field field--full">
              <span>Type</span>
              <Select value={newClientType} onChange={(e) => setNewClientType(e.target.value as 'PP' | 'PM')}>
                <option value="PP">Personne physique</option>
                <option value="PM">Personne morale</option>
              </Select>
            </label>
          </div>
          <div className="modal-card__actions">
            <button type="button" className="btn-secondary" onClick={() => setShowNewModal(false)}>
              Annuler
            </button>
            <button type="submit" className="btn-bronze" disabled={createClient.isPending}>
              {createClient.isPending ? 'Création…' : 'Créer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
