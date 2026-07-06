const baseUrl = import.meta.env.VITE_API_URL ?? '/api';

function buildAuditQuery(params: {
  page?: number;
  pageSize?: number;
  tenantId?: string;
  userId?: string;
  search?: string;
}): string {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.pageSize) qs.set('pageSize', String(params.pageSize));
  if (params.tenantId) qs.set('tenantId', params.tenantId);
  if (params.userId) qs.set('userId', params.userId);
  if (params.search) qs.set('search', params.search);
  const query = qs.toString();
  return query ? `?${query}` : '';
}

const api = {
  // Health
  health: `${baseUrl}/health`,

  // Auth
  login: `${baseUrl}/auth/login`,
  refresh: `${baseUrl}/auth/refresh`,
  logout: `${baseUrl}/auth/logout`,
  me: `${baseUrl}/auth/me`,
  forgotPassword: `${baseUrl}/auth/forgot-password`,
  verifyOtp: `${baseUrl}/auth/verify-otp`,
  setPassword: `${baseUrl}/auth/set-password`,

  // Files
  fileDownload: (url: string, filename: string) => {
    const qs = new URLSearchParams({ url, filename });
    return `${baseUrl}/files/download?${qs.toString()}`;
  },

  // Accueil
  accueil: `${baseUrl}/accueil`,

  // Clients
  clients: `${baseUrl}/clients`,
  clientById: (id: string) => `${baseUrl}/clients/${id}`,
  clientTimeline: (id: string) => `${baseUrl}/clients/${id}/timeline`,
  clientNotes: (clientId: string) => `${baseUrl}/clients/${clientId}/notes`,
  clientNoteById: (clientId: string, noteId: string) => `${baseUrl}/clients/${clientId}/notes/${noteId}`,
  clientRelations: (clientId: string) => `${baseUrl}/clients/${clientId}/relations`,
  clientRelationById: (clientId: string, relationId: string) => `${baseUrl}/clients/${clientId}/relations/${relationId}`,
  clientTasks: (clientId: string) => `${baseUrl}/clients/${clientId}/tasks`,
  clientTaskById: (clientId: string, taskId: string) => `${baseUrl}/clients/${clientId}/tasks/${taskId}`,
  clientKycDocuments: (clientId: string) => `${baseUrl}/clients/${clientId}/kyc-documents`,
  clientKycDocumentById: (clientId: string, documentId: string) =>
    `${baseUrl}/clients/${clientId}/kyc-documents/${documentId}`,

  // KYC
  kycSignataires: `${baseUrl}/kyc/signataires`,
  kycDer: (filter = '') => `${baseUrl}/kyc/der${filter ? `?filter=${encodeURIComponent(filter)}` : ''}`,
  kycFcc: (filter = '') => `${baseUrl}/kyc/fcc${filter ? `?filter=${encodeURIComponent(filter)}` : ''}`,
  kycDerSend: `${baseUrl}/kyc/der/send`,
  kycLdmSend: `${baseUrl}/kyc/ldm/send`,
  kycFccSend: `${baseUrl}/kyc/fcc/send`,

  // Gestionnaires
  gestionnaires: `${baseUrl}/gestionnaires`,

  // Users
  users: `${baseUrl}/users`,
  userById: (id: string) => `${baseUrl}/users/${id}`,
  userResetPassword: (id: string) => `${baseUrl}/users/${id}/reset-password`,

  // Platform / Dashboard
  platformStats: `${baseUrl}/platform/stats`,
  tenantStats: `${baseUrl}/tenant/stats`,
  tenantBranding: `${baseUrl}/tenant/branding`,
  tenantBrandingLogo: `${baseUrl}/tenant/branding/logo`,
  tenants: `${baseUrl}/platform/tenants`,
  tenantById: (id: string) => `${baseUrl}/platform/tenants/${id}`,
  platformTenantLogo: (id: string) => `${baseUrl}/platform/tenants/${id}/logo`,
  tenantUsers: (id: string) => `${baseUrl}/platform/tenants/${id}/users`,
  tenantUserCreate: (id: string) => `${baseUrl}/platform/tenants/${id}/users`,
  tenantUserById: (tenantId: string, userId: string) => `${baseUrl}/platform/tenants/${tenantId}/users/${userId}`,
  tenantUserResetPassword: (tenantId: string, userId: string) => `${baseUrl}/platform/tenants/${tenantId}/users/${userId}/reset-password`,
  tenantClients: (id: string) => `${baseUrl}/platform/tenants/${id}/clients`,

  // Audit
  platformAuditLogs: (params: {
    page?: number;
    pageSize?: number;
    tenantId?: string;
    search?: string;
  } = {}) => `${baseUrl}/platform/audit${buildAuditQuery(params)}`,
  auditLogs: (params: {
    page?: number;
    pageSize?: number;
    userId?: string;
    search?: string;
  } = {}) => `${baseUrl}/audit${buildAuditQuery(params)}`,
};

export default api;
