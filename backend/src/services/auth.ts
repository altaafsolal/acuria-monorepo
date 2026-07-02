import { isBaserowConfigured } from '../config/env.js';
import { usersRepo } from './baserow/index.js';
import type { DbUser, PublicUser } from '../types/domain.js';

export async function findUserByEmail(email: string): Promise<DbUser | null> {
  if (!isBaserowConfigured()) throw new Error('Baserow is not configured');
  return usersRepo.findUserByEmail(email);
}

export async function findUserById(id: string): Promise<DbUser | null> {
  if (!isBaserowConfigured()) throw new Error('Baserow is not configured');
  return usersRepo.findUserById(id);
}

export function toPublicUser(user: DbUser): PublicUser {
  return usersRepo.toPublicUser(user);
}
