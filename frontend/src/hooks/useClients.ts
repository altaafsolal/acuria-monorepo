import { useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { queryKeys } from '../api/queryKeys';
import { useGet, usePost, usePut } from '../lib/api';
import { put } from '../lib/http';
import type {
  Client,
  ClientResponse,
  ClientsListResponse,
  CreateClientInput,
  UpdateClientInput,
} from '../types';

export function useClients() {
  return useGet<ClientsListResponse, Client[]>({
    path: api.clients,
    queryKey: queryKeys.clients.list,
    select: (data) => data.clients,
  });
}

export function useClient(clientId: string | undefined) {
  return useGet<ClientResponse, Client>({
    path: api.clientById(clientId ?? ''),
    queryKey: queryKeys.clients.detail(clientId ?? ''),
    select: (data) => data.client,
    enabled: Boolean(clientId),
  });
}

function invalidateClientQueries(queryClient: ReturnType<typeof useQueryClient>, clientId?: string) {
  const invalidations = [
    queryClient.invalidateQueries({ queryKey: queryKeys.clients.list }),
    queryClient.invalidateQueries({ queryKey: queryKeys.platform.stats }),
    queryClient.invalidateQueries({ queryKey: queryKeys.tenant.stats }),
  ];
  if (clientId) {
    invalidations.push(queryClient.invalidateQueries({ queryKey: queryKeys.clients.detail(clientId) }));
  }
  return Promise.all(invalidations);
}

export function useCreateClient() {
  const queryClient = useQueryClient();

  return usePost<ClientResponse, CreateClientInput>({
    path: api.clients,
    onSuccess: async () => {
      await invalidateClientQueries(queryClient);
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();

  return usePut<ClientResponse, UpdateClientInput & { id: string }>({
    path: ({ id }) => api.clientById(id),
    mutationFn: ({ id, ...input }) => put<ClientResponse>(api.clientById(id), input),
    onSuccess: async (_data, variables) => {
      await invalidateClientQueries(queryClient, variables.id);
    },
  });
}
