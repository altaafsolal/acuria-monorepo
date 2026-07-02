export interface AuditLog {
  id: string;
  createdAt: string;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  userRole: string | null;
  tenantId: string | null;
  action: string;
  method: string;
  path: string;
  statusCode: number;
  entityType: string | null;
  entityId: string | null;
  details: string | null;
}

export interface AuditLogsResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  size: number;
}

export interface AuditListParams {
  page?: number;
  pageSize?: number;
  tenantId?: string;
  userId?: string;
  search?: string;
}
