import { useState } from 'react';
import { Link } from 'react-router-dom';
import '../../pages/clients/crm.css';
import PageLoading from '../../components/ui/PageLoading';
import ClientPanel from '../../components/clients/ClientPanel';
import { useApp } from '../../context/AppContext';
import { useAccueil } from '../../hooks';
import { now } from '../../utils';
import type { AccueilTodoItem } from '../../types';

function TodoList({
  items,
  onClientClick,
}: {
  items: AccueilTodoItem[];
  onClientClick?: (clientId: string) => void;
}) {
  if (items.length === 0) {
    return <p className="todo-empty">Aucune action en attente.</p>;
  }

  return (
    <div className="todo-list">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`todo-item todo-item--p${item.priority}`}
          onClick={() => onClientClick?.(item.clientId)}
        >
          <span className="todo-item__name">{item.clientName}</span>
          <span className="todo-item__label">{item.label}</span>
        </button>
      ))}
    </div>
  );
}

interface AccueilPageProps {
  onOpenClient?: (clientId: string) => void;
}

export default function AccueilPage({ onOpenClient: onOpenClientProp }: AccueilPageProps) {
  const [panelClientId, setPanelClientId] = useState<string | null>(null);
  const onOpenClient = onOpenClientProp ?? setPanelClientId;
  const { user } = useApp();
  const { data, isLoading, isError, error } = useAccueil();

  if (isLoading) {
    return (
      <div className="page-content">
        <PageLoading message="Chargement de l'accueil…" />
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

  if (!data) {
    return (
      <div className="page-content">
        <p className="form-error">Les données de l&apos;accueil sont indisponibles.</p>
      </div>
    );
  }

  const { stats, kycTodos, complianceTodos } = data;

  return (
    <div className="page-content">
      <div className="accueil-greeting">
        <h2 className="accueil-greeting__title">
          {`Bonjour, ${user?.name || 'Utilisateur'} 👋`}
        </h2>
        <p className="accueil-greeting__date">{now().format('dddd D MMMM YYYY')}</p>
      </div>

      <p className="stats-section-label">👥 CRM — Clients</p>
      <div className="stats-row stats-row--4">
        <Link to="/dashboard/clients" className="stat-card stat-card--link">
          <div className="stat-label">Total</div>
          <div className="stat-val">{stats.crm.total}</div>
          <div className="stat-sub">clients</div>
        </Link>
        <Link to="/dashboard/clients" className="stat-card stat-card--link">
          <div className="stat-label">Prospects</div>
          <div className="stat-val stat-val--blue">{stats.crm.prospects}</div>
          <div className="stat-sub">en cours</div>
        </Link>
        <Link to="/dashboard/clients" className="stat-card stat-card--link">
          <div className="stat-label">Clients actifs</div>
          <div className="stat-val stat-val--green">{stats.crm.actifs}</div>
          <div className="stat-sub">actifs</div>
        </Link>
        <Link to="/dashboard/clients" className="stat-card stat-card--link">
          <div className="stat-label">Inactifs</div>
          <div className="stat-val stat-val--muted">{stats.crm.inactifs}</div>
          <div className="stat-sub">inactifs</div>
        </Link>
      </div>

      <p className="stats-section-label">📄 KYC — DER & Lettre de Mission</p>
      <div className="stats-row stats-row--5">
        <Link to="/dashboard/kyc/der" className="stat-card stat-card--link">
          <div className="stat-label">Total</div>
          <div className="stat-val">{stats.der.total}</div>
          <div className="stat-sub">clients actifs</div>
        </Link>
        <Link to="/dashboard/kyc/der" className="stat-card stat-card--link">
          <div className="stat-label">DER à envoyer</div>
          <div className="stat-val stat-val--red">{stats.der.aEnvoyer}</div>
          <div className="stat-sub trend-warn">Non traités</div>
        </Link>
        <Link to="/dashboard/kyc/der" className="stat-card stat-card--link">
          <div className="stat-label">DER envoyée</div>
          <div className="stat-val stat-val--orange">{stats.der.derEnvoye}</div>
          <div className="stat-sub">En attente LdM</div>
        </Link>
        <Link to="/dashboard/kyc/der" className="stat-card stat-card--link">
          <div className="stat-label">LdM envoyée</div>
          <div className="stat-val stat-val--blue">{stats.der.ldmEnvoye}</div>
          <div className="stat-sub">En attente signature</div>
        </Link>
        <Link to="/dashboard/kyc/der" className="stat-card stat-card--link">
          <div className="stat-label">LdM signée</div>
          <div className="stat-val stat-val--green">{stats.der.signe}</div>
          <div className="stat-sub trend-up">Complétés</div>
        </Link>
      </div>

      <p className="stats-section-label">🔍 KYC — Fiches Connaissance Client</p>
      <div className="stats-row stats-row--5">
        <Link to="/dashboard/kyc/fcc" className="stat-card stat-card--link">
          <div className="stat-label">Total</div>
          <div className="stat-val">{stats.fcc.total}</div>
          <div className="stat-sub">clients actifs</div>
        </Link>
        <Link to="/dashboard/kyc/fcc" className="stat-card stat-card--link">
          <div className="stat-label">FCC à envoyer</div>
          <div className="stat-val stat-val--red">{stats.fcc.aEnvoyer}</div>
          <div className="stat-sub trend-warn">Non traités</div>
        </Link>
        <Link to="/dashboard/kyc/fcc" className="stat-card stat-card--link">
          <div className="stat-label">FCC envoyée</div>
          <div className="stat-val stat-val--blue">{stats.fcc.envoye}</div>
          <div className="stat-sub">En attente signature</div>
        </Link>
        <Link to="/dashboard/kyc/fcc" className="stat-card stat-card--link">
          <div className="stat-label">FCC signée</div>
          <div className="stat-val stat-val--green">{stats.fcc.signe}</div>
          <div className="stat-sub trend-up">Complétés</div>
        </Link>
        <Link to="/dashboard/kyc/fcc" className="stat-card stat-card--link">
          <div className="stat-label">À renouveler</div>
          <div className="stat-val stat-val--orange">{stats.fcc.renouveler}</div>
          <div className="stat-sub trend-warn">Attention</div>
        </Link>
      </div>

      <div className="todo-panels">
        <div className="card card--padded">
          <div className="card-header">
            <h3 className="card-title">📁 To-do — Documents KYC</h3>
            <span className="todo-counter">{kycTodos.length}</span>
          </div>
          <TodoList items={kycTodos} onClientClick={onOpenClient} />
        </div>
        <div className="card card--padded">
          <div className="card-header">
            <h3 className="card-title">📄 To-do — Documents conformité</h3>
            <span className="todo-counter">{complianceTodos.length}</span>
          </div>
          <TodoList items={complianceTodos} onClientClick={onOpenClient} />
        </div>
      </div>

      {!onOpenClientProp && panelClientId && (
        <ClientPanel clientId={panelClientId} onClose={() => setPanelClientId(null)} />
      )}
    </div>
  );
}
