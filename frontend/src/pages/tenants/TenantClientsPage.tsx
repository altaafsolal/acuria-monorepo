import { Link, Navigate, useParams } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import { useTenant, useTenantClients } from '../../hooks';
import PageLoading from '../../components/ui/PageLoading';
import StatusBadge from '../../components/ui/StatusBadge';
import KycBadge from '../../components/ui/KycBadge';
import { dayjs } from '../../utils';

export default function TenantClientsPage() {
  const { tenantId } = useParams();
  const tenantQuery = useTenant(tenantId);
  const clientsQuery = useTenantClients(tenantId);

  if (tenantQuery.isLoading || clientsQuery.isLoading) {
    return (
      <div className="dashboard-content">
        <PageLoading message="Chargement des clients…" />
      </div>
    );
  }

  if (tenantQuery.isError || clientsQuery.isError) {
    const message = tenantQuery.error?.message || clientsQuery.error?.message;
    return (
      <div className="dashboard-content">
        <p className="form-error">{message}</p>
      </div>
    );
  }

  const tenant = tenantQuery.data;
  if (!tenant) {
    return <Navigate to="/dashboard/tenants" replace />;
  }

  const tenantClients = clientsQuery.data ?? [];

  return (
    <div className="dashboard-content">
      <header className="dashboard-header">
        <Link to="/dashboard/tenants" className="breadcrumb-link">
          <FiArrowLeft />
          Retour aux tenants
        </Link>
        <h1>{`${tenant.name} — Clients`}</h1>
        <p className="dashboard-subtitle">Dossiers clients CRM de ce tenant.</p>
      </header>

      <section className="data-panel">
        <div className="data-panel__meta">
          <div>
            <span className="meta-label">Tenant</span>
            <strong>{tenant.name}</strong>
          </div>
          <div>
            <span className="meta-label">Statut</span>
            <StatusBadge status={tenant.status} />
          </div>
          <div>
            <span className="meta-label">Clients</span>
            <strong>{tenantClients.length}</strong>
          </div>
        </div>

        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>E-mail</th>
                <th>KYC</th>
                <th>Statut</th>
                <th>Créé le</th>
              </tr>
            </thead>
            <tbody>
              {tenantClients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="data-table__empty">
                    Aucun client pour ce tenant.
                  </td>
                </tr>
              ) : (
                tenantClients.map((client) => (
                  <tr key={client.id}>
                    <td><strong>{client.name}</strong></td>
                    <td>{client.email}</td>
                    <td><KycBadge status={client.kycStatus} /></td>
                    <td><StatusBadge status={client.status} /></td>
                    <td>{client.createdAt ? dayjs(client.createdAt).format('D MMM YYYY') : '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
