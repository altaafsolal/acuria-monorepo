import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import supertest from 'supertest';
import { app } from '../../test/helpers/app.js';
import { authHeader } from '../../test/helpers/auth.js';
import {
  makeDbUser,
  makeDbUserRow,
  makeDbGestionnaire,
  makeTenantRecord,
  makeTenantRow,
} from '../../test/helpers/fixtures.js';
import {
  seedTableCaches,
  nockUserById,
  nockTenantById,
  nockGetRow,
  nockCreateRow,
  nockUpdateRow,
  nockListRows,
  TABLE_IDS,
} from '../../test/helpers/nock-baserow.js';
import { stubFetch, restoreFetch } from '../../test/helpers/nock-make.js';
import { BASEROW_FIELDS } from '../../../baserow/schema.js';

const F = BASEROW_FIELDS;

const TENANT_ID = '1';
const ADMIN_USER_ID = '11';

function makeGestionnaireRow(g: ReturnType<typeof makeDbGestionnaire>): Record<string, unknown> {
  return {
    id: Number(g.id),
    [F.gestionnaires.name]: g.name,
    [F.gestionnaires.firstName]: g.first_name ?? '',
    [F.gestionnaires.lastName]: g.last_name ?? '',
    [F.gestionnaires.email]: g.email ?? '',
    [F.gestionnaires.phone]: g.phone ?? '',
    [F.gestionnaires.role]: g.role ?? '',
    [F.gestionnaires.peutSignerDocusign]: g.peut_signer_docusign,
    [F.gestionnaires.status]: { id: 1, value: g.status, color: 'green' },
    [F.gestionnaires.initiales]: g.initiales ?? '',
    [F.gestionnaires.userId]: g.user_id ?? '',
    [F.gestionnaires.airtableRecordId]: g.airtable_record_id ?? '',
  };
}

function setupAdmin() {
  const tenant = makeTenantRecord({ id: TENANT_ID });
  const tenantRow = makeTenantRow(tenant);

  const adminUser = makeDbUser({ id: ADMIN_USER_ID, role: 'tenant_admin', tenant_id: TENANT_ID });
  const adminRow = makeDbUserRow(adminUser);

  seedTableCaches(TENANT_ID);
  // auth middleware fetches the caller
  nockUserById(ADMIN_USER_ID, adminRow);
  // requireTenant calls findTenantById
  nockTenantById(TENANT_ID, tenantRow);

  return {
    token: authHeader({ userId: ADMIN_USER_ID, role: 'tenant_admin', tenantId: TENANT_ID }),
    tenant,
    tenantRow,
    adminUser,
  };
}

function setupStandardUserCaller() {
  const user = makeDbUser({ id: '50', role: 'standard_user', tenant_id: TENANT_ID });
  const userRow = makeDbUserRow(user);

  seedTableCaches(TENANT_ID);
  nockUserById('50', userRow);

  return {
    token: authHeader({ userId: '50', role: 'standard_user', tenantId: TENANT_ID }),
  };
}

beforeEach(() => {
  stubFetch();
});

afterEach(() => {
  restoreFetch();
});

// ---------------------------------------------------------------------------
// POST /api/users
// ---------------------------------------------------------------------------

