import { describe, it, expect, beforeEach } from 'vitest';
import supertest from 'supertest';
import { app } from '../../test/helpers/app.js';
import { authHeader } from '../../test/helpers/auth.js';
import { makeDbUser, makeDbUserRow, makeTenantRecord, makeTenantRow, makeDbClient, makeDbGestionnaire } from '../../test/helpers/fixtures.js';
import {
  seedTableCaches,
  nockUserById,
  nockTenantById,
  nockListRows,
  nockGetRow,
  nockUpdateRow,
  TABLE_IDS,
} from '../../test/helpers/nock-baserow.js';
import { stubFetch, restoreFetch } from '../../test/helpers/nock-make.js';
import { BASEROW_FIELDS } from '../../../baserow/schema.js';

const TENANT_ID = '1';
const USER_ID = '999';

const user = makeDbUser({ id: USER_ID, tenant_id: TENANT_ID, role: 'standard_user' });
const userRow = makeDbUserRow(user);
const tenant = makeTenantRecord({
  id: TENANT_ID,
  email: 'cabinet@example.com',
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
    [F.signataire]: client.signataire ?? '',
    [F.gestionnaire]: client.gestionnaire ?? '',
    [F.origine]: client.origine ?? '',
    [F.dateEntree]: client.date_entree ?? '',
    [F.phone]: client.phone ?? '',
    [F.phoneMobile]: client.phone_mobile ?? '',
    [F.phoneHome]: client.phone_home ?? '',
    [F.phoneOffice]: client.phone_office ?? '',
    [F.address]: client.address ?? '',
    [F.postalCode]: client.postal_code ?? '',
    [F.city]: client.city ?? '',
    [F.country]: client.country ?? '',
    [F.civilite]: client.civilite ?? '',
    [F.firstName]: client.first_name ?? '',
    [F.lastName]: client.last_name ?? '',
    [F.birthDate]: client.birth_date ?? '',
    [F.birthPlace]: client.birth_place ?? '',
    [F.nationality]: client.nationality ?? '',
    [F.maritalStatus]: client.marital_status ?? '',
    [F.matrimonialRegime]: client.matrimonial_regime ?? '',
    [F.profession]: client.profession ?? '',
    [F.proStatus]: client.pro_status ?? '',
    [F.sector]: client.sector ?? '',
    [F.employer]: client.employer ?? '',
    [F.annualIncome]: client.annual_income ?? '',
    [F.currentCharges]: client.current_charges ?? '',
    [F.tradeName]: client.trade_name ?? '',
    [F.legalForm]: client.legal_form ?? '',
    [F.siren]: client.siren ?? '',
    [F.nafCode]: client.naf_code ?? '',
    [F.activity]: client.activity ?? '',
    [F.legalRepName]: client.legal_rep_name ?? '',
    [F.legalRepRole]: client.legal_rep_role ?? '',
    [F.revenue]: client.revenue ?? '',
    [F.totalBalance]: client.total_balance ?? '',
    [F.equity]: client.equity ?? '',
    [F.taxation]: client.taxation ?? '',
    [F.fiscalCountry]: client.fiscal_country ?? '',
    [F.capital]: client.capital ?? '',
    [F.patrimoineImmobilier]: client.patrimoine_immobilier ?? '',
    [F.patrimoineEpargne]: client.patrimoine_epargne ?? '',
    [F.patrimoineParticipations]: client.patrimoine_participations ?? '',
    [F.patrimoineLiquidites]: client.patrimoine_liquidites ?? '',
    [F.patrimoineAutres]: client.patrimoine_autres ?? '',
    [F.fccStatut]: client.fcc_statut ? { id: 1, value: client.fcc_statut, color: 'blue' } : null,
    [F.fccDate]: client.fcc_date ?? '',
    [F.derStatut]: client.der_statut ? { id: 1, value: client.der_statut, color: 'blue' } : null,
    [F.derDate]: client.der_date ?? '',
    [F.derEnvoiTimestamp]: client.der_envoi_timestamp ?? '',
    [F.ldmStatut]: client.ldm_statut ? { id: 1, value: client.ldm_statut, color: 'blue' } : null,
    [F.ldmDate]: client.ldm_date ?? '',
    [F.notesInternes]: client.notes_internes ?? '',
    [F.airtableRecordId]: client.airtable_record_id ?? '',
  };
}

function makeGestionnaireRow(g: ReturnType<typeof makeDbGestionnaire>): Record<string, unknown> {
  const F = BASEROW_FIELDS.gestionnaires;
  return {
    id: Number(g.id),
    [F.name]: g.name,
    [F.firstName]: g.first_name ?? '',
    [F.lastName]: g.last_name ?? '',
    [F.email]: g.email ?? '',
    [F.phone]: g.phone ?? '',
    [F.role]: g.role ?? '',
    [F.peutSignerDocusign]: g.peut_signer_docusign,
    [F.status]: g.status ? { id: 1, value: g.status, color: 'green' } : null,
    [F.initiales]: g.initiales ?? '',
    [F.userId]: g.user_id ?? '',
    [F.airtableRecordId]: g.airtable_record_id ?? '',
  };
}

