import type { TenantRecord } from '../../types/domain.js';

/**
 * The tenant identifier every document-writing Make scenario needs.
 *
 * Make uploads to the tenant's own SharePoint. To do that it calls the token
 * broker — GET /api/tenants/{tenant_id}/sharepoint/token — which returns a fresh
 * access token AND the tenant's site_id / drive_id. So the webhook payload only
 * has to carry `tenant_id`; Make gets everything else from the broker response.
 * (We deliberately do NOT ship site_id/drive_id here — one source of truth.)
 *
 * Empty string rather than null, matching the `|| ""` convention every other Make
 * payload field uses.
 */
export function sharepointBrokerFields(tenant: TenantRecord | null): {
  tenant_id: string;
} {
  return {
    tenant_id: tenant?.id || '',
  };
}