describe('POST /api/users', () => {
  it('creates a tenant_admin and returns 201 without gestionnaire', async () => {
    const { token, tenantRow } = setupAdmin();
    const newUserId = '20';

    // createManagedUser: findTenantById
    nockTenantById(TENANT_ID, tenantRow);

    // userExists check
    nockListRows(TABLE_IDS.users, []);

    const newUser = makeDbUser({ id: newUserId, name: 'New Admin', email: 'newadmin@example.com', role: 'tenant_admin', tenant_id: TENANT_ID, status: 'pending' });
    const newUserRow = makeDbUserRow(newUser);

    // createUser
    nockCreateRow(TABLE_IDS.users, newUserRow);

    // issueSetPasswordToken: updateUser with reset token fields
    const updatedRow = makeDbUserRow({ ...newUser, reset_token_hash: 'somehash', reset_token_expires: '2026-07-17T00:00:00.000Z' });
    nockUpdateRow(TABLE_IDS.users, newUserId, updatedRow);

    // No gestionnaire created for tenant_admin

    const res = await supertest(app)
      .post('/api/users')
      .set('Authorization', token)
      .send({ name: 'New Admin', email: 'newadmin@example.com', role: 'tenant_admin' })
      .expect(201);

    expect(res.body).toMatchObject({
      user: {
        id: newUserId,
        name: 'New Admin',
        email: 'newadmin@example.com',
        role: 'tenant_admin',
      },
      gestionnaire: null,
    });
  });

  it('creates a standard_user and also creates a gestionnaire', async () => {
    const { token, tenantRow } = setupAdmin();
    const newUserId = '21';

    // createManagedUser: findTenantById (first call, not yet cached)
    nockTenantById(TENANT_ID, tenantRow);

    // userExists check
    nockListRows(TABLE_IDS.users, []);

    const newUser = makeDbUser({ id: newUserId, name: 'New Standard', email: 'standard@example.com', role: 'standard_user', tenant_id: TENANT_ID, status: 'pending' });
    const newUserRow = makeDbUserRow(newUser);

    // createUser
    nockCreateRow(TABLE_IDS.users, newUserRow);

    // issueSetPasswordToken: updateUser with reset token
    const updatedRow = makeDbUserRow({ ...newUser, reset_token_hash: 'somehash', reset_token_expires: '2026-07-17T00:00:00.000Z' });
    nockUpdateRow(TABLE_IDS.users, newUserId, updatedRow);

    // syncGestionnaireFromStandardUser → upsertGestionnaire → resolveTenantDbContext
    // tenant-context cache is cold, so findTenantById is called again
    nockTenantById(TENANT_ID, tenantRow);

    // upsertGestionnaire: listAllRows to find existing (none)
    nockListRows(TABLE_IDS.gestionnaires, []);

    const newGestionnaire = makeDbGestionnaire({ id: '30', name: 'New Standard', email: 'standard@example.com', user_id: newUserId, status: 'Actif' });
    const newGestionnaireRow = makeGestionnaireRow(newGestionnaire);

    // upsertGestionnaire: createRow
    nockCreateRow(TABLE_IDS.gestionnaires, newGestionnaireRow);

    const res = await supertest(app)
      .post('/api/users')
      .set('Authorization', token)
      .send({ name: 'New Standard', email: 'standard@example.com', role: 'standard_user' })
      .expect(201);

    expect(res.body).toMatchObject({
      user: {
        id: newUserId,
        name: 'New Standard',
        email: 'standard@example.com',
        role: 'standard_user',
      },
      gestionnaire: expect.objectContaining({
        id: '30',
        name: 'New Standard',
      }),
    });
  });

  it('returns 409 when email already exists', async () => {
    const { token, tenantRow } = setupAdmin();

    // createManagedUser: findTenantById
    nockTenantById(TENANT_ID, tenantRow);

    // userExists: returns a row → email taken
    const existingUser = makeDbUser({ id: '22', email: 'taken@example.com', tenant_id: TENANT_ID });
    nockListRows(TABLE_IDS.users, [makeDbUserRow(existingUser)]);

    const res = await supertest(app)
      .post('/api/users')
      .set('Authorization', token)
      .send({ name: 'Conflict User', email: 'taken@example.com', role: 'tenant_admin' })
      .expect(409);

    expect(res.body.error).toMatch(/already exists/i);
  });

  it('returns 400 when name is missing', async () => {
    const { token } = setupAdmin();

    const res = await supertest(app)
      .post('/api/users')
      .set('Authorization', token)
      .send({ email: 'someone@example.com', role: 'tenant_admin' })
      .expect(400);

    expect(res.body.error).toMatch(/name is required/i);
  });

  it('returns 403 for standard_user caller', async () => {
    const { token } = setupStandardUserCaller();

    const res = await supertest(app)
      .post('/api/users')
      .set('Authorization', token)
      .send({ name: 'New User', email: 'user@example.com', role: 'standard_user' })
      .expect(403);

    expect(res.body.error).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// PUT /api/users/:id
// ---------------------------------------------------------------------------

describe('PUT /api/users/:id', () => {
  it('updates a user name and returns 200 with user and gestionnaire', async () => {
    const { token, tenantRow } = setupAdmin();
    const targetUserId = '30';

    // putUser.ts: findUserById to validate target exists in tenant
    const targetUser = makeDbUser({ id: targetUserId, name: 'Old Name', email: 'target@example.com', role: 'tenant_admin', tenant_id: TENANT_ID });
    const targetUserRow = makeDbUserRow(targetUser);
    nockGetRow(TABLE_IDS.users, targetUserId, targetUserRow);

    // updateManagedUser internally: findUserById again
    nockGetRow(TABLE_IDS.users, targetUserId, targetUserRow);

    // updateUser: PATCH with new name
    const updatedUser = makeDbUser({ ...targetUser, name: 'New Name' });
    const updatedUserRow = makeDbUserRow(updatedUser);
    nockUpdateRow(TABLE_IDS.users, targetUserId, updatedUserRow);

    // role stays tenant_admin → getGestionnaireForUser → findGestionnaireByUserId
    // → listAllGestionnaires → resolveTenantDbContext (cold)
    nockTenantById(TENANT_ID, tenantRow);
    // listAllRows on gestionnaires (no gestionnaire linked)
    nockListRows(TABLE_IDS.gestionnaires, []);

    const res = await supertest(app)
      .put(`/api/users/${targetUserId}`)
      .set('Authorization', token)
      .send({ name: 'New Name' })
      .expect(200);

    expect(res.body).toMatchObject({
      user: {
        id: targetUserId,
        name: 'New Name',
      },
      gestionnaire: null,
    });
  });

  it('returns 403 for standard_user caller', async () => {
    const { token } = setupStandardUserCaller();

    const res = await supertest(app)
      .put('/api/users/30')
      .set('Authorization', token)
      .send({ name: 'Hacker' })
      .expect(403);

    expect(res.body.error).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// POST /api/users/:id/reset-password
// ---------------------------------------------------------------------------

describe('POST /api/users/:id/reset-password', () => {
  it('sends reset-password email and returns 200', async () => {
    const { token, tenantRow } = setupAdmin();
    const targetUserId = '40';

    const targetUser = makeDbUser({ id: targetUserId, name: 'Target User', email: 'target@example.com', role: 'standard_user', tenant_id: TENANT_ID, status: 'active' });
    const targetUserRow = makeDbUserRow(targetUser);

    // postResetPassword: Promise.all([findUserById, findTenantById])
    nockGetRow(TABLE_IDS.users, targetUserId, targetUserRow);
    // second nockTenantById — the first was consumed by requireTenant in setupAdmin
    nockTenantById(TENANT_ID, tenantRow);

    // issueSetPasswordToken: updateUser (store token hash)
    const updatedRow = makeDbUserRow({ ...targetUser, reset_token_hash: 'somehash', reset_token_expires: '2026-07-17T00:00:00.000Z' });
    nockUpdateRow(TABLE_IDS.users, targetUserId, updatedRow);

    // sendPasswordSetEmail goes through stubFetch

    const res = await supertest(app)
      .post(`/api/users/${targetUserId}/reset-password`)
      .set('Authorization', token)
      .expect(200);

    expect(res.body.message).toMatch(/password reset email sent/i);
  });

  it('returns 404 when target user belongs to a different tenant', async () => {
    const { token } = setupAdmin();
    const targetUserId = '41';

    // User belongs to a different tenant
    const otherTenantUser = makeDbUser({ id: targetUserId, email: 'other@example.com', role: 'standard_user', tenant_id: '99' });
    nockGetRow(TABLE_IDS.users, targetUserId, makeDbUserRow(otherTenantUser));
    // findTenantById is called in Promise.all alongside findUserById
    nockTenantById(TENANT_ID, makeTenantRow(makeTenantRecord({ id: TENANT_ID })));

    const res = await supertest(app)
      .post(`/api/users/${targetUserId}/reset-password`)
      .set('Authorization', token)
      .expect(404);

    expect(res.body.error).toMatch(/not found/i);
  });

  it('returns 403 for standard_user caller', async () => {
    const { token } = setupStandardUserCaller();

    const res = await supertest(app)
      .post('/api/users/40/reset-password')
      .set('Authorization', token)
      .expect(403);

    expect(res.body.error).toBeDefined();
  });
});
