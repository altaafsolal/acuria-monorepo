import { describe, it, expect, beforeEach } from 'vitest';
import supertest from 'supertest';
import nock from 'nock';
import { app } from '../test/helpers/app.js';
import { authHeader } from '../test/helpers/auth.js';
import {
  makeDbUser,
  makeDbUserRow,
  makeTenantRecord,
  makeTenantRow,
  makeDbClient,
  makeDbFccClient,
} from '../test/helpers/fixtures.js';
import {
  seedTableCaches,
  seedTableCachesForTenant,
  nockUserById,
  nockTenantById,
  nockListRows,
  nockGetRow,
  TABLE_IDS,
  TABLE_IDS_B,
} from '../test/helpers/nock-baserow.js';
import { BASEROW_FIELDS } from '../../baserow/schema.js';

/* ── Tenants ─────────────────────────────────────────────────────────── */

const TENANT_A_ID = '1';
const TENANT_B_ID = '2';

const tenantA = makeTenantRecord({
  id: TENANT_A_ID,
  name: 'NM Prime',
  slug: 'nm-prime',
  database_token: 'token-tenant-a',
  branding_name: 'NM Prime',
  branding_orias: '12345678',
  branding_accent: '#3B82F6',
});
const tenantARow = makeTenantRow(tenantA);

const tenantB = makeTenantRecord({
  id: TENANT_B_ID,
  name: 'Cabinet Dupont',
  slug: 'cabinet-dupont',
  database_token: 'token-tenant-b',
  branding_name: 'Cabinet Dupont',
  branding_orias: '87654321',
  branding_accent: '#10B981',
});
const tenantBRow = makeTenantRow(tenantB);

/* ── Users ───────────────────────────────────────────────────────────── */

const userA = makeDbUser({ id: '10', tenant_id: TENANT_A_ID, name: 'User A' });
const userARow = makeDbUserRow(userA);

const userB = makeDbUser({ id: '20', tenant_id: TENANT_B_ID, name: 'User B' });
const userBRow = makeDbUserRow(userB);

const superAdmin = makeDbUser({ id: '1', role: 'super_admin', tenant_id: null, name: 'Super Admin' });
const superAdminRow = makeDbUserRow(superAdmin);

/* ── Clients ─────────────────────────────────────────────────────────── */

const clientA1 = makeDbClient({ id: '50', name: 'Alice (Tenant A)' });
const clientA2 = makeDbClient({ id: '51', name: 'Bob (Tenant A)' });
const clientB1 = makeDbClient({ id: '60', name: 'Xavier (Tenant B)' });

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
    [F.civilite]: '', [F.firstName]: client.first_name ?? '', [F.lastName]: client.last_name ?? '',
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
    [F.fccStatut]: client.fcc_statut ? { id: 1, value: client.fcc_statut, color: 'blue' } : null,
    [F.fccDate]: client.fcc_date ?? '',
    [F.derStatut]: client.der_statut ? { id: 1, value: client.der_statut, color: 'blue' } : null,
    [F.derDate]: '', [F.derEnvoiTimestamp]: '',
    [F.ldmStatut]: client.ldm_statut ? { id: 1, value: client.ldm_statut, color: 'blue' } : null,
    [F.ldmDate]: '', [F.notesInternes]: '', [F.airtableRecordId]: '',
  };
}

/* ── FCC Submissions ─────────────────────────────────────────────────── */

