import { useApp } from '../../context/AppContext';
import { usePlatformStats } from '../../hooks';
import PageLoading from '../../components/ui/PageLoading';
import StatsSection from '../../components/dashboard/StatsSection';
import ActivityChart from '../../components/dashboard/ActivityChart';
import { now } from '../../utils';
import type { ChartDataItem, TenantStats } from '../../types';

function isTenantStats(stats: unknown): stats is TenantStats {
  return Boolean(stats && typeof stats === 'object' && 'tenant' in stats);
}

export default function DashboardPage() {
  const { user, isLoading: sessionLoading } = useApp();
  const { data: stats, isPending, isError, error } = usePlatformStats();

  if (sessionLoading || isPending) {
    return (
      <div className="dashboard-content">
        <PageLoading message="Chargement de l'accueil…" />
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

  if (!stats) {
    return (
      <div className="dashboard-content">
        <p className="form-error">Les données de l&apos;accueil sont indisponibles.</p>
      </div>
    );
  }

  const tenantStats = isTenantStats(stats) ? stats : null;
  const isTenantView = Boolean(tenantStats);

  const chartData: ChartDataItem[] = isTenantView
    ? [
      { label: 'Utilisateurs', active: stats.users.active, inactive: stats.users.inactive },
      { label: 'Clients', active: stats.clients.active, inactive: stats.clients.inactive },
    ]
    : [
      { label: 'Tenants', active: stats.tenants.active, inactive: stats.tenants.inactive },
      { label: 'Utilisateurs', active: stats.users.active, inactive: stats.users.inactive },
      { label: 'Clients', active: stats.clients.active, inactive: stats.clients.inactive },
    ];

  return (
    <div className="dashboard-content">
      <header className="dashboard-header">
        <h1>{`Bonjour, ${user?.name || 'Administrateur'}`}</h1>
        <p className="dashboard-subtitle">
          {tenantStats?.tenant.name ? `${tenantStats.tenant.name} · ` : ''}
          {now().format('dddd D MMMM YYYY')}
        </p>
      </header>

      {!isTenantView && (
        <StatsSection title="Tenants" stats={stats.tenants} />
      )}
      <StatsSection title="Utilisateurs" stats={stats.users} />
      <StatsSection title="Clients" stats={stats.clients} />

      <ActivityChart data={chartData} />
    </div>
  );
}
