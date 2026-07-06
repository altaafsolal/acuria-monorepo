import type { Gestionnaire } from './kyc';
import type { Role, Status } from './common';

export interface GestionnaireUserInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  role?: string;
  status?: string;
  peutSignerDocusign?: boolean;
  initiales?: string;
  couleur?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  tenantId: string | null;
  status: Status;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface UsersResponse {
  users: User[];
}

export interface UserResponse {
  user: User;
  gestionnaire?: Gestionnaire | null;
}

export interface CreateUserInput {
  name: string;
  email: string;
  role: Role;
  gestionnaire?: GestionnaireUserInput;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  role?: Role;
  status?: Status;
  gestionnaire?: GestionnaireUserInput;
}

export const EMPTY_GESTIONNAIRE_FORM: Required<GestionnaireUserInput> = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  role: '',
  status: 'Actif',
  peutSignerDocusign: false,
  initiales: '',
  couleur: '',
};

export function gestionnaireFromResponse(
  gestionnaire?: Gestionnaire | null,
  user?: Pick<User, 'email' | 'name'>,
): Required<GestionnaireUserInput> {
  if (!gestionnaire) {
    const nameParts = (user?.name ?? '').trim().split(/\s+/);
    const firstName = nameParts[0] ?? '';
    const lastName = nameParts.slice(1).join(' ');
    return {
      ...EMPTY_GESTIONNAIRE_FORM,
      firstName,
      lastName,
      email: user?.email ?? '',
    };
  }

  return {
    firstName: gestionnaire.firstName ?? '',
    lastName: gestionnaire.lastName ?? '',
    email: gestionnaire.email || user?.email || '',
    phone: gestionnaire.phone ?? '',
    role: gestionnaire.role ?? '',
    status: gestionnaire.status || 'Actif',
    peutSignerDocusign: gestionnaire.peutSignerDocusign,
    initiales: gestionnaire.initiales ?? '',
    couleur: gestionnaire.couleur ?? '',
  };
}

export function buildUserNameFromGestionnaire(
  gestionnaire: Pick<GestionnaireUserInput, 'firstName' | 'lastName'>,
  fallback = '',
): string {
  const name = [gestionnaire.firstName, gestionnaire.lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ');
  return name || fallback.trim();
}

export function hasUserEmail(email: string | null | undefined): boolean {
  return Boolean(email?.trim());
}