function makeFccClientRow(sub: ReturnType<typeof makeDbFccClient>): Record<string, unknown> {
  const F = BASEROW_FIELDS.fccClients;
  return {
    id: Number(sub.id),
    [F.name]: sub.name,
    [F.clientId]: sub.client_id ? [{ id: Number(sub.client_id), value: `Client ${sub.client_id}` }] : [],
    [F.profilRisque]: sub.profil_risque ?? '',
    [F.profilConnaissance]: sub.profil_connaissance ?? '',
    [F.scoreConnaissance]: sub.score_connaissance,
    [F.scoreRisque]: sub.score_risque,
    [F.docusignEnvelopeId]: sub.docusign_envelope_id ?? '',
    [F.docusignSentAt]: sub.docusign_sent_at ?? '',
    [F.notesNm]: sub.notes_nm ?? '',
    [F.migrationRecordId]: sub.migration_record_id ?? '',
    [F.typeFormulaire]: sub.type_formulaire ?? '',
    [F.idFormulaire]: sub.id_formulaire ?? '',
    [F.dateSoumission]: sub.date_soumission ?? '',
    [F.statutDossier]: sub.statut_dossier ? { id: 1, value: sub.statut_dossier, color: 'blue' } : null,
    [F.client]: sub.client ?? '',
    [F.email]: sub.email ?? '',
    [F.telephone]: sub.telephone ?? '',
    [F.ville]: sub.ville ?? '',
    [F.profession]: sub.profession ?? '',
    [F.scoreTotal]: sub.score_total,
    [F.sharepointFileUrl]: sub.sharepoint_file_url ?? '',
    [F.sharepointFileId]: sub.sharepoint_file_id ?? '',
    [F.ipClient]: sub.ip_client ?? '',
    [F.pdfFilename]: sub.pdf_filename ?? '',
    [F.prefillToken]: sub.prefill_token ?? '',
    [F.boAgent]: sub.bo_agent ?? '',
    [F.be1Nom]: '', [F.be1Ddn]: '', [F.be1LieuNaissance]: '', [F.be1Nationalite]: '',
    [F.be1ResidenceFiscale]: '', [F.be1Adresse]: '', [F.be1Detention]: '',
    [F.be2Nom]: '', [F.be2Ddn]: '', [F.be2LieuNaissance]: '', [F.be2Nationalite]: '',
    [F.be2ResidenceFiscale]: '', [F.be2Adresse]: '', [F.be2Detention]: '',
    [F.be3Nom]: '', [F.be3Ddn]: '', [F.be3Nationalite]: '', [F.be3Detention]: '',
    [F.be4Nom]: '', [F.be4Ddn]: '', [F.be4Nationalite]: '', [F.be4Detention]: '',
    [F.clientDenomination]: '', [F.clientRepresentantNom]: '', [F.clientRepresentantFonction]: '',
    [F.clientSiren]: '', [F.clientNaf]: '', [F.clientActivite]: '',
    [F.clientFormeJuridique]: '', [F.clientCa]: '', [F.clientBilan]: '',
    [F.clientFondsPropres]: '', [F.clientFiscalite]: '',
  };
}

/* ═══════════════════════════════════════════════════════════════════════ */

