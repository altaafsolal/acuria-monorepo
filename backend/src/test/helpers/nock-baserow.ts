import nock from 'nock';
import { setRegistryCache } from '../../services/baserow/registry.js';
import { setTenantTableId } from '../../services/baserow/tenant-tables.js';

const BASEROW_URL = 'https://api.baserow.io';

/** Stable IDs for the main DB tables in tests */
export const TABLE_IDS = {
  users: '100',
  tenants: '101',
  auditLogs: '102',
  // Per-tenant tables
  clients: '200',
  gestionnaires: '201',
  kycDocuments: '202',
  notes: '203',
  relations: '204',
  tasks: '205',
  tenantAuditLogs: '206',
  fccClients: '207',
};

/** Pre-populate all caches so tests never hit Baserow for table discovery */
export function seedTableCaches(tenantId = '1'): void {
  setRegistryCache({
    usersTableId: TABLE_IDS.users,
    tenantsTableId: TABLE_IDS.tenants,
    auditLogsTableId: TABLE_IDS.auditLogs,
  });

  setTenantTableId(tenantId, 'clients', TABLE_IDS.clients);
  setTenantTableId(tenantId, 'gestionnaires', TABLE_IDS.gestionnaires);
  setTenantTableId(tenantId, 'kyc_documents', TABLE_IDS.kycDocuments);
  setTenantTableId(tenantId, 'notes', TABLE_IDS.notes);
  setTenantTableId(tenantId, 'relations', TABLE_IDS.relations);
  setTenantTableId(tenantId, 'tasks', TABLE_IDS.tasks);
  setTenantTableId(tenantId, 'audit_logs', TABLE_IDS.tenantAuditLogs);
  setTenantTableId(tenantId, 'fcc_clients', TABLE_IDS.fccClients);
}

/** Nock a Baserow listRows call (GET /api/database/rows/table/{tableId}/) */
export function nockListRows(
  tableId: string,
  results: Record<string, unknown>[],
  { times = 1 }: { times?: number } = {},
): nock.Scope {
  return nock(BASEROW_URL)
    .get(`/api/database/rows/table/${tableId}/`)
    .query(true)
    .times(times)
    .reply(200, { count: results.length, next: null, previous: null, results });
}

/** Nock a Baserow getRow call (GET /api/database/rows/table/{tableId}/{rowId}/) */
export function nockGetRow(
  tableId: string,
  rowId: string | number,
  row: Record<string, unknown>,
): nock.Scope {
  return nock(BASEROW_URL)
    .get(`/api/database/rows/table/${tableId}/${rowId}/`)
    .query(true)
    .reply(200, row);
}

/** Nock a Baserow createRow call (POST /api/database/rows/table/{tableId}/) */
export function nockCreateRow(
  tableId: string,
  response: Record<string, unknown>,
): nock.Scope {
  return nock(BASEROW_URL)
    .post(`/api/database/rows/table/${tableId}/`)
    .query(true)
    .reply(200, response);
}

/** Nock a Baserow updateRow call (PATCH /api/database/rows/table/{tableId}/{rowId}/) */
export function nockUpdateRow(
  tableId: string,
  rowId: string | number,
  response: Record<string, unknown>,
): nock.Scope {
  return nock(BASEROW_URL)
    .patch(`/api/database/rows/table/${tableId}/${rowId}/`)
    .query(true)
    .reply(200, response);
}

/** Nock a Baserow deleteRow call (DELETE /api/database/rows/table/{tableId}/{rowId}/) */
export function nockDeleteRow(
  tableId: string,
  rowId: string | number,
): nock.Scope {
  return nock(BASEROW_URL)
    .delete(`/api/database/rows/table/${tableId}/${rowId}/`)
    .reply(204);
}

/** Nock the users table listRows with a test user row */
export function nockUsersTable(
  userRows: Record<string, unknown>[],
  { times = 1 }: { times?: number } = {},
): nock.Scope {
  return nockListRows(TABLE_IDS.users, userRows, { times });
}

/** Nock a specific user row GET */
export function nockUserById(
  rowId: string | number,
  userRow: Record<string, unknown>,
): nock.Scope {
  return nockGetRow(TABLE_IDS.users, rowId, userRow);
}

/** Nock the tenants table listRows */
export function nockTenantsTable(
  tenantRows: Record<string, unknown>[],
  { times = 1 }: { times?: number } = {},
): nock.Scope {
  return nockListRows(TABLE_IDS.tenants, tenantRows, { times });
}

/** Stable IDs for a second tenant's per-tenant tables in multi-tenant tests */
export const TABLE_IDS_B = {
  clients: '300',
  gestionnaires: '301',
  kycDocuments: '302',
  notes: '303',
  relations: '304',
  tasks: '305',
  tenantAuditLogs: '306',
  fccClients: '307',
};

/** Seed table caches for a second tenant using a custom ID set */
export function seedTableCachesForTenant(
  tenantId: string,
  tableIds: typeof TABLE_IDS_B,
): void {
  setTenantTableId(tenantId, 'clients', tableIds.clients);
  setTenantTableId(tenantId, 'gestionnaires', tableIds.gestionnaires);
  setTenantTableId(tenantId, 'kyc_documents', tableIds.kycDocuments);
  setTenantTableId(tenantId, 'notes', tableIds.notes);
  setTenantTableId(tenantId, 'relations', tableIds.relations);
  setTenantTableId(tenantId, 'tasks', tableIds.tasks);
  setTenantTableId(tenantId, 'audit_logs', tableIds.tenantAuditLogs);
  setTenantTableId(tenantId, 'fcc_clients', tableIds.fccClients);
}

/** Nock a specific tenant row GET */
export function nockTenantById(
  rowId: string | number,
  tenantRow: Record<string, unknown>,
): nock.Scope {
  return nockGetRow(TABLE_IDS.tenants, rowId, tenantRow);
}
