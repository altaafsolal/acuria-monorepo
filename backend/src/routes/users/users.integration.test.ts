import { describe, it, expect } from 'vitest';
import supertest from 'supertest';
import { app } from '../../test/helpers/app.js';
import { authHeader } from '../../test/helpers/auth.js';
import {
  makeDbUser,
  makeDbUserRow,
  makeTenantRecord,
  makeTenantRow,
} from '../../test/helpers/fixtures.js';
import {
  seedTableCaches,
  nockUserById,
  nockTenantById,
  nockListRows,
  nockGetRow,
  nockDeleteRow,
  nockUpdateRow,
  TABLE_IDS,
} from '../../test/helpers/nock-baserow.js';

const TENANT_ID = '1';

function setupAuth(opts: { role?: 'tenant_admin' | 'standard_user'; userId?: string } = {}) {
  const role = opts.role ?? 'tenant_admin';
  const userId = opts.userId ?? '999';
  const user = makeDbUser({ id: userId, role, tenant_id: TENANT_ID });
  const userRow = makeDbUserRow(user);
  const tenant = makeTenantRecord({ id: TENANT_ID });
  const tenantRow = makeTenantRow(tenant);

  seedTableCaches(TENANT_ID);
  nockUserById(userId, userRow);
  nockTenantById(TENANT_ID, tenantRow);

  return {
    user,
    token: authHeader({ userId, role, tenantId: TENANT_ID }),
  };
}

describe('GET /api/users', () => {
  it('returns a list of tenant users (excluding super_admins)', async () => {
    const { token } = setupAuth({ role: 'tenant_admin' });

    const tenantUser = makeDbUser({ id: '10', name: 'Regular User', role: 'standard_user', tenant_id: TENANT_ID });
    const adminUser = makeDbUser({ id: '11', name: 'Admin User', role: 'tenant_admin', tenant_id: TENANT_ID });
    const superAdmin = makeDbUser({ id: '12', name: 'Super Admin', role: 'super_admin', tenant_id: null as unknown as string });

    // listUsersByTenantId calls listAllRows on users table with tenant filter
    nockListRows(TABLE_IDS.users, [
      makeDbUserRow(tenantUser),
      makeDbUserRow(adminUser),
      makeDbUserRow(superAdmin),
    ]);

    const res = await supertest(app)
      .get('/api/users')
      .set('Authorization', token)
      .expect(200);

    // excludeSuperAdmins filters out the super_admin
    expect(res.body.users).toHaveLength(2);
    expect(res.body.users.map((u: { id: string }) => u.id)).toEqual(
      expect.arrayContaining(['10', '11']),
    );
    // Should not contain super_admin
    expect(res.body.users.find((u: { role: string }) => u.role === 'super_admin')).toBeUndefined();
  });

  it('returns 403 for standard_user role', async () => {
    const { token } = setupAuth({ role: 'standard_user' });

    const res = await supertest(app)
      .get('/api/users')
      .set('Authorization', token)
      .expect(403);

    expect(res.body.error).toBeDefined();
  });

  it('returns 401 without auth', async () => {
    const res = await supertest(app)
      .get('/api/users')
      .expect(401);

    expect(res.body.error).toBeDefined();
  });
});

describe('DELETE /api/users/:id', () => {
  it('deletes a tenant user and returns 204', async () => {
    const { token } = setupAuth({ role: 'tenant_admin', userId: '999' });

    const targetUser = makeDbUser({ id: '10', role: 'standard_user', tenant_id: TENANT_ID });

    // deleteUser handler calls findUserById(targetId) to validate the user
    nockGetRow(TABLE_IDS.users, '10', makeDbUserRow(targetUser));

    // Then calls usersRepo.deleteUser(userId) which calls deleteRow
    nockDeleteRow(TABLE_IDS.users, '10');

    const res = await supertest(app)
      .delete('/api/users/10')
      .set('Authorization', token)
      .expect(204);

    expect(res.body).toEqual({});
  });

  it('returns 400 when trying to delete own account', async () => {
    const { token } = setupAuth({ role: 'tenant_admin', userId: '999' });

    const res = await supertest(app)
      .delete('/api/users/999')
      .set('Authorization', token)
      .expect(400);

    expect(res.body.error).toMatch(/cannot delete your own account/i);
  });

  it('returns 404 if user does not belong to tenant', async () => {
    const { token } = setupAuth({ role: 'tenant_admin', userId: '999' });

    // User belongs to a different tenant
    const otherTenantUser = makeDbUser({ id: '50', role: 'standard_user', tenant_id: '99' });
    nockGetRow(TABLE_IDS.users, '50', makeDbUserRow(otherTenantUser));

    const res = await supertest(app)
      .delete('/api/users/50')
      .set('Authorization', token)
      .expect(404);

    expect(res.body.error).toMatch(/not found/i);
  });

  it('returns 404 if target user is super_admin', async () => {
    const { token } = setupAuth({ role: 'tenant_admin', userId: '999' });

    const superUser = makeDbUser({ id: '50', role: 'super_admin', tenant_id: TENANT_ID });
    nockGetRow(TABLE_IDS.users, '50', makeDbUserRow(superUser));

    const res = await supertest(app)
      .delete('/api/users/50')
      .set('Authorization', token)
      .expect(404);

    expect(res.body.error).toMatch(/not found/i);
  });

  it('returns 403 for standard_user role', async () => {
    const { token } = setupAuth({ role: 'standard_user' });

    const res = await supertest(app)
      .delete('/api/users/10')
      .set('Authorization', token)
      .expect(403);

    expect(res.body.error).toBeDefined();
  });
});

describe('PUT /api/users/:id', () => {
  it('returns 400 when tenant_admin tries to change own role', async () => {
    const { token } = setupAuth({ role: 'tenant_admin', userId: '999' });

    // The handler first calls findUserById to check existing user
    const self = makeDbUser({ id: '999', role: 'tenant_admin', tenant_id: TENANT_ID });
    nockGetRow(TABLE_IDS.users, '999', makeDbUserRow(self));

    const res = await supertest(app)
      .put('/api/users/999')
      .set('Authorization', token)
      .send({ role: 'standard_user' })
      .expect(400);

    expect(res.body.error).toMatch(/cannot change your own role/i);
  });

  it('returns 400 for invalid role value', async () => {
    const { token } = setupAuth({ role: 'tenant_admin', userId: '999' });

    const res = await supertest(app)
      .put('/api/users/10')
      .set('Authorization', token)
      .send({ role: 'super_admin' })
      .expect(400);

    expect(res.body.error).toMatch(/role must be/i);
  });
});
