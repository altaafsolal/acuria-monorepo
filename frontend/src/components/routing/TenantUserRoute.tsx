import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useApp } from '../../context/AppContext';
import PageLoading from '../ui/PageLoading';

interface TenantUserRouteProps {
  children: ReactNode;
  adminOnly?: boolean;
}

export default function TenantUserRoute({ children, adminOnly = false }: TenantUserRouteProps) {
  const { user, isSuperAdmin, isTenantAdmin, isLoading } = useApp();

  if (isLoading) {
    return <PageLoading fullScreen />;
  }

  if (!user?.tenantId || isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (adminOnly && !isTenantAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
