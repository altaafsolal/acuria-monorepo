import { describe, it, expect, beforeEach } from 'vitest';
import supertest from 'supertest';
import { app } from '../test/helpers/app.js';
import { authHeader } from '../test/helpers/auth.js';
import {
  makeDbUser,
  makeDbUserRow,
  makeTenantRecord,
  makeTenantRow,
  makeDbGestionnaire,
} from '../test/helpers/fixtures.js';
import {
  seedTableCaches,
  nockUserById,
  nockTenantById,
  nockListRows,
  TABLE_IDS,
} from '../test/helpers/nock-baserow.js';
import { BASEROW_FIELDS } from '../../baserow/schema.js';

const TENANT_ID = '1';
const TENANT_ADMIN_ID = '10';
const STANDARD_USER_ID = '20';
const SUPER_ADMIN_ID = '30';

const tenant = makeTenantRecord({ id: TENANT_ID, database_token: 'test-tenant-token' });
const tenantRow = makeTenantRow(tenant);

const tenantAdmin = makeDbUser({
  id: TENANT_ADMIN_ID,
  role: 'tenant_admin',
  tenant_id: TENANT_ID,
  email: 'admin@tenant.com',
});
const tenantAdminRow = makeDbUserRow(tenantAdmin);

const standardUser = makeDbUser({
  id: STANDARD_USER_ID,
  role: 'standard_user',
  tenant_id: TENANT_ID,
  email: 'user@tenant.com',
});
const standardUserRow = makeDbUserRow(standardUser);

const superAdmin = makeDbUser({
  id: SUPER_ADMIN_ID,
  role: 'super_admin',
  tenant_id: null,
  email: 'super@acuria.com',
});
const superAdminRow = makeDbUserRow(superAdmin);

function makeGestionnaireRow(g: ReturnType<typeof makeDbGestionnaire>): Record<string, unknown> {
  const F = BASEROW_FIELDS.gestionnaires;
  return {
    id: Number(g.id),
    [F.name]: g.name,
    [F.firstName]: g.first_name ?? '',
    [F.lastName]: g.last_name ?? '',
    [F.email]: g.email,
    [F.phone]: g.phone ?? '',
    [F.role]: g.role ?? '',
    [F.peutSignerDocusign]: g.peut_signer_docusign,
    [F.status]: g.status ? { id: 1, value: g.status, color: 'green' } : null,
    [F.initiales]: g.initiales ?? '',
    [F.couleur]: g.couleur ?? '',
    [F.userId]: g.user_id ? [{ id: Number(g.user_id), value: '' }] : [],
    [F.airtableRecordId]: g.airtable_record_id ?? '',
  };
}

function makeAuditLogRow(overrides: {
  id: number;
  action?: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  userRole?: string;
  tenantId?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  createdAt?: string;
} = { id: 1 }): Record<string, unknown> {
  const F = BASEROW_FIELDS.auditLogs;
  return {
    id: overrides.id,
    [F.name]: overrides.action ?? 'test.action',
    [F.createdAt]: overrides.createdAt ?? '2026-07-14T10:00:00Z',
    [F.userId]: overrides.userId ?? '999',
    [F.userEmail]: overrides.userEmail ?? 'user@example.com',
    [F.userName]: overrides.userName ?? 'Test User',
    [F.userRole]: overrides.userRole ?? 'standard_user',
    [F.tenantId]: overrides.tenantId ?? TENANT_ID,
    [F.action]: overrides.action ?? 'test.action',
    [F.method]: overrides.method ?? 'GET',
    [F.path]: overrides.path ?? '/api/clients',
    [F.statusCode]: overrides.statusCode ?? 200,
    [F.entityType]: '',
    [F.entityId]: '',
    [F.details]: '',
  };
}

// ─── GET /api/health ────────────────────────────────────────────────────────

describe('GET /api/health', () => {
  beforeEach(() => {
    seedTableCaches(TENANT_ID);
  });

  it('returns 200 with the expected shape', async () => {
    const res = await supertest(app)
      .get('/api/health')
      .expect(200);

    expect(res.body.service).toBe('acuria-backend');
    expect(res.body.status).toBeDefined();
    expect(res.body.timestamp).toBeDefined();
    expect(res.body.baserow).toBeDefined();
  });
});

// ─── GET /api/gestionnaires ──────────────────────────────────────────────────

