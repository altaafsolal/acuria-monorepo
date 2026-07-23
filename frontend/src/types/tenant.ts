import type { Status } from './common';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: Status;
  createdAt: string | null;
  updatedAt: string | null;
  userCount?: number;
  clientCount?: number;
  brandingName?: string | null;
  brandingOrias?: string | null;
  brandingAccent?: string | null;
  hasBrandingLogo?: boolean;
  brandingLogoDataUrl?: string | null;
  workspaceId?: string | null;
  databaseId?: string | null;
  databaseToken?: string | null;
  email?: string | null;
  backofficeEmail?: string | null;
  sharepoint?: SharepointStatus;
  emailIntegration?: EmailStatus;
}

export type EmailProvider = 'microsoft' | 'google';

/** What the API reveals about a tenant's email connection. No tokens, ever. */
export interface EmailStatus {
  connected: boolean;
  provider: EmailProvider | null;
  senderAddress: string | null;
  connectedAt: string | null;
  connectedBy: string | null;
  scopeMissing: boolean;
}

export interface EmailStatusResponse {
  email: EmailStatus;
}

export interface EmailConnectResponse {
  authorizeUrl: string;
}

/** What the API reveals about a tenant's Microsoft 365 link. Tokens live only in
 *  the backend — they are never part of any response. */
export interface SharepointStatus {
  connected: boolean;
  siteId: string | null;
  driveId: string | null;
  siteDisplayName: string | null;
  connectedAt: string | null;
  connectedBy: string | null;
}

export interface SharepointStatusResponse {
  sharepoint: SharepointStatus;
}

export interface SharepointConnectResponse {
  authorizeUrl: string;
}

export interface SharepointConfigInput {
  tenantId: string;
  siteId: string;
  driveId: string;
  siteDisplayName?: string;
}

export interface TenantsResponse {
  tenants: Tenant[];
}

export interface TenantResponse {
  tenant: Tenant;
}

export interface CreateTenantInput {
  name: string;
  slug: string;
}

/** Public branding for the login page of a single-tenant deployment. */
export interface PublicTenantBranding {
  id: string;
  slug: string;
  name: string;
  orias: string | null;
  accent: string;
  hasLogo: boolean;
  logoDataUrl: string | null;
}

export interface PublicBrandingResponse {
  tenant: PublicTenantBranding;
}

export interface UpdateTenantBrandingInput {
  brandingName?: string;
  brandingOrias?: string;
  brandingAccent?: string;
  status?: 'active' | 'inactive';
  logo?: File;
  removeBrandingLogo?: boolean;
  email?: string;
  backofficeEmail?: string;
}

export interface PlatformStats {
  tenants: import('./common').CountStats;
  users: import('./common').CountStats;
  clients: import('./common').CountStats;
}

export interface TenantStats extends PlatformStats {
  tenant: Tenant;
}

export type DashboardStats = PlatformStats | TenantStats;
