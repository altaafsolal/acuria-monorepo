import type { AuditListParams } from '../types';

export const queryKeys = {
  health: ['health'] as const,
  auth: {
    session: ['auth', 'session'] as const,
  },
  platform: {
    stats: ['platform', 'stats'] as const,
    tenants: ['platform', 'tenants'] as const,
    tenant: (tenantId: string) => ['platform', 'tenant', tenantId] as const,
    tenantUsers: (tenantId: string) => ['platform', 'tenant', tenantId, 'users'] as const,
    tenantUser: (tenantId: string, userId: string) => ['platform', 'tenant', tenantId, 'user', userId] as const,
    tenantClients: (tenantId: string) => ['platform', 'tenant', tenantId, 'clients'] as const,
  },
  tenant: {
    stats: ['tenant', 'stats'] as const,
    branding: ['tenant', 'branding'] as const,
    logo: ['tenant', 'logo'] as const,
  },
  assets: {
    tenantLogo: (tenantId: string) => ['assets', 'tenant-logo', tenantId] as const,
  },
  accueil: {
    data: ['accueil', 'data'] as const,
  },
  kyc: {
    der: (filter: string) => ['kyc', 'der', filter] as const,
    fcc: (filter: string) => ['kyc', 'fcc', filter] as const,
    signataires: ['kyc', 'signataires'] as const,
    fccHistory: (clientId?: string) => ['fcc', 'history', clientId ?? ''] as const,
    fccDossiers: ['fcc', 'dossiers'] as const,
  },
  gestionnaires: {
    list: ['gestionnaires', 'list'] as const,
  },
  clients: {
    list: ['clients', 'list'] as const,
    detail: (clientId: string) => ['clients', 'detail', clientId] as const,
    notes: (clientId: string) => ['clients', clientId, 'notes'] as const,
    relations: (clientId: string) => ['clients', clientId, 'relations'] as const,
    tasks: (clientId: string) => ['clients', clientId, 'tasks'] as const,
    kycDocuments: (clientId: string) => ['clients', clientId, 'kyc-documents'] as const,
    timeline: (clientId: string) => ['clients', clientId, 'timeline'] as const,
  },
  users: {
    list: ['users', 'list'] as const,
    detail: (userId: string) => ['users', 'detail', userId] as const,
  },
  audit: {
    platform: (params: AuditListParams = {}) => ['audit', 'platform', params] as const,
    tenant: (params: AuditListParams = {}) => ['audit', 'tenant', params] as const,
  },
};
