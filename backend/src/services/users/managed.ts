import { tenantsRepo, usersRepo } from '../baserow/index.js';
import * as passwordResetService from '../password-reset.js';
import {
  clearGestionnaireUserLink,
  getGestionnaireForUser,
  syncGestionnaireFromStandardUser,
} from './gestionnaire.js';
import type {
  DbUser,
  GestionnaireUserInput,
  PublicGestionnaire,
  UserWithGestionnaireResponse,
} from '../../types/domain.js';

const { hasUserEmail, normalizeUserEmail } = usersRepo;

export function assertEmailProvidedForSave(
  existing: DbUser,
  email: string | undefined,
): void {
  const hadEmail = hasUserEmail(existing);
  const nextEmail = normalizeUserEmail(email ?? existing.email);
  if (!hadEmail && !nextEmail) {
    throw new Error('Un e-mail est requis pour enregistrer cet utilisateur');
  }
}

export async function getUserWithGestionnaire(
  tenantId: string,
  userId: string,
): Promise<UserWithGestionnaireResponse | null> {
  const user = await usersRepo.findUserById(userId);
  if (!user || user.tenant_id !== tenantId || usersRepo.isSuperAdmin(user)) {
    return null;
  }

  const gestionnaire = user.role === 'standard_user'
    ? await getGestionnaireForUser(tenantId, userId)
    : null;

  return {
    user: usersRepo.toPublicUser(user),
    gestionnaire,
  };
}

export async function createManagedUser(
  tenantId: string,
  input: {
    name: string;
    email: string;
    role: string;
    gestionnaire?: GestionnaireUserInput;
  },
): Promise<UserWithGestionnaireResponse> {
  const tenant = await tenantsRepo.findTenantById(tenantId);
  if (!tenant) {
    throw new Error('Tenant not found');
  }

  const email = normalizeUserEmail(input.email);
  if (!email) {
    throw new Error('Email is required');
  }
  if (await usersRepo.userExists(email)) {
    throw new Error('A user with this email already exists');
  }

  const user = await usersRepo.createUser({
    email,
    password_hash: '',
    name: input.name.trim(),
    role: input.role,
    tenant_id: tenantId,
    status: 'pending',
  });

  await passwordResetService.issueSetPasswordToken(user, {
    name: tenant.branding_name || tenant.name,
    email: tenant.email || '',
  });

  let gestionnaire: PublicGestionnaire | null = null;
  if (input.role === 'standard_user') {
    gestionnaire = await syncGestionnaireFromStandardUser(
      tenantId,
      user,
      { ...input.gestionnaire, email },
    );
  }

  return {
    user: usersRepo.toPublicUser(user),
    gestionnaire,
  };
}

export async function updateManagedUser(
  tenantId: string,
  userId: string,
  input: {
    name?: string;
    email?: string;
    role?: string;
    status?: string;
    gestionnaire?: GestionnaireUserInput;
  },
  options: { isSelf?: boolean } = {},
): Promise<UserWithGestionnaireResponse> {
  const existing = await usersRepo.findUserById(userId);
  if (!existing || existing.tenant_id !== tenantId || usersRepo.isSuperAdmin(existing)) {
    throw new Error('User not found');
  }

  if (options.isSelf && (input.role !== undefined || input.status !== undefined)) {
    throw new Error('You cannot change your own role or status');
  }

  assertEmailProvidedForSave(existing, input.email);

  const nextEmail = normalizeUserEmail(input.email ?? existing.email);
  if (nextEmail && nextEmail !== normalizeUserEmail(existing.email)) {
    if (await usersRepo.userExists(nextEmail)) {
      throw new Error('A user with this email already exists');
    }
  }

  const previousRole = existing.role;
  const nextRole = input.role ?? existing.role;

  const updates: Parameters<typeof usersRepo.updateUser>[1] = {};
  if (input.name !== undefined) updates.name = input.name.trim();
  if (input.email !== undefined) updates.email = nextEmail;
  if (!options.isSelf && input.role !== undefined) updates.role = input.role;
  if (!options.isSelf && input.status !== undefined) updates.status = input.status;

  const user = Object.keys(updates).length > 0
    ? await usersRepo.updateUser(userId, updates)
    : existing;

  if (previousRole === 'standard_user' && nextRole === 'tenant_admin') {
    await clearGestionnaireUserLink(tenantId, userId);
  }

  let gestionnaire: PublicGestionnaire | null = null;
  if (nextRole === 'standard_user') {
    gestionnaire = await syncGestionnaireFromStandardUser(
      tenantId,
      user,
      { ...input.gestionnaire, email: nextEmail || input.gestionnaire?.email },
    );
  } else {
    gestionnaire = await getGestionnaireForUser(tenantId, userId);
  }

  return {
    user: usersRepo.toPublicUser(user),
    gestionnaire,
  };
}
