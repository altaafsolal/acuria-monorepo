import { useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { queryKeys } from '../api/queryKeys';
import { useGet, usePost } from '../lib/api';
import { get, post } from '../lib/http';
import type {
  EmailConnectResponse,
  EmailProvider,
  EmailStatus,
  EmailStatusResponse,
} from '../types';

export function useEmailStatus(tenantId: string | null | undefined) {
  return useGet<EmailStatusResponse, EmailStatus>({
    path: api.emailStatus(tenantId ?? ''),
    queryKey: queryKeys.tenant.email(tenantId ?? ''),
    select: (data) => data.email,
    enabled: Boolean(tenantId),
  });
}

function invalidateEmailQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  tenantId: string,
) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.tenant.email(tenantId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.platform.tenants }),
  ]);
}

/**
 * Asks the backend for a provider authorize URL, then the caller navigates to it.
 * Like SharePoint, it does NOT redirect for us — the endpoint needs our bearer
 * token, which a plain window.location navigation wouldn't send.
 */
export function useEmailConnect() {
  return usePost<EmailConnectResponse, { tenantId: string; provider: EmailProvider }>({
    path: '',
    mutationFn: ({ tenantId, provider }) =>
      get<EmailConnectResponse>(api.emailConnect(tenantId, provider)),
  });
}

export function useEmailDisconnect() {
  const queryClient = useQueryClient();

  return usePost<EmailStatusResponse, { tenantId: string }>({
    path: '',
    mutationFn: ({ tenantId }) =>
      post<EmailStatusResponse, Record<string, never>>(api.emailDisconnect(tenantId), {}),
    onSuccess: async (_data, { tenantId }) => {
      await invalidateEmailQueries(queryClient, tenantId);
    },
  });
}
