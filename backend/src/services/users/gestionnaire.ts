import * as gestionnairesRepo from '../baserow/gestionnaires.js';
import { usersRepo } from '../baserow/index.js';
import type {
  DbUser,
  GestionnaireUserInput,
  PublicGestionnaire,
} from '../../types/domain.js';

const { normalizeUserEmail } = usersRepo;

export function buildGestionnaireName(
  input: GestionnaireUserInput,
  fallbackName: string,
): string {
  const fromParts = [input.firstName, input.lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ');
  return fromParts || fallbackName.trim();
}

export async function getGestionnaireForUser(
  tenantId: string,
  userId: string,
): Promise<PublicGestionnaire | null> {
  const gestionnaire = await gestionnairesRepo.findGestionnaireByUserId(tenantId, userId);
  return gestionnaire ? gestionnairesRepo.toPublicGestionnaire(gestionnaire) : null;
}

export async function syncGestionnaireFromStandardUser(
  tenantId: string,
  user: DbUser,
  input: GestionnaireUserInput | undefined,
): Promise<PublicGestionnaire> {
  const email = normalizeUserEmail(input?.email ?? user.email);
  const name = buildGestionnaireName(input ?? {}, user.name);

  const gestionnaire = await gestionnairesRepo.upsertGestionnaire(tenantId, {
    name,
    firstName: input?.firstName?.trim() || null,
    lastName: input?.lastName?.trim() || null,
    email: email || null,
    phone: input?.phone?.trim() || null,
    role: input?.role?.trim() || null,
    peutSignerDocusign: input?.peutSignerDocusign ?? false,
    status: input?.status === 'Inactif' ? 'Inactif' : 'Actif',
    initiales: input?.initiales?.trim() || null,
    couleur: input?.couleur?.trim() || null,
    userId: user.id,
  });

  return gestionnairesRepo.toPublicGestionnaire(gestionnaire);
}

export async function clearGestionnaireUserLink(
  tenantId: string,
  userId: string,
): Promise<void> {
  await gestionnairesRepo.clearGestionnaireUserLink(tenantId, userId);
}