describe('KYC Workflow Routes', () => {
  beforeEach(() => {
    seedTableCaches(TENANT_ID);
  });

  describe('GET /api/kyc/der', () => {
    it('lists clients with DER info', async () => {
      const client1 = makeDbClient({ id: '10', der_statut: 'Envoyé', der_date: '2026-07-01' });
      const client2 = makeDbClient({ id: '11', der_statut: 'À envoyer' });

      nockUserById(USER_ID, userRow);
      nockTenantById(TENANT_ID, tenantRow);
      nockListRows(TABLE_IDS.clients, [makeClientRow(client1), makeClientRow(client2)]);

      const res = await supertest(app)
        .get('/api/kyc/der')
        .set('Authorization', authHeader({ userId: USER_ID, tenantId: TENANT_ID }));

      expect(res.status).toBe(200);
      expect(res.body.clients).toHaveLength(2);
      expect(res.body.clients[0].id).toBe('10');
      expect(res.body.clients[0].derStatut).toBe('Envoyé');
      expect(res.body.clients[1].id).toBe('11');
      expect(res.body.clients[1].derStatut).toBe('À envoyer');
    });

    it('returns 401 without auth', async () => {
      const res = await supertest(app).get('/api/kyc/der');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/kyc/der/send', () => {
    it('sends DER email and updates client status', async () => {
      const client = makeDbClient({
        id: '10',
        email: 'client@example.com',
        first_name: 'Jean',
        last_name: 'Dupont',
        client_type: 'PP',
      });
      const clientRow = makeClientRow(client);
      const updatedClientRow = {
        ...clientRow,
        [BASEROW_FIELDS.clients.derStatut]: { id: 2, value: 'Envoyé', color: 'orange' },
      };

      const fetchCalls = stubFetch();

      nockUserById(USER_ID, userRow);
      // resolveTenantDbContext + findTenantById in handler
      nockTenantById(TENANT_ID, tenantRow, );
      nockTenantById(TENANT_ID, tenantRow);
      // getClientById
      nockGetRow(TABLE_IDS.clients, '10', clientRow);
      // patchClientKycFields -> getClientById + updateRow
      nockGetRow(TABLE_IDS.clients, '10', clientRow);
      nockUpdateRow(TABLE_IDS.clients, '10', updatedClientRow);

      const res = await supertest(app)
        .post('/api/kyc/der/send')
        .set('Authorization', authHeader({ userId: USER_ID, tenantId: TENANT_ID }))
        .send({
          clientId: '10',
          signataireName: 'Baptiste Money',
          signataireEmail: 'baptistemoney@nm-prime.com',
        });

      expect(res.status).toBe(200);
      expect(res.body.client).toBeDefined();
      expect(res.body.client.derStatut).toBe('Envoyé');
      // Verify Make webhook was called
      expect(fetchCalls.length).toBeGreaterThanOrEqual(1);

      restoreFetch();
    });

    it('returns 400 when clientId is missing', async () => {
      nockUserById(USER_ID, userRow);
      nockTenantById(TENANT_ID, tenantRow);

      const res = await supertest(app)
        .post('/api/kyc/der/send')
        .set('Authorization', authHeader({ userId: USER_ID, tenantId: TENANT_ID }))
        .send({
          signataireName: 'Baptiste Money',
          signataireEmail: 'baptistemoney@nm-prime.com',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('clientId');
    });
  });

  describe('GET /api/kyc/signataires', () => {
    it('returns gestionnaires who can sign DocuSign', async () => {
      const signer = makeDbGestionnaire({
        id: '50',
        name: 'Jean Dupont',
        email: 'jean@example.com',
        role: 'Gestionnaire',
        peut_signer_docusign: true,
        status: 'Actif',
      });
      const nonSigner = makeDbGestionnaire({
        id: '51',
        name: 'Marie Martin',
        email: 'marie@example.com',
        peut_signer_docusign: false,
        status: 'Actif',
      });

      nockUserById(USER_ID, userRow);
      nockTenantById(TENANT_ID, tenantRow);
      nockListRows(TABLE_IDS.gestionnaires, [
        makeGestionnaireRow(signer),
        makeGestionnaireRow(nonSigner),
      ]);

      const res = await supertest(app)
        .get('/api/kyc/signataires')
        .set('Authorization', authHeader({ userId: USER_ID, tenantId: TENANT_ID }));

      expect(res.status).toBe(200);
      expect(res.body.signataires).toHaveLength(1);
      expect(res.body.signataires[0]).toEqual({
        name: 'Jean Dupont',
        email: 'jean@example.com',
        titre: 'Gestionnaire',
      });
    });
  });

  describe('POST /api/kyc/ldm/send — AMF 48h lock', () => {
    it('rejects LdM when DER was sent less than 48h ago', async () => {
      const recentTimestamp = new Date().toISOString();
      const today = new Date().toISOString().split('T')[0];
      const client = makeDbClient({
        id: '10',
        email: 'client@example.com',
        der_statut: 'Envoyé',
        der_date: today,
        der_envoi_timestamp: recentTimestamp,
        client_type: 'PP',
        first_name: 'Jean',
        last_name: 'Dupont',
      });
      const clientRow = makeClientRow(client);

      nockUserById(USER_ID, userRow);
      // resolveTenantDbContext + findTenantById in handler
      nockTenantById(TENANT_ID, tenantRow);
      nockTenantById(TENANT_ID, tenantRow);
      // getClientById
      nockGetRow(TABLE_IDS.clients, '10', clientRow);

      const res = await supertest(app)
        .post('/api/kyc/ldm/send')
        .set('Authorization', authHeader({ userId: USER_ID, tenantId: TENANT_ID }))
        .send({
          clientId: '10',
          signataireName: 'Baptiste Money',
          signataireEmail: 'baptistemoney@nm-prime.com',
          ldmType: 'PP_SANS',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('48h');
    });
  });
});