describe('GET /api/gestionnaires', () => {
  beforeEach(() => {
    seedTableCaches(TENANT_ID);
  });

  it('returns gestionnaires list for tenant_admin', async () => {
    const gest = makeDbGestionnaire({ id: '50', status: 'Actif' });

    nockUserById(TENANT_ADMIN_ID, tenantAdminRow);
    // resolveTenantDbContext calls findTenantById
    nockTenantById(TENANT_ID, tenantRow);
    nockListRows(TABLE_IDS.gestionnaires, [makeGestionnaireRow(gest)]);

    const res = await supertest(app)
      .get('/api/gestionnaires')
      .set('Authorization', authHeader({ userId: TENANT_ADMIN_ID, role: 'tenant_admin', tenantId: TENANT_ID }))
      .expect(200);

    expect(res.body.gestionnaires).toHaveLength(1);
    expect(res.body.gestionnaires[0].id).toBe(gest.id);
    expect(res.body.gestionnaires[0].name).toBe(gest.name);
    expect(res.body.gestionnaires[0].email).toBe(gest.email);
    expect(res.body.gestionnaires[0].peutSignerDocusign).toBe(true);
  });

  it('returns gestionnaires list for standard_user', async () => {
    const gest1 = makeDbGestionnaire({ id: '51', status: 'Actif' });
    const gest2 = makeDbGestionnaire({ id: '52', status: 'Actif' });

    nockUserById(STANDARD_USER_ID, standardUserRow);
    nockTenantById(TENANT_ID, tenantRow);
    nockListRows(TABLE_IDS.gestionnaires, [
      makeGestionnaireRow(gest1),
      makeGestionnaireRow(gest2),
    ]);

    const res = await supertest(app)
      .get('/api/gestionnaires')
      .set('Authorization', authHeader({ userId: STANDARD_USER_ID, role: 'standard_user', tenantId: TENANT_ID }))
      .expect(200);

    expect(res.body.gestionnaires).toHaveLength(2);
  });

  it('filters out inactive gestionnaires', async () => {
    const actif = makeDbGestionnaire({ id: '53', status: 'Actif' });
    const inactif = makeDbGestionnaire({ id: '54', status: 'Inactif' });

    nockUserById(STANDARD_USER_ID, standardUserRow);
    nockTenantById(TENANT_ID, tenantRow);
    nockListRows(TABLE_IDS.gestionnaires, [
      makeGestionnaireRow(actif),
      makeGestionnaireRow(inactif),
    ]);

    const res = await supertest(app)
      .get('/api/gestionnaires')
      .set('Authorization', authHeader({ userId: STANDARD_USER_ID, role: 'standard_user', tenantId: TENANT_ID }))
      .expect(200);

    expect(res.body.gestionnaires).toHaveLength(1);
    expect(res.body.gestionnaires[0].id).toBe(actif.id);
  });

  it('returns 401 without auth', async () => {
    const res = await supertest(app)
      .get('/api/gestionnaires')
      .expect(401);

    expect(res.body.error).toBeDefined();
  });

  it('returns 403 for super_admin (wrong role)', async () => {
    nockUserById(SUPER_ADMIN_ID, superAdminRow);

    const res = await supertest(app)
      .get('/api/gestionnaires')
      .set('Authorization', authHeader({ userId: SUPER_ADMIN_ID, role: 'super_admin' }))
      .expect(403);

    expect(res.body.error).toBeDefined();
  });
});

// ─── GET /api/tenant/stats ───────────────────────────────────────────────────

describe('GET /api/tenant/stats', () => {
  beforeEach(() => {
    seedTableCaches(TENANT_ID);
  });

  it('returns stats for tenant_admin', async () => {
    const tenantUser = makeDbUser({ id: '60', role: 'standard_user', tenant_id: TENANT_ID });

    nockUserById(TENANT_ADMIN_ID, tenantAdminRow);

    // getTenantStats: findTenantById
    nockTenantById(TENANT_ID, tenantRow);
    // listUsersByTenantId -> listAllRows on users table
    nockListRows(TABLE_IDS.users, [makeDbUserRow(tenantUser), tenantAdminRow]);
    // listClientsByTenantId -> resolveTenantDbContext -> findTenantById
    nockTenantById(TENANT_ID, tenantRow);
    // listClientsByTenantId -> listAllRows on clients table
    nockListRows(TABLE_IDS.clients, []);
    // enrichTenants: listUsersByTenantId again
    nockListRows(TABLE_IDS.users, [makeDbUserRow(tenantUser)]);
    // enrichTenants: countClientsByTenantId -> listRowsPage (size=1)
    nockListRows(TABLE_IDS.clients, []);

    const res = await supertest(app)
      .get('/api/tenant/stats')
      .set('Authorization', authHeader({ userId: TENANT_ADMIN_ID, role: 'tenant_admin', tenantId: TENANT_ID }))
      .expect(200);

    expect(res.body.tenant).toBeDefined();
    expect(res.body.users).toBeDefined();
    expect(res.body.clients).toBeDefined();
  });

  it('returns 403 for standard_user', async () => {
    nockUserById(STANDARD_USER_ID, standardUserRow);

    const res = await supertest(app)
      .get('/api/tenant/stats')
      .set('Authorization', authHeader({ userId: STANDARD_USER_ID, role: 'standard_user', tenantId: TENANT_ID }))
      .expect(403);

    expect(res.body.error).toBeDefined();
  });

  it('returns 401 without auth', async () => {
    const res = await supertest(app)
      .get('/api/tenant/stats')
      .expect(401);

    expect(res.body.error).toBeDefined();
  });
});

