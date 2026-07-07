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
  dropboxPathBase?: string | null;
  email?: string | null;
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

export interface UpdateTenantBrandingInput {
  brandingName?: string;
  brandingOrias?: string;
  brandingAccent?: string;
  status?: 'active' | 'inactive';
  logo?: File;
  removeBrandingLogo?: boolean;
  dropboxPathBase?: string;
  email?: string;
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
