import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useApp } from '../../context/AppContext';
import PageLoading from '../ui/PageLoading';

interface SuperAdminRouteProps {
  children: ReactNode;
}

export default function SuperAdminRoute({ children }: SuperAdminRouteProps) {
  const { isSuperAdmin, isLoading } = useApp();

  if (isLoading) {
    return <PageLoading fullScreen />;
  }
  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
