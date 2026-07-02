import { Navigate } from 'react-router-dom';
import PageLoading from '../ui/PageLoading';
import type { ReactNode } from 'react';
import { useApp } from '../../context/AppContext';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useApp();

  if (isLoading) {
    return <PageLoading fullScreen />;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
