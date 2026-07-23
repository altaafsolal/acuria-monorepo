import api from '../api';
import { useGet } from '../lib/api';
import { IS_SINGLE_TENANT, TENANT_SLUG } from '../config/tenant';
import type { PublicBrandingResponse } from '../types';

/**
 * Fetches the configured tenant's public branding for a single-tenant deployment.
 * Disabled (and never fetches) on the default Acuria build. The result also carries
 * the tenant id, which the login flow uses to restrict who may sign in.
 */
export function usePublicBranding() {
  return useGet<PublicBrandingResponse>({
    path: api.publicBranding(TENANT_SLUG),
    queryKey: ['public-branding', TENANT_SLUG],
    enabled: IS_SINGLE_TENANT,
    staleTime: Infinity,
    retry: false,
  });
}
