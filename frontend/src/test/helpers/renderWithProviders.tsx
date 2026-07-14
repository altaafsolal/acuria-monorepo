import { type ReactNode } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../../context/AppContext';
import { NotificationProvider } from '../../context/NotificationContext';
import { ConfirmProvider } from '../../context/ConfirmContext';
import { queryKeys } from '../../api/queryKeys';
import type { User } from '../../types';

interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: string[];
  user?: User | null;
}

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
        gcTime: Infinity,
      },
    },
  });
}

export function renderWithProviders(
  ui: ReactNode,
  {
    initialEntries = ['/'],
    user,
    ...renderOptions
  }: RenderWithProvidersOptions = {},
) {
  const queryClient = createTestQueryClient();

  // Pre-seed auth session so AppProvider doesn't need to fetch /api/auth/me
  if (user !== undefined) {
    queryClient.setQueryData(queryKeys.auth.session, user);
  }

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={initialEntries}>
          <AppProvider>
            <NotificationProvider>
              <ConfirmProvider>
                {children}
              </ConfirmProvider>
            </NotificationProvider>
          </AppProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );
  }

  const result = render(ui, { wrapper: Wrapper, ...renderOptions });

  return { ...result, queryClient };
}
