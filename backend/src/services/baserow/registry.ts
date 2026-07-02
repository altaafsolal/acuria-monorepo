import { env } from '../../config/env.js';
import { BASEROW_TABLES } from '../../../baserow/schema.js';
import { listDatabaseTables } from './api.js';

interface MainTableIds {
  usersTableId: string;
  tenantsTableId: string;
  auditLogsTableId: string;
}

let cachedTableIds: MainTableIds | null = null;

async function discoverMainTableIds(): Promise<MainTableIds> {
  if (cachedTableIds) return cachedTableIds;

  const tables = await listDatabaseTables(env.baserow.mainDatabaseId);
  const usersTable = tables.find((t) => t.name === BASEROW_TABLES.users);
  const tenantsTable = tables.find((t) => t.name === BASEROW_TABLES.tenants);
  const auditLogsTable = tables.find((t) => t.name === BASEROW_TABLES.auditLogs);

  if (!usersTable || !tenantsTable) {
    throw new Error(
      `Database ${env.baserow.mainDatabaseId} is missing "users" and/or "tenants" tables. Run: npm run setup`,
    );
  }

  if (!auditLogsTable) {
    throw new Error(
      `Database ${env.baserow.mainDatabaseId} is missing "audit_logs" table. Run: npm run setup`,
    );
  }

  cachedTableIds = {
    usersTableId: String(usersTable.id),
    tenantsTableId: String(tenantsTable.id),
    auditLogsTableId: String(auditLogsTable.id),
  };
  return cachedTableIds;
}

export async function resolveMainTableIds(): Promise<MainTableIds> {
  return discoverMainTableIds();
}

export async function getUsersTableId(): Promise<string> {
  const { usersTableId } = await resolveMainTableIds();
  return usersTableId;
}

export async function getTenantsTableId(): Promise<string> {
  const { tenantsTableId } = await resolveMainTableIds();
  return tenantsTableId;
}

export async function getAuditLogsTableId(): Promise<string> {
  const { auditLogsTableId } = await resolveMainTableIds();
  return auditLogsTableId;
}
