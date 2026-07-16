import { useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { queryKeys } from '../api/queryKeys';
import { useGet, usePost, usePut } from '../lib/api';
import { get, post, put } from '../lib/http';
import type {
  SharepointConfigInput,
  SharepointConnectResponse,
  SharepointStatus,
  SharepointStatusResponse,
} from '../types';

export function useSharepointStatus(tenantId: string | null | undefined) {
  return useGet<SharepointStatusResponse, SharepointStatus>({
    path: api.sharepointStatus(tenantId ?? ''),
    queryKey: queryKeys.tenant.sharepoint(tenantId ?? ''),
    select: (data) => data.sharepoint,
    enabled: Boolean(tenantId),
  });
}

function invalidateSharepointQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  tenantId: string,
) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.tenant.sharepoint(tenantId) }),
    // The Super Admin tenant list embeds the same status.
    queryClient.invalidateQueries({ queryKey: queryKeys.platform.tenants }),
  ]);
}

/**
 * Asks the backend for a Microsoft authorize URL. It deliberately does NOT
 * redirect for us: the endpoint needs our Bearer token, which a plain
 * `window.location` navigation would not send. So we fetch, then navigate.
 */
export function useSharepointConnect() {
  return usePost<SharepointConnectResponse, { tenantId: string }>({
    path: '',
    mutationFn: ({ tenantId }) => get<SharepointConnectResponse>(api.sharepointConnect(tenantId)),
  });
}

export function useSharepointConfig() {
  const queryClient = useQueryClient();

  return usePut<SharepointStatusResponse, SharepointConfigInput>({
    path: ({ tenantId }) => api.sharepointConfig(tenantId),
    mutationFn: ({ tenantId, ...input }) =>
      put<SharepointStatusResponse>(api.sharepointConfig(tenantId), input),
    onSuccess: async (_data, { tenantId }) => {
      await invalidateSharepointQueries(queryClient, tenantId);
    },
  });
}

export function useSharepointDisconnect() {
  const queryClient = useQueryClient();

  return usePost<SharepointStatusResponse, { tenantId: string }>({
    path: '',
    mutationFn: ({ tenantId }) =>
      post<SharepointStatusResponse, Record<string, never>>(api.sharepointDisconnect(tenantId), {}),
    onSuccess: async (_data, { tenantId }) => {
      await invalidateSharepointQueries(queryClient, tenantId);
    },
  });
}
