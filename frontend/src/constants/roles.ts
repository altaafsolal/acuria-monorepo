export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  TENANT_ADMIN: 'tenant_admin',
  STANDARD_USER: 'standard_user',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<Role, string> = {
  [ROLES.SUPER_ADMIN]: 'Super administrateur',
  [ROLES.TENANT_ADMIN]: 'Administrateur tenant',
  [ROLES.STANDARD_USER]: 'Utilisateur standard',
};

export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
} as const;

export const USER_STATUS_LABELS: Record<string, string> = {
  active: 'Actif',
  inactive: 'Inactif',
  pending: 'En attente d\'activation',
};

export const TENANT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PROVISIONING: 'provisioning',
  FAILED: 'failed',
} as const;

export const TENANT_STATUS_LABELS: Record<string, string> = {
  active: 'Actif',
  inactive: 'Inactif',
  provisioning: 'Création en cours…',
  failed: 'Échec de création',
};

export const CLIENT_STATUS_LABELS: Record<string, string> = {
  active: 'Client actif',
  inactive: 'Inactif',
  prospect: 'Prospect',
  archived: 'Archivé',
};

export const KYC_STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  in_progress: 'En cours',
  complete: 'Complet',
  rejected: 'Rejeté',
  incomplete: 'Incomplet',
};