// ─── GET /api/audit ──────────────────────────────────────────────────────────

describe('GET /api/audit', () => {
  beforeEach(() => {
    seedTableCaches(TENANT_ID);
  });

  it('returns paginated audit logs for tenant_admin', async () => {
    const log1 = makeAuditLogRow({ id: 1, action: 'client.create', tenantId: TENANT_ID });
    const log2 = makeAuditLogRow({ id: 2, action: 'client.update', tenantId: TENANT_ID });

    nockUserById(TENANT_ADMIN_ID, tenantAdminRow);
    // listAuditLogs uses the main audit_logs table from registry (TABLE_IDS.auditLogs)
    nockListRows(TABLE_IDS.auditLogs, [log1, log2]);

    const res = await supertest(app)
      .get('/api/audit')
      .set('Authorization', authHeader({ userId: TENANT_ADMIN_ID, role: 'tenant_admin', tenantId: TENANT_ID }))
      .expect(200);

    expect(res.body.logs).toHaveLength(2);
    expect(res.body.total).toBe(2);
    expect(res.body.page).toBe(1);
    expect(res.body.size).toBe(50);
    expect(res.body.logs[0].action).toBe('client.create');
    expect(res.body.logs[1].action).toBe('client.update');
  });

  it('respects page and pageSize query params', async () => {
    nockUserById(TENANT_ADMIN_ID, tenantAdminRow);
    nockListRows(TABLE_IDS.auditLogs, []);

    const res = await supertest(app)
      .get('/api/audit?page=2&pageSize=10')
      .set('Authorization', authHeader({ userId: TENANT_ADMIN_ID, role: 'tenant_admin', tenantId: TENANT_ID }))
      .expect(200);

    expect(res.body.page).toBe(2);
    expect(res.body.size).toBe(10);
  });

  it('returns 403 for standard_user', async () => {
    nockUserById(STANDARD_USER_ID, standardUserRow);

    const res = await supertest(app)
      .get('/api/audit')
      .set('Authorization', authHeader({ userId: STANDARD_USER_ID, role: 'standard_user', tenantId: TENANT_ID }))
      .expect(403);

    expect(res.body.error).toBeDefined();
  });

  it('returns 401 without auth', async () => {
    const res = await supertest(app)
      .get('/api/audit')
      .expect(401);

    expect(res.body.error).toBeDefined();
  });
});

// ─── GET /api/platform/audit ─────────────────────────────────────────────────

describe('GET /api/platform/audit', () => {
  beforeEach(() => {
    seedTableCaches(TENANT_ID);
  });

  it('returns audit logs for super_admin', async () => {
    const log1 = makeAuditLogRow({ id: 1, action: 'tenant.create', tenantId: TENANT_ID });
    const log2 = makeAuditLogRow({ id: 2, action: 'user.create', tenantId: TENANT_ID });

    nockUserById(SUPER_ADMIN_ID, superAdminRow);
    nockListRows(TABLE_IDS.auditLogs, [log1, log2]);

    const res = await supertest(app)
      .get('/api/platform/audit')
      .set('Authorization', authHeader({ userId: SUPER_ADMIN_ID, role: 'super_admin' }))
      .expect(200);

    expect(res.body.logs).toHaveLength(2);
    expect(res.body.total).toBe(2);
    expect(res.body.page).toBe(1);
    expect(res.body.size).toBe(50);
    expect(res.body.logs[0].action).toBe('tenant.create');
  });

  it('supports pagination and tenantId filter', async () => {
    nockUserById(SUPER_ADMIN_ID, superAdminRow);
    nockListRows(TABLE_IDS.auditLogs, []);

    const res = await supertest(app)
      .get(`/api/platform/audit?page=3&pageSize=25&tenantId=${TENANT_ID}`)
      .set('Authorization', authHeader({ userId: SUPER_ADMIN_ID, role: 'super_admin' }))
      .expect(200);

    expect(res.body.page).toBe(3);
    expect(res.body.size).toBe(25);
    expect(res.body.logs).toEqual([]);
  });

  it('returns 403 for tenant_admin', async () => {
    nockUserById(TENANT_ADMIN_ID, tenantAdminRow);

    const res = await supertest(app)
      .get('/api/platform/audit')
      .set('Authorization', authHeader({ userId: TENANT_ADMIN_ID, role: 'tenant_admin', tenantId: TENANT_ID }))
      .expect(403);

    expect(res.body.error).toBeDefined();
  });

  it('returns 403 for standard_user', async () => {
    nockUserById(STANDARD_USER_ID, standardUserRow);

    const res = await supertest(app)
      .get('/api/platform/audit')
      .set('Authorization', authHeader({ userId: STANDARD_USER_ID, role: 'standard_user', tenantId: TENANT_ID }))
      .expect(403);

    expect(res.body.error).toBeDefined();
  });

  it('returns 401 without auth', async () => {
    const res = await supertest(app)
      .get('/api/platform/audit')
      .expect(401);

    expect(res.body.error).toBeDefined();
  });
});
