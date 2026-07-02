import { useMemo, useState } from 'react';
import { FiRefreshCw } from 'react-icons/fi';
import { usePlatformAuditLogs, useTenants } from '../../hooks';
import PageLoading from '../../components/ui/PageLoading';
import Select from '../../components/ui/Select';
import Pagination from '../../components/ui/Pagination';
import { ROLE_LABELS } from '../../constants/roles';
import {
  formatAuditAction,
  formatAuditMethod,
  formatAuditTarget,
} from '../../constants/audit';
import { formatDateTimeFr } from '../../utils/kyc';

const PAGE_SIZE = 50;

export default function PlatformAuditPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [tenantId, setTenantId] = useState('');

  const { data: tenants = [] } = useTenants();
  const tenantNames = useMemo(
    () => new Map(tenants.map((tenant) => [tenant.id, tenant.name])),
    [tenants],
  );

  const { data, isLoading, isError, error, refetch, isFetching } = usePlatformAuditLogs({
    page,
    pageSize: PAGE_SIZE,
    tenantId: tenantId || undefined,
    search: search.trim() || undefined,
  });

  const logs = data?.logs ?? [];
  const total = data?.total ?? 0;

  if (isLoading && !data) {
    return (
      <div className="dashboard-content">
        <PageLoading message="Chargement du journal d'audit…" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="dashboard-content">
        <p className="form-error">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="dashboard-content">
      <header className="dashboard-header dashboard-header--row">
        <div>
          <h1>Audit plateforme</h1>
          <p className="dashboard-subtitle">
            Historique des actions sur l&apos;ensemble des tenants.
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary btn-secondary--inline"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <FiRefreshCw className={isFetching ? 'spin' : undefined} />
          {isFetching ? 'Actualisation…' : 'Actualiser'}
        </button>
      </header>

      <section className="data-panel">
        <div className="data-panel__toolbar data-panel__toolbar--row">
          <label className="field">
            <span>Rechercher</span>
            <div className="field-input">
              <input
                type="search"
                placeholder="Utilisateur, action, chemin…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </label>
          <label className="field">
            <span>Tenant</span>
            <Select
              value={tenantId}
              onChange={(e) => {
                setTenantId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Tous les tenants</option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </Select>
          </label>
        </div>

        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Utilisateur</th>
                <th>Rôle</th>
                <th>Tenant</th>
                <th>Action</th>
                <th>Type d&apos;opération</th>
                <th>Cible</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="data-table__empty">
                    Aucune entrée d&apos;audit pour le moment.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td className="data-table__muted">{formatDateTimeFr(log.createdAt)}</td>
                    <td>
                      <strong>{log.userName || log.userEmail || '—'}</strong>
                      {log.userEmail && log.userName ? (
                        <div className="data-table__muted">{log.userEmail}</div>
                      ) : null}
                    </td>
                    <td>
                      <span className="role-pill">
                        {log.userRole ? (ROLE_LABELS[log.userRole as keyof typeof ROLE_LABELS] || log.userRole) : '—'}
                      </span>
                    </td>
                    <td>{log.tenantId ? (tenantNames.get(log.tenantId) || log.tenantId) : '—'}</td>
                    <td>{formatAuditAction(log.action)}</td>
                    <td>{formatAuditMethod(log.method)}</td>
                    <td>{formatAuditTarget(log.entityType, log.entityId)}</td>
                    <td>{log.statusCode}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          page={page}
          size={PAGE_SIZE}
          total={total}
          onPageChange={setPage}
        />
      </section>
    </div>
  );
}