describe('Multi-tenant integration', () => {
  beforeEach(() => {
    seedTableCaches(TENANT_A_ID);
    seedTableCachesForTenant(TENANT_B_ID, TABLE_IDS_B);
  });

  /* ── Data isolation — GET /api/clients ──────────────────────────── */

  describe('Data isolation — clients', () => {
    it('tenant A user sees only tenant A clients', async () => {
      nockUserById('10', userARow);
      nockTenantById(TENANT_A_ID, tenantARow);
      nockListRows(TABLE_IDS.clients, [makeClientRow(clientA1), makeClientRow(clientA2)]);

      const res = await supertest(app)
        .get('/api/clients')
        .set('Authorization', authHeader({ userId: '10', tenantId: TENANT_A_ID }));

      expect(res.status).toBe(200);
      expect(res.body.clients).toHaveLength(2);
      expect(res.body.clients[0].name).toBe('Alice (Tenant A)');
      expect(res.body.clients[1].name).toBe('Bob (Tenant A)');
    });

    it('tenant B user sees only tenant B clients', async () => {
      nockUserById('20', userBRow);
      nockTenantById(TENANT_B_ID, tenantBRow);
      nockListRows(TABLE_IDS_B.clients, [makeClientRow(clientB1)]);

      const res = await supertest(app)
        .get('/api/clients')
        .set('Authorization', authHeader({ userId: '20', tenantId: TENANT_B_ID }));

      expect(res.status).toBe(200);
      expect(res.body.clients).toHaveLength(1);
      expect(res.body.clients[0].name).toBe('Xavier (Tenant B)');
    });

    it('tenant A can get client by ID from own table', async () => {
      nockUserById('10', userARow);
      nockTenantById(TENANT_A_ID, tenantARow);
      nockGetRow(TABLE_IDS.clients, '50', makeClientRow(clientA1));

      const res = await supertest(app)
        .get('/api/clients/50')
        .set('Authorization', authHeader({ userId: '10', tenantId: TENANT_A_ID }));

      expect(res.status).toBe(200);
      expect(res.body.client.name).toBe('Alice (Tenant A)');
    });

    it('tenant A gets 404 for non-existent client (proves own table was queried)', async () => {
      nockUserById('10', userARow);
      nockTenantById(TENANT_A_ID, tenantARow);
      nock('https://api.baserow.io')
        .get(`/api/database/rows/table/${TABLE_IDS.clients}/99/`)
        .query(true)
        .reply(404, { error: 'NOT_FOUND' });

      const res = await supertest(app)
        .get('/api/clients/99')
        .set('Authorization', authHeader({ userId: '10', tenantId: TENANT_A_ID }));

      expect(res.status).toBe(404);
    });
  });

  /* ── Cross-tenant: same endpoint, different data ───────────────── */

  describe('Cross-tenant auth', () => {
    it('same endpoint returns different data per tenant', async () => {
      // Tenant A request
      nockUserById('10', userARow);
      nockTenantById(TENANT_A_ID, tenantARow);
      nockListRows(TABLE_IDS.clients, [makeClientRow(clientA1), makeClientRow(clientA2)]);

      const resA = await supertest(app)
        .get('/api/clients')
        .set('Authorization', authHeader({ userId: '10', tenantId: TENANT_A_ID }));

      expect(resA.status).toBe(200);
      expect(resA.body.clients).toHaveLength(2);

      // Tenant B request
      nockUserById('20', userBRow);
      nockTenantById(TENANT_B_ID, tenantBRow);
      nockListRows(TABLE_IDS_B.clients, [makeClientRow(clientB1)]);

      const resB = await supertest(app)
        .get('/api/clients')
        .set('Authorization', authHeader({ userId: '20', tenantId: TENANT_B_ID }));

      expect(resB.status).toBe(200);
      expect(resB.body.clients).toHaveLength(1);
      expect(resB.body.clients[0].name).toBe('Xavier (Tenant B)');
    });

    it('tenant user cannot access super_admin platform routes', async () => {
      nockUserById('10', userARow);

      const res = await supertest(app)
        .get('/api/platform/tenants')
        .set('Authorization', authHeader({ userId: '10', tenantId: TENANT_A_ID }));

      expect(res.status).toBe(403);
    });

    it('super_admin cannot access tenant routes (requireTenant blocks)', async () => {
      nockUserById('1', superAdminRow);

      const res = await supertest(app)
        .get('/api/clients')
        .set('Authorization', authHeader({ userId: '1', role: 'super_admin' }));

      expect(res.status).toBe(403);
    });
  });

  /* ── Branding isolation — GET /api/tenant/branding ─────────────── */

  describe('Branding isolation', () => {
    it('tenant A user receives tenant A branding', async () => {
      nockUserById('10', userARow);
      nockTenantById(TENANT_A_ID, tenantARow);

      const res = await supertest(app)
        .get('/api/tenant/branding')
        .set('Authorization', authHeader({ userId: '10', tenantId: TENANT_A_ID }));

      expect(res.status).toBe(200);
      expect(res.body.branding.name).toBe('NM Prime');
      expect(res.body.branding.orias).toBe('12345678');
      expect(res.body.branding.accent).toBe('#3B82F6');
    });

    it('tenant B user receives tenant B branding', async () => {
      nockUserById('20', userBRow);
      nockTenantById(TENANT_B_ID, tenantBRow);

      const res = await supertest(app)
        .get('/api/tenant/branding')
        .set('Authorization', authHeader({ userId: '20', tenantId: TENANT_B_ID }));

      expect(res.status).toBe(200);
      expect(res.body.branding.name).toBe('Cabinet Dupont');
      expect(res.body.branding.orias).toBe('87654321');
      expect(res.body.branding.accent).toBe('#10B981');
    });

    it('super_admin cannot access tenant branding', async () => {
      nockUserById('1', superAdminRow);

      const res = await supertest(app)
        .get('/api/tenant/branding')
        .set('Authorization', authHeader({ userId: '1', role: 'super_admin' }));

      expect(res.status).toBe(403);
    });
  });

  /* ── FCC isolation ─────────────────────────────────────────────── */

  describe('FCC isolation', () => {
    const subA1 = makeDbFccClient({ id: '400', client: 'Alice', statut_dossier: 'En attente' });
    const subA2 = makeDbFccClient({ id: '401', client: 'Bob', statut_dossier: 'Signé' });
    const subB1 = makeDbFccClient({ id: '500', client: 'Xavier', statut_dossier: 'En attente' });

    it('tenant A FCC history uses tenant A table', async () => {
      nockUserById('10', userARow);
      nockTenantById(TENANT_A_ID, tenantARow);
      nockListRows(TABLE_IDS.fccClients, [
        makeFccClientRow(subA1),
        makeFccClientRow(subA2),
      ]);

      const res = await supertest(app)
        .get('/api/fcc/history')
        .set('Authorization', authHeader({ userId: '10', tenantId: TENANT_A_ID }));

      expect(res.status).toBe(200);
      expect(res.body.fccClients).toHaveLength(2);
      expect(res.body.fccClients[0].id).toBe('400');
    });

    it('tenant B FCC history uses tenant B table', async () => {
      nockUserById('20', userBRow);
      nockTenantById(TENANT_B_ID, tenantBRow);
      nockListRows(TABLE_IDS_B.fccClients, [makeFccClientRow(subB1)]);

      const res = await supertest(app)
        .get('/api/fcc/history')
        .set('Authorization', authHeader({ userId: '20', tenantId: TENANT_B_ID }));

      expect(res.status).toBe(200);
      expect(res.body.fccClients).toHaveLength(1);
      expect(res.body.fccClients[0].id).toBe('500');
    });
  });
});
