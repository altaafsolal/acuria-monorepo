import { keepPreviousData } from '@tanstack/react-query';
import api from '../api';
import { queryKeys } from '../api/queryKeys';
import { useGet } from '../lib/api';
import type { AuditListParams, AuditLogsResponse } from '../types';

export function usePlatformAuditLogs(params: AuditListParams = {}) {
  return useGet<AuditLogsResponse>({
    path: api.platformAuditLogs(params),
    queryKey: queryKeys.audit.platform(params),
    placeholderData: keepPreviousData,
    refetchOnMount: 'always',
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
