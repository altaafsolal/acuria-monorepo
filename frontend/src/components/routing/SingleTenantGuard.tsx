import { useEffect, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useLogout, usePublicBranding } from '../../hooks';
import PageLoading from '../ui/PageLoading';
import { IS_SINGLE_TENANT } from '../../config/tenant';

/**
 * Defense-in-depth for single-tenant deployments: even if a session is restored from
 * a refresh cookie (not just the login form), an authenticated user who does not
 * belong to the pinned tenant is logged out. Super admins have no tenant and always
 * pass. On the default Acuria build this is a no-op.
 */
export default function SingleTenantGuard({ children }: { children: ReactNode }) {
  const { user, isSuperAdmin } = useApp();
  const logout = useLogout();
  const branding = usePublicBranding();

  const brandTenant = branding.data?.tenant ?? null;
  const denied = Boolean(
    IS_SINGLE_TENANT
    && !isSuperAdmin
    && user
    && brandTenant
    && user.tenantId !== brandTenant.id,
  );

  useEffect(() => {
    if (denied && !logout.isPending) {
      logout.mutate();
    }
    // logout.mutate identity is stable; only re-run when the decision flips.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [denied]);

  if (!IS_SINGLE_TENANT || isSuperAdmin) {
    return <>{children}</>;
  }
  if (branding.isLoading) {
    return <PageLoading fullScreen />;
  }
  if (denied) {
    return <Navigate to="/login?denied=1" replace />;
  }
  return <>{children}</>;
}
