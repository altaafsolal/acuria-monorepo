export type Role = 'super_admin' | 'tenant_admin' | 'standard_user';

export type Status = 'active' | 'inactive' | 'pending' | 'provisioning' | 'failed';

export interface CountStats {
  total: number;
  active: number;
  inactive: number;
}

export interface HealthResponse {
  status: string;
  service: string;
  timestamp: string;
  baserow?: {
    configured: boolean;
    connected: boolean;
    message?: string;
  };
}

export interface ChartDataItem {
  label: string;
  active: number;
  inactive: number;
}
