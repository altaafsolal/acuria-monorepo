import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import api from '../api';
import { queryKeys } from '../api/queryKeys';
import { useGet, usePost } from '../lib/api';
import { fetchAuthenticatedBlob } from '../lib/authenticatedBlob';
import type {
  Client,
  ClientResponse,
  ClientsListResponse,
  SendDerInput,
  SendFccResult,
  SendLdmInput,
  Signataire,
} from '../types';

function invalidateKycQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['kyc'] });
  queryClient.invalidateQueries({ queryKey: queryKeys.accueil.data });
  queryClient.invalidateQueries({ queryKey: queryKeys.clients.list });
}

export function useKycSignataires() {
  return useGet<{ signataires: Signataire[] }, Signataire[]>({
    path: api.kycSignataires,
    queryKey: queryKeys.kyc.signataires,
    select: (data) => data.signataires,
  });
}

export function useKycDerClients(filter = '') {
  return useGet<ClientsListResponse, Client[]>({
    path: api.kycDer(filter),
    queryKey: queryKeys.kyc.der(filter),
    select: (data) => data.clients,
  });
}

export function useKycFccClients(filter = '') {
  return useGet<ClientsListResponse, Client[]>({
    path: api.kycFcc(filter),
    queryKey: queryKeys.kyc.fcc(filter),
    select: (data) => data.clients,
  });
}

export function useSendDer() {
  const queryClient = useQueryClient();
  return usePost<ClientResponse, SendDerInput>({
    path: api.kycDerSend,
    onSuccess: () => invalidateKycQueries(queryClient),
  });
}

export function useSendLdm() {
  const queryClient = useQueryClient();
  return usePost<ClientResponse, SendLdmInput>({
    path: api.kycLdmSend,
    onSuccess: () => invalidateKycQueries(queryClient),
  });
}

export function useSendFcc() {
  const queryClient = useQueryClient();
  return usePost<SendFccResult, { clientId: string }>({
    path: api.kycFccSend,
    onSuccess: () => invalidateKycQueries(queryClient),
  });
}

export function useTenantBranding(enabled = true) {
  const queryClient = useQueryClient();
  const query = useGet<{ branding: import('../types').TenantBranding }>({
    path: api.tenantBranding,
    queryKey: queryKeys.tenant.branding,
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const branding = query.data?.branding;
    if (!enabled || !branding?.hasLogo || branding.logoDataUrl) {
      return;
    }

    void queryClient.prefetchQuery({
      queryKey: queryKeys.tenant.logo,
      queryFn: () => fetchAuthenticatedBlob(api.tenantBrandingLogo),
      staleTime: 24 * 60 * 60 * 1000,
    });
  }, [enabled, query.data?.branding, queryClient]);

  return query;
}
