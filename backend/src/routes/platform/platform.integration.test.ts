import { describe, it, expect, beforeEach } from 'vitest';
import supertest from 'supertest';
import { app } from '../../test/helpers/app.js';
import { authHeader } from '../../test/helpers/auth.js';
import {
  makeDbUser,
  makeDbUserRow,
  makeTenantRecord,
  makeTenantRow,
  makeDbClient,
} from '../../test/helpers/fixtures.js';
import {
  seedTableCaches,
  nockUserById,
  nockTenantById,
  nockListRows,
  TABLE_IDS,
} from '../../test/helpers/nock-baserow.js';
import { BASEROW_FIELDS } from '../../../baserow/schema.js';

const SUPER_ADMIN_ID = '1';
const TENANT_ID = '1';

const superAdmin = makeDbUser({
  id: SUPER_ADMIN_ID,
  role: 'super_admin',
  tenant_id: null,
  email: 'admin@acuria.com',
});
const superAdminRow = makeDbUserRow(superAdmin);

const standardUser = makeDbUser({
  id: '500',
  role: 'standard_user',
  tenant_id: TENANT_ID,
  email: 'user@example.com',
});
const standardUserRow = makeDbUserRow(standardUser);

const tenant = makeTenantRecord({
  id: TENANT_ID,
  name: 'Cabinet Test',
  slug: 'cabinet-test',
  database_token: 'test-tenant-token',
});
const tenantRowData = makeTenantRow(tenant);

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

describe('Platform Routes', () => {
  beforeEach(() => {
    seedTableCaches(TENANT_ID);
  });

  describe('GET /api/platform/stats', () => {
    it('returns tenant, user, and client counts for super_admin', async () => {
      const tenantUser = makeDbUser({
        id: '500',
        role: 'standard_user',
        tenant_id: TENANT_ID,
      });
      const client1 = makeDbClient({ id: '10', status: 'Actif' });
      const client2 = makeDbClient({ id: '11', status: 'Actif' });

      // authenticate
      nockUserById(SUPER_ADMIN_ID, superAdminRow);

      // getPlatformStats calls:
      // 1) tenantsRepo.listTenants() -> listAllRows on tenants table
      nockListRows(TABLE_IDS.tenants, [tenantRowData]);
      // 2) usersRepo.listUsers() -> listAllRows on users table
      nockListRows(TABLE_IDS.users, [makeDbUserRow(tenantUser), superAdminRow]);
      // 3) resolveTenantDbContext(tenant.id) -> findTenantById -> getRow
      nockTenantById(TENANT_ID, tenantRowData);
      // 4) clientsRepo.listClientsByTenantId(tenant.id) for each tenant
      nockListRows(TABLE_IDS.clients, [
        makeClientRow(client1),
        makeClientRow(client2),
      ]);

      const res = await supertest(app)
        .get('/api/platform/stats')
        .set('Authorization', authHeader({
          userId: SUPER_ADMIN_ID,
          role: 'super_admin',
        }));

      expect(res.status).toBe(200);
      expect(res.body.tenants).toBeDefined();
      expect(res.body.tenants.total).toBe(1);
      expect(res.body.tenants.active).toBe(1);
      expect(res.body.users).toBeDefined();
      // excludeSuperAdmins filters the super_admin out
      expect(res.body.users.total).toBe(1);
      expect(res.body.clients).toBeDefined();
      expect(res.body.clients.total).toBe(2);
    });

    it('returns 403 for standard_user', async () => {
      nockUserById('500', standardUserRow);

      const res = await supertest(app)
        .get('/api/platform/stats')
        .set('Authorization', authHeader({
          userId: '500',
          role: 'standard_user',
          tenantId: TENANT_ID,
        }));

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/platform/tenants', () => {
    it('lists all tenants with user and client counts for super_admin', async () => {
      const tenantUser = makeDbUser({
        id: '500',
        role: 'standard_user',
        tenant_id: TENANT_ID,
      });

      // authenticate
      nockUserById(SUPER_ADMIN_ID, superAdminRow);

      // listTenants -> enrichTenants:
      // 1) tenantsRepo.listTenants()
      nockListRows(TABLE_IDS.tenants, [tenantRowData]);
      // 2) For each tenant: usersRepo.listUsersByTenantId (filtered listAllRows on users)
      nockListRows(TABLE_IDS.users, [makeDbUserRow(tenantUser)]);
      // 3) resolveTenantDbContext(tenant.id) -> findTenantById -> getRow
      nockTenantById(TENANT_ID, tenantRowData);
      // 4) For each tenant: clientsRepo.countClientsByTenantId (listRowsPage with size=1)
      nockListRows(TABLE_IDS.clients, [makeClientRow(makeDbClient({ id: '10' }))]);

      const res = await supertest(app)
        .get('/api/platform/tenants')
        .set('Authorization', authHeader({
          userId: SUPER_ADMIN_ID,
          role: 'super_admin',
        }));

      expect(res.status).toBe(200);
      expect(res.body.tenants).toHaveLength(1);
      expect(res.body.tenants[0].name).toBe('Cabinet Test');
      expect(res.body.tenants[0].slug).toBe('cabinet-test');
      expect(res.body.tenants[0].userCount).toBe(1);
      expect(res.body.tenants[0].clientCount).toBe(1);
    });
  });
});
