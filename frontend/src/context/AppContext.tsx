import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useAuthSession } from '../hooks/useAuth';
import { ROLES } from '../constants/roles';
import type { Role, User } from '../types';
import type { UseQueryResult } from '@tanstack/react-query';

export interface AppContextValue {
  appName: string;
  tagline: string;
  user: User | null;
  role: Role | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSuperAdmin: boolean;
  isTenantAdmin: boolean;
  isStandardUser: boolean;
  sessionQuery: UseQueryResult<User | null, Error>;
}

const AppContext = createContext<AppContextValue | null>(null);

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const sessionQuery = useAuthSession();
  const user = sessionQuery.data ?? null;
  const role = user?.role ?? null;

  const value = useMemo<AppContextValue>(() => ({
    appName: 'Acuria',
    tagline: 'Plateforme de gestion de patrimoine',
    user,
    role,
    isAuthenticated: Boolean(user),
    isLoading: sessionQuery.isLoading,
    isSuperAdmin: role === ROLES.SUPER_ADMIN,
    isTenantAdmin: role === ROLES.TENANT_ADMIN,
    isStandardUser: role === ROLES.STANDARD_USER,
    sessionQuery,
  }), [user, role, sessionQuery]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
