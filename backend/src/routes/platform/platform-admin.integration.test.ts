import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import supertest from 'supertest';
import nock from 'nock';
import { app } from '../../test/helpers/app.js';
import { authHeader } from '../../test/helpers/auth.js';
import {
  makeDbUser,
  makeDbUserRow,
  makeDbClient,
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
  nockDeleteRow,
  nockListRows,
  TABLE_IDS,
} from '../../test/helpers/nock-baserow.js';
import { stubFetch, restoreFetch } from '../../test/helpers/nock-make.js';
import { BASEROW_FIELDS } from '../../../baserow/schema.js';

const SUPER_ADMIN_ID = '1';
const TENANT_ADMIN_ID = '11';
const TENANT_ID = '1';

const superAdmin = makeDbUser({ id: SUPER_ADMIN_ID, role: 'super_admin', tenant_id: null });
const superAdminRow = makeDbUserRow(superAdmin);

const tenantAdmin = makeDbUser({ id: TENANT_ADMIN_ID, role: 'tenant_admin', tenant_id: TENANT_ID });
const tenantAdminRow = makeDbUserRow(tenantAdmin);

const tenant = makeTenantRecord({
  id: TENANT_ID,
  name: 'Cabinet Test',
  slug: 'cabinet-test',
  database_token: 'test-tenant-token',
});
const tenantRow = makeTenantRow(tenant);

function makeClientRow(client: ReturnType<typeof makeDbClient>): Record<string, unknown> {
  const F = BASEROW_FIELDS.clients;
  return {
    id: Number(client.id),
    [F.name]: client.name,
    [F.email]: client.email,
    [F.clientType]: client.client_type ? { id: 1, value: client.client_type, color: 'blue' } : null,
    [F.kycStatus]: client.kyc_status ? { id: 1, value: client.kyc_status, color: 'blue' } : null,
    [F.status]: client.status ? { id: 1, value: client.status, color: 'green' } : null,
    [F.statutClient]: client.statut_client ? { id: 1, value: client.statut_client, color: 'green' } : null,
    [F.signataire]: '', [F.gestionnaire]: '', [F.origine]: '', [F.dateEntree]: '',
    [F.phone]: '', [F.phoneMobile]: '', [F.phoneHome]: '', [F.phoneOffice]: '',
    [F.address]: '', [F.postalCode]: '', [F.city]: '', [F.country]: '',
    [F.civilite]: '', [F.firstName]: '', [F.lastName]: '',
    [F.birthDate]: '', [F.birthPlace]: '', [F.nationality]: '',
    [F.maritalStatus]: '', [F.matrimonialRegime]: '',
    [F.profession]: '', [F.proStatus]: '', [F.sector]: '', [F.employer]: '',
    [F.annualIncome]: '', [F.currentCharges]: '',
    [F.tradeName]: '', [F.legalForm]: '', [F.siren]: '', [F.nafCode]: '',
    [F.activity]: '', [F.legalRepName]: '', [F.legalRepRole]: '',
    [F.revenue]: '', [F.totalBalance]: '', [F.equity]: '', [F.taxation]: '',
    [F.fiscalCountry]: '', [F.capital]: '',
    [F.patrimoineImmobilier]: '', [F.patrimoineEpargne]: '',
    [F.patrimoineParticipations]: '', [F.patrimoineLiquidites]: '',
    [F.patrimoineAutres]: '',
    [F.fccStatut]: null, [F.fccDate]: '',
    [F.derStatut]: null, [F.derDate]: '', [F.derEnvoiTimestamp]: '',
    [F.ldmStatut]: null, [F.ldmDate]: '', [F.notesInternes]: '', [F.airtableRecordId]: '',
  };
}

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
    [F.userId]: g.user_id ? [{ id: Number(g.user_id), value: '' }] : [],
    [F.airtableRecordId]: g.airtable_record_id ?? '',
  };
}

