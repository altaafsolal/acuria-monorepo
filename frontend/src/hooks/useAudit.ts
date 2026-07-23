import { keepPreviousData, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { queryKeys } from '../api/queryKeys';
import { useGet } from '../lib/api';
import { del } from '../lib/http';
import type { AuditListParams, AuditLogsResponse } from '../types';

export function usePlatformAuditLogs(params: AuditListParams = {}) {
  return useGet<AuditLogsResponse>({
    path: api.platformAuditLogs(params),
    queryKey: queryKeys.audit.platform(params),
    placeholderData: keepPreviousData,
    refetchOnMount: 'always',
  });
}

export function useDeletePlatformAuditLogs() {
  const queryClient = useQueryClient();
  return useMutation<{ deleted: number }, Error, string[]>({
    mutationFn: (ids) => del<{ deleted: number }>(api.platformAuditDelete(), { body: { ids } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['audit', 'platform'] }),
  });
}

export function usePurgePlatformAuditLogs() {
  const queryClient = useQueryClient();
  return useMutation<{ deleted: number }, Error, void>({
    mutationFn: () => del<{ deleted: number }>(api.platformAuditPurge()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['audit', 'platform'] }),
  });
}

export function useTenantAuditLogs(params: AuditListParams = {}) {
  return useGet<AuditLogsResponse>({
    path: api.auditLogs(params),
    queryKey: queryKeys.audit.tenant(params),
    placeholderData: keepPreviousData,
    refetchOnMount: 'always',
  });
}
