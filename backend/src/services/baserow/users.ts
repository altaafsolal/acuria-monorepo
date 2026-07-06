import { BASEROW_FIELDS } from '../../../baserow/schema.js';
import { pickFieldValue, pickLinkRowId, pickTextValue } from '../../utils/baserow.js';
import { createRow, deleteRow, getRow, listAllRows, updateRow } from './api.js';
import { getUsersTableId } from './registry.js';
import type { BaserowRow, CreateUserInput, DbUser, PublicUser, UpdateUserInput } from '../../types/domain.js';

const F = BASEROW_FIELDS.users;

export const SUPER_ADMIN_ROLE = 'super_admin';

export function isSuperAdmin(user: Pick<DbUser, 'role'> | null | undefined): boolean {
  return user?.role === SUPER_ADMIN_ROLE;
}

/** Users included in dashboards, tenant counts, and platform stats. */
export function excludeSuperAdmins(users: DbUser[]): DbUser[] {
  return users.filter((user) => !isSuperAdmin(user));
}

export function mapUserRow(row: BaserowRow): DbUser {
  return {
    id: String(row.id),
    email: String(row[F.email] || '').trim().toLowerCase(),
    password_hash: String(row[F.passwordHash] || ''),
    name: String(row[F.name] || ''),
    role: pickFieldValue(row[F.role]) || '',
    tenant_id: pickLinkRowId(row[F.tenantId]),
    status: pickFieldValue(row[F.status]) || 'active',
    reset_token_hash: pickTextValue(row[F.resetTokenHash]) || null,
    reset_token_expires: pickTextValue(row[F.resetTokenExpires]) || null,
    otp_hash: pickTextValue(row[F.otpHash]) || null,
    otp_expires: pickTextValue(row[F.otpExpires]) || null,
    created_on: pickFieldValue(row[F.createdOn]),
    updated_on: pickFieldValue(row[F.updatedOn]),
    airtable_record_id: pickTextValue(row[F.airtableRecordId]) || null,
  };
}

export function normalizeUserEmail(email: string | null | undefined): string {
  return String(email ?? '').trim().toLowerCase();
}

export function hasUserEmail(user: Pick<DbUser, 'email'>): boolean {
  return normalizeUserEmail(user.email).length > 0;
}

export function toPublicUser(user: DbUser): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tenantId: user.tenant_id,
    status: user.status,
    createdAt: user.created_on,
    updatedAt: user.updated_on,
  };
}

export async function findUserByEmail(email: string): Promise<DbUser | null> {
  const tableId = await getUsersTableId();
  const normalized = email.trim().toLowerCase();
  const rows = await listAllRows(tableId);
  const row = rows.find((item) => String(item[F.email] || '').trim().toLowerCase() === normalized);
  return row ? mapUserRow(row) : null;
}

export async function findUserByAirtableRecordId(recordId: string): Promise<DbUser | null> {
  const tableId = await getUsersTableId();
  const rows = await listAllRows(tableId);
  const row = rows.find((item) => pickTextValue(item[F.airtableRecordId]) === recordId);
  return row ? mapUserRow(row) : null;
}

export async function findUserById(id: string): Promise<DbUser | null> {
  try {
    const tableId = await getUsersTableId();
    const row = await getRow(tableId, id);
    return mapUserRow(row);
  } catch {
    return null;
  }
}

export async function listUsers(): Promise<DbUser[]> {
  const tableId = await getUsersTableId();
  return (await listAllRows(tableId)).map(mapUserRow);
}

export async function listUsersByTenantId(tenantId: string): Promise<DbUser[]> {
  const tableId = await getUsersTableId();
  const rows = await listAllRows(tableId);
  return rows
    .filter((item) => pickLinkRowId(item[F.tenantId]) === String(tenantId))
    .map(mapUserRow);
}

export async function createUser(fields: CreateUserInput): Promise<DbUser> {
  const tableId = await getUsersTableId();
  const email = normalizeUserEmail(fields.email);
  const row = await createRow(tableId, {
    [F.email]: email || null,
    [F.passwordHash]: fields.password_hash ?? '',
    [F.name]: fields.name,
    [F.role]: fields.role,
    [F.tenantId]: fields.tenant_id ? [Number(fields.tenant_id)] : [],
    [F.status]: fields.status || 'active',
    [F.airtableRecordId]: fields.airtable_record_id || '',
  });
  return mapUserRow(row);
}

export async function userExists(email: string): Promise<boolean> {
  const normalized = normalizeUserEmail(email);
  if (!normalized) return false;
  return Boolean(await findUserByEmail(normalized));
}

export async function updateUser(id: string, fields: UpdateUserInput): Promise<DbUser> {
  const tableId = await getUsersTableId();
  const payload: Record<string, unknown> = {};

  if (fields.name !== undefined) payload[F.name] = fields.name;
  if (fields.email !== undefined) {
    const email = normalizeUserEmail(fields.email);
    payload[F.email] = email || null;
  }
  if (fields.role !== undefined) payload[F.role] = fields.role;
  if (fields.status !== undefined) payload[F.status] = fields.status;
  if (fields.password_hash !== undefined) payload[F.passwordHash] = fields.password_hash;
  if (fields.reset_token_hash !== undefined) payload[F.resetTokenHash] = fields.reset_token_hash;
  if (fields.reset_token_expires !== undefined) payload[F.resetTokenExpires] = fields.reset_token_expires;
  if (fields.otp_hash !== undefined) payload[F.otpHash] = fields.otp_hash;
  if (fields.otp_expires !== undefined) payload[F.otpExpires] = fields.otp_expires;
  if (fields.airtable_record_id !== undefined) payload[F.airtableRecordId] = fields.airtable_record_id || '';

  const row = await updateRow(tableId, id, payload);
  return mapUserRow(row);
}

export interface UpsertStandardUserInput {
  email?: string | null;
  name: string;
  tenantId: string;
  status?: string;
  airtableRecordId: string;
}

/** Creates or updates a tenant standard_user from an Airtable gestionnaire row. */
export async function upsertStandardUserFromGestionnaire(
  input: UpsertStandardUserInput,
): Promise<DbUser> {
  const email = normalizeUserEmail(input.email);
  const userStatus = input.status === 'Inactif' ? 'inactive' : 'active';

  let existing = await findUserByAirtableRecordId(input.airtableRecordId);
  if (!existing && email) {
    existing = await findUserByEmail(email);
  }

  if (existing) {
    if (existing.role === SUPER_ADMIN_ROLE) return existing;
    return updateUser(existing.id, {
      name: input.name,
      status: userStatus,
      airtable_record_id: input.airtableRecordId,
      ...(email ? { email } : {}),
    });
  }

  return createUser({
    email,
    name: input.name,
    role: 'standard_user',
    tenant_id: input.tenantId,
    status: userStatus,
    password_hash: '',
    airtable_record_id: input.airtableRecordId,
  });
}

export async function deleteUser(id: string): Promise<void> {
  const tableId = await getUsersTableId();
  await deleteRow(tableId, id);
}