describe('Platform Admin Routes', () => {
  beforeEach(() => {
    seedTableCaches(TENANT_ID);
  });

  // ---------------------------------------------------------------------------
  // GET /api/platform/tenants/:tenantId
  // ---------------------------------------------------------------------------
  describe('GET /api/platform/tenants/:tenantId', () => {
    it('returns an enriched tenant with userCount and clientCount for super_admin', async () => {
      const tenantUser = makeDbUser({ id: '500', role: 'standard_user', tenant_id: TENANT_ID });
      const client1 = makeDbClient({ id: '10', status: 'Actif' });

      // authenticate
      nockUserById(SUPER_ADMIN_ID, superAdminRow);
      // getTenant -> findTenantById
      nockTenantById(TENANT_ID, tenantRow);
      // enrichTenants -> listUsersByTenantId (listAllRows on users with filter)
      nockListRows(TABLE_IDS.users, [makeDbUserRow(tenantUser)]);
      // enrichTenants -> countClientsByTenantId -> resolveTenantDbContext -> findTenantById
      nockTenantById(TENANT_ID, tenantRow);
      // enrichTenants -> countClientsByTenantId -> listRowsPage (size=1)
      nockListRows(TABLE_IDS.clients, [makeClientRow(client1)]);

      const res = await supertest(app)
        .get(`/api/platform/tenants/${TENANT_ID}`)
        .set('Authorization', authHeader({ userId: SUPER_ADMIN_ID, role: 'super_admin' }));

      expect(res.status).toBe(200);
      expect(res.body.tenant).toBeDefined();
      expect(res.body.tenant.id).toBe(TENANT_ID);
      expect(res.body.tenant.name).toBe('Cabinet Test');
      expect(res.body.tenant.slug).toBe('cabinet-test');
      expect(res.body.tenant.userCount).toBe(1);
      expect(res.body.tenant.clientCount).toBe(1);
    });

    it('returns 404 when tenant is not found', async () => {
      nockUserById(SUPER_ADMIN_ID, superAdminRow);
      // findTenantById catches the 404 and returns null
      nock('https://api.baserow.io')
        .get(`/api/database/rows/table/${TABLE_IDS.tenants}/999/`)
        .query(true)
        .reply(404, { error: 'ERROR_ROW_DOES_NOT_EXIST', detail: 'not found' });

      const res = await supertest(app)
        .get('/api/platform/tenants/999')
        .set('Authorization', authHeader({ userId: SUPER_ADMIN_ID, role: 'super_admin' }));

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/tenant not found/i);
    });

    it('returns 403 for tenant_admin', async () => {
      nockUserById(TENANT_ADMIN_ID, tenantAdminRow);

      const res = await supertest(app)
        .get(`/api/platform/tenants/${TENANT_ID}`)
        .set('Authorization', authHeader({ userId: TENANT_ADMIN_ID, role: 'tenant_admin', tenantId: TENANT_ID }));

      expect(res.status).toBe(403);
    });
  });

  // ---------------------------------------------------------------------------
  // PUT /api/platform/tenants/:tenantId
  // ---------------------------------------------------------------------------
  describe('PUT /api/platform/tenants/:tenantId', () => {
    it('updates tenant text fields and returns enriched tenant', async () => {
      const updatedTenant = makeTenantRecord({
        id: TENANT_ID,
        name: 'New Name',
        slug: 'cabinet-test',
        database_token: 'test-tenant-token',
        email: 'contact@newname.com',
      });
      const updatedTenantRow = makeTenantRow(updatedTenant);
      const tenantUser = makeDbUser({ id: '500', role: 'standard_user', tenant_id: TENANT_ID });

      // authenticate
      nockUserById(SUPER_ADMIN_ID, superAdminRow);
      // patchTenantBranding -> findTenantById (inside patchTenantBranding)
      nockTenantById(TENANT_ID, tenantRow);
      // patchTenantBranding -> updateRow
      nockUpdateRow(TABLE_IDS.tenants, TENANT_ID, updatedTenantRow);
      // enrichTenants (includeLogoDataUrl=true) -> listUsersByTenantId
      nockListRows(TABLE_IDS.users, [makeDbUserRow(tenantUser)]);
      // enrichTenants -> countClientsByTenantId -> resolveTenantDbContext -> findTenantById
      nockTenantById(TENANT_ID, updatedTenantRow);
      // enrichTenants -> countClientsByTenantId -> listRowsPage
      nockListRows(TABLE_IDS.clients, []);

      const res = await supertest(app)
        .put(`/api/platform/tenants/${TENANT_ID}`)
        .set('Authorization', authHeader({ userId: SUPER_ADMIN_ID, role: 'super_admin' }))
        .field('brandingName', 'New Name')
        .field('email', 'contact@newname.com');

      expect(res.status).toBe(200);
      expect(res.body.tenant).toBeDefined();
      expect(res.body.tenant.id).toBe(TENANT_ID);
    });

    it('returns 400 for invalid brandingAccent (not a hex color)', async () => {
      nockUserById(SUPER_ADMIN_ID, superAdminRow);

      const res = await supertest(app)
        .put(`/api/platform/tenants/${TENANT_ID}`)
        .set('Authorization', authHeader({ userId: SUPER_ADMIN_ID, role: 'super_admin' }))
        .field('brandingAccent', 'not-a-hex');

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/brandingAccent must be a valid hex color/i);
    });

    it('returns 400 for invalid status value', async () => {
      nockUserById(SUPER_ADMIN_ID, superAdminRow);

      const res = await supertest(app)
        .put(`/api/platform/tenants/${TENANT_ID}`)
        .set('Authorization', authHeader({ userId: SUPER_ADMIN_ID, role: 'super_admin' }))
        .field('status', 'deleted');

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/status must be active or inactive/i);
    });

    it('returns 403 for tenant_admin', async () => {
      nockUserById(TENANT_ADMIN_ID, tenantAdminRow);

      const res = await supertest(app)
        .put(`/api/platform/tenants/${TENANT_ID}`)
        .set('Authorization', authHeader({ userId: TENANT_ADMIN_ID, role: 'tenant_admin', tenantId: TENANT_ID }))
        .field('brandingName', 'Attempted Change');

      expect(res.status).toBe(403);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/platform/tenants/:tenantId/users
  // ---------------------------------------------------------------------------
  describe('GET /api/platform/tenants/:tenantId/users', () => {
    it('returns users for a specific tenant', async () => {
      const tenantUser1 = makeDbUser({ id: '500', role: 'standard_user', tenant_id: TENANT_ID });
      const tenantUser2 = makeDbUser({ id: '501', role: 'tenant_admin', tenant_id: TENANT_ID });

      // authenticate
      nockUserById(SUPER_ADMIN_ID, superAdminRow);
      // getTenant -> findTenantById
      nockTenantById(TENANT_ID, tenantRow);
      // enrichTenants (called by getTenant) -> listUsersByTenantId
      nockListRows(TABLE_IDS.users, [makeDbUserRow(tenantUser1), makeDbUserRow(tenantUser2)]);
      // enrichTenants -> countClientsByTenantId -> resolveTenantDbContext -> findTenantById
      nockTenantById(TENANT_ID, tenantRow);
      // enrichTenants -> countClientsByTenantId -> listRowsPage
      nockListRows(TABLE_IDS.clients, []);
      // listTenantUsers -> listUsersByTenantId (second call)
      nockListRows(TABLE_IDS.users, [makeDbUserRow(tenantUser1), makeDbUserRow(tenantUser2)]);

      const res = await supertest(app)
        .get(`/api/platform/tenants/${TENANT_ID}/users`)
        .set('Authorization', authHeader({ userId: SUPER_ADMIN_ID, role: 'super_admin' }));

      expect(res.status).toBe(200);
      expect(res.body.users).toBeDefined();
      expect(res.body.users).toHaveLength(2);
      expect(res.body.users.map((u: { id: string }) => u.id)).toEqual(
        expect.arrayContaining(['500', '501']),
      );
    });

    it('returns 403 for tenant_admin', async () => {
      nockUserById(TENANT_ADMIN_ID, tenantAdminRow);

      const res = await supertest(app)
        .get(`/api/platform/tenants/${TENANT_ID}/users`)
        .set('Authorization', authHeader({ userId: TENANT_ADMIN_ID, role: 'tenant_admin', tenantId: TENANT_ID }));

      expect(res.status).toBe(403);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/platform/tenants/:tenantId/clients
  // ---------------------------------------------------------------------------
  describe('GET /api/platform/tenants/:tenantId/clients', () => {
    it('returns clients for a specific tenant', async () => {
      const client1 = makeDbClient({ id: '10', status: 'Actif' });
      const client2 = makeDbClient({ id: '11', status: 'Actif' });
      const tenantUser = makeDbUser({ id: '500', role: 'standard_user', tenant_id: TENANT_ID });

      // authenticate
      nockUserById(SUPER_ADMIN_ID, superAdminRow);
      // getTenant -> findTenantById
      nockTenantById(TENANT_ID, tenantRow);
      // enrichTenants (called by getTenant) -> listUsersByTenantId
      nockListRows(TABLE_IDS.users, [makeDbUserRow(tenantUser)]);
      // enrichTenants -> countClientsByTenantId -> resolveTenantDbContext -> findTenantById
      nockTenantById(TENANT_ID, tenantRow);
      // enrichTenants -> countClientsByTenantId -> listRowsPage
      nockListRows(TABLE_IDS.clients, [makeClientRow(client1), makeClientRow(client2)]);
      // listTenantClients -> findTenantById
      nockTenantById(TENANT_ID, tenantRow);
      // listTenantClients -> listClientsByTenantId -> resolveTenantDbContext -> findTenantById
      nockTenantById(TENANT_ID, tenantRow);
      // listTenantClients -> listClientsByTenantId -> listAllRows
      nockListRows(TABLE_IDS.clients, [makeClientRow(client1), makeClientRow(client2)]);

      const res = await supertest(app)
        .get(`/api/platform/tenants/${TENANT_ID}/clients`)
        .set('Authorization', authHeader({ userId: SUPER_ADMIN_ID, role: 'super_admin' }));

      expect(res.status).toBe(200);
      expect(res.body.clients).toBeDefined();
      expect(res.body.clients).toHaveLength(2);
    });

    it('returns 403 for tenant_admin', async () => {
      nockUserById(TENANT_ADMIN_ID, tenantAdminRow);

      const res = await supertest(app)
        .get(`/api/platform/tenants/${TENANT_ID}/clients`)
        .set('Authorization', authHeader({ userId: TENANT_ADMIN_ID, role: 'tenant_admin', tenantId: TENANT_ID }));

      expect(res.status).toBe(403);
    });
  });

  // ---------------------------------------------------------------------------
  // POST /api/platform/tenants/:tenantId/users
  // ---------------------------------------------------------------------------
  describe('POST /api/platform/tenants/:tenantId/users', () => {
    afterEach(() => {
      restoreFetch();
    });

    it('creates a tenant_admin user and returns 201', async () => {
      const fetchCalls = stubFetch();
      const newUser = makeDbUser({
        id: '600',
        role: 'tenant_admin',
        tenant_id: TENANT_ID,
        email: 'newadmin@example.com',
        name: 'New Admin',
        status: 'pending',
      });
      const newUserRow = makeDbUserRow(newUser);
      // After issueSetPasswordToken: updateRow stores reset_token_hash
      const newUserRowWithToken = {
        ...newUserRow,
        [BASEROW_FIELDS.users.resetTokenHash]: 'some-hash',
        [BASEROW_FIELDS.users.resetTokenExpires]: '2026-07-17T00:00:00.000Z',
      };

      // authenticate
      nockUserById(SUPER_ADMIN_ID, superAdminRow);
      // createManagedUser -> findTenantById
      nockTenantById(TENANT_ID, tenantRow);
      // createManagedUser -> userExists -> findUserByEmail -> listAllRows (no match)
      nockListRows(TABLE_IDS.users, []);
      // createManagedUser -> createUser -> createRow
      nockCreateRow(TABLE_IDS.users, newUserRow);
      // issueSetPasswordToken -> updateUser -> updateRow (stores reset token)
      nockUpdateRow(TABLE_IDS.users, '600', newUserRowWithToken);
      // role is tenant_admin: no gestionnaire sync needed

      const res = await supertest(app)
        .post(`/api/platform/tenants/${TENANT_ID}/users`)
        .set('Authorization', authHeader({ userId: SUPER_ADMIN_ID, role: 'super_admin' }))
        .send({ name: 'New Admin', email: 'newadmin@example.com', role: 'tenant_admin' });

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('newadmin@example.com');
      expect(res.body.user.role).toBe('tenant_admin');
      // Make webhook for password set email was called
      expect(fetchCalls.length).toBeGreaterThan(0);
    });

    it('returns 409 when email already exists', async () => {
      stubFetch();
      const existingUser = makeDbUser({ id: '50', email: 'existing@example.com', tenant_id: TENANT_ID });

      // authenticate
      nockUserById(SUPER_ADMIN_ID, superAdminRow);
      // createManagedUser -> findTenantById
      nockTenantById(TENANT_ID, tenantRow);
      // createManagedUser -> userExists -> findUserByEmail -> listAllRows (returns match)
      nockListRows(TABLE_IDS.users, [makeDbUserRow(existingUser)]);

      const res = await supertest(app)
        .post(`/api/platform/tenants/${TENANT_ID}/users`)
        .set('Authorization', authHeader({ userId: SUPER_ADMIN_ID, role: 'super_admin' }))
        .send({ name: 'Duplicate User', email: 'existing@example.com', role: 'tenant_admin' });

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/already exists/i);
    });

    it('returns 403 for tenant_admin', async () => {
      nockUserById(TENANT_ADMIN_ID, tenantAdminRow);

      const res = await supertest(app)
        .post(`/api/platform/tenants/${TENANT_ID}/users`)
        .set('Authorization', authHeader({ userId: TENANT_ADMIN_ID, role: 'tenant_admin', tenantId: TENANT_ID }))
        .send({ name: 'Blocked User', email: 'blocked@example.com', role: 'standard_user' });

      expect(res.status).toBe(403);
    });
  });

  // ---------------------------------------------------------------------------
  // DELETE /api/platform/tenants/:tenantId/users/:userId
  // ---------------------------------------------------------------------------
  describe('DELETE /api/platform/tenants/:tenantId/users/:userId', () => {
    it('deletes a tenant user and returns 204', async () => {
      const targetUser = makeDbUser({ id: '500', role: 'standard_user', tenant_id: TENANT_ID });

      // authenticate
      nockUserById(SUPER_ADMIN_ID, superAdminRow);
      // deleteUser handler -> findTenantById
      nockTenantById(TENANT_ID, tenantRow);
      // deleteUser handler -> findUserById
      nockGetRow(TABLE_IDS.users, '500', makeDbUserRow(targetUser));
      // deleteUser handler -> deleteUser -> deleteRow
      nockDeleteRow(TABLE_IDS.users, '500');

      const res = await supertest(app)
        .delete(`/api/platform/tenants/${TENANT_ID}/users/500`)
        .set('Authorization', authHeader({ userId: SUPER_ADMIN_ID, role: 'super_admin' }));

      expect(res.status).toBe(204);
    });

    it('returns 403 for tenant_admin', async () => {
      nockUserById(TENANT_ADMIN_ID, tenantAdminRow);

      const res = await supertest(app)
        .delete(`/api/platform/tenants/${TENANT_ID}/users/500`)
        .set('Authorization', authHeader({ userId: TENANT_ADMIN_ID, role: 'tenant_admin', tenantId: TENANT_ID }));

      expect(res.status).toBe(403);
    });
  });
});
