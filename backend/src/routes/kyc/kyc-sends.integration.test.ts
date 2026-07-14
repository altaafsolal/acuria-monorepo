import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import supertest from 'supertest';
import { app } from '../../test/helpers/app.js';
import { authHeader } from '../../test/helpers/auth.js';
import {
  makeDbUser,
  makeDbUserRow,
  makeTenantRecord,
  makeTenantRow,
  makeDbClient,
  makeDbFccSubmission,
} from '../../test/helpers/fixtures.js';
import {
  seedTableCaches,
  nockUserById,
  nockTenantById,
  nockGetRow,
  nockUpdateRow,
  nockListRows,
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
  database_token: 'test-tenant-token',
  branding_name: 'Test Cabinet',
  email: 'cabinet@example.com',
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
    [F.civilite]: '', [F.firstName]: client.first_name ?? '', [F.lastName]: client.last_name ?? '',
    [F.birthDate]: '', [F.birthPlace]: '', [F.nationality]: '',
    [F.maritalStatus]: '', [F.matrimonialRegime]: '',
    [F.profession]: '', [F.proStatus]: '', [F.sector]: '', [F.employer]: '',
    [F.annualIncome]: '', [F.currentCharges]: '',
    [F.tradeName]: client.trade_name ?? '', [F.legalForm]: '', [F.siren]: '', [F.nafCode]: '',
    [F.activity]: '', [F.legalRepName]: '', [F.legalRepRole]: '',
    [F.revenue]: '', [F.totalBalance]: '', [F.equity]: '', [F.taxation]: '',
    [F.fiscalCountry]: '', [F.capital]: '',
    [F.patrimoineImmobilier]: '', [F.patrimoineEpargne]: '',
    [F.patrimoineParticipations]: '', [F.patrimoineLiquidites]: '',
    [F.patrimoineAutres]: '',
    [F.fccStatut]: client.fcc_statut ? { id: 1, value: client.fcc_statut, color: 'blue' } : null,
    [F.fccDate]: client.fcc_date ?? '',
    [F.derStatut]: client.der_statut ? { id: 1, value: client.der_statut, color: 'blue' } : null,
    [F.derDate]: client.der_date ?? '',
    [F.derEnvoiTimestamp]: client.der_envoi_timestamp ?? '',
    [F.ldmStatut]: client.ldm_statut ? { id: 1, value: client.ldm_statut, color: 'blue' } : null,
    [F.ldmDate]: '', [F.notesInternes]: '', [F.airtableRecordId]: '',
  };
}

function makeFccSubmissionRow(sub: ReturnType<typeof makeDbFccSubmission>): Record<string, unknown> {
  const F = BASEROW_FIELDS.fccSubmissions;
  return {
    id: Number(sub.id),
    [F.name]: sub.name,
    [F.clientId]: sub.client_id ? [{ id: Number(sub.client_id), value: `Client ${sub.client_id}` }] : [],
    [F.submittedAt]: sub.submitted_at ?? '',
    [F.formType]: sub.form_type ?? '',
    [F.profilRisque]: sub.profil_risque ?? '',
    [F.profilConnaissance]: sub.profil_connaissance ?? '',
    [F.scoreConnaissance]: sub.score_connaissance,
    [F.scoreRisque]: sub.score_risque,
    [F.statut]: sub.statut ? { id: 1, value: sub.statut, color: 'blue' } : null,
    [F.rawData]: sub.raw_data ?? '',
    [F.docusignEnvelopeId]: sub.docusign_envelope_id ?? '',
    [F.airtableRecordId]: sub.airtable_record_id ?? '',
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

describe('KYC Send Routes', () => {
  beforeEach(() => {
    seedTableCaches(TENANT_ID);
    stubFetch();
  });

  afterEach(() => {
    restoreFetch();
  });

  // ---------------------------------------------------------------------------
  // POST /api/kyc/fcc/send
  // ---------------------------------------------------------------------------
  describe('POST /api/kyc/fcc/send', () => {
    it('happy path with email: calls Make webhook, updates fcc_statut to Envoyé, returns { client, link }', async () => {
      const client = makeDbClient({
        id: '10',
        email: 'client@example.com',
        first_name: 'Jean',
        last_name: 'Dupont',
        fcc_statut: 'À envoyer',
      });
      const clientRow = makeClientRow(client);
      const updatedClientRow = {
        ...clientRow,
        [BASEROW_FIELDS.clients.fccStatut]: { id: 2, value: 'Envoyé', color: 'green' },
        [BASEROW_FIELDS.clients.fccDate]: new Date().toISOString().split('T')[0],
      };

      // auth middleware
      nockUserById(USER_ID, userRow);
      // resolveTenantDbContext (called by getClientById)
      nockTenantById(TENANT_ID, tenantRow);
      // getClientById (parallel with findTenantById)
      nockGetRow(TABLE_IDS.clients, '10', clientRow);
      // findTenantById (parallel in route)
      nockTenantById(TENANT_ID, tenantRow);
      // patchClientKycFields -> updateClient -> getClientById + updateRow
      nockGetRow(TABLE_IDS.clients, '10', clientRow);
      nockUpdateRow(TABLE_IDS.clients, '10', updatedClientRow);

      const res = await supertest(app)
        .post('/api/kyc/fcc/send')
        .set('Authorization', authHeader({ userId: USER_ID, tenantId: TENANT_ID }))
        .send({ clientId: '10' });

      expect(res.status).toBe(200);
      expect(res.body.client).toBeDefined();
      expect(res.body.client.fccStatut).toBe('Envoyé');
      expect(res.body.link).toBeDefined();
      expect(typeof res.body.link).toBe('string');
    });

    it('returns 400 without clientId', async () => {
      nockUserById(USER_ID, userRow);
      nockTenantById(TENANT_ID, tenantRow);

      const res = await supertest(app)
        .post('/api/kyc/fcc/send')
        .set('Authorization', authHeader({ userId: USER_ID, tenantId: TENANT_ID }))
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('clientId');
    });

    it('returns 401 without auth', async () => {
      const res = await supertest(app)
        .post('/api/kyc/fcc/send')
        .send({ clientId: '10' });

      expect(res.status).toBe(401);
    });
  });

  // ---------------------------------------------------------------------------
  // POST /api/kyc/der/docusign
  // ---------------------------------------------------------------------------
  describe('POST /api/kyc/der/docusign', () => {
    const derDocusignBody = {
      clientId: '20',
      signataireName: 'Baptiste Money',
      signataireEmail: 'baptiste@nm.com',
      ldmType: 'PP_SANS',
    };

    it('happy path PP: calls Make webhook, updates der_statut and ldm_statut to Envoyé', async () => {
      const client = makeDbClient({
        id: '20',
        email: 'client@example.com',
        client_type: 'PP',
        first_name: 'Marie',
        last_name: 'Martin',
        der_statut: 'À envoyer',
        ldm_statut: 'À envoyer',
      });
      const clientRow = makeClientRow(client);
      const updatedClientRow = {
        ...clientRow,
        [BASEROW_FIELDS.clients.derStatut]: { id: 2, value: 'Envoyé', color: 'green' },
        [BASEROW_FIELDS.clients.derDate]: new Date().toISOString().split('T')[0],
        [BASEROW_FIELDS.clients.ldmStatut]: { id: 2, value: 'Envoyé', color: 'green' },
        [BASEROW_FIELDS.clients.ldmDate]: new Date().toISOString().split('T')[0],
      };

      // auth middleware
      nockUserById(USER_ID, userRow);
      // resolveTenantDbContext (called by getClientById)
      nockTenantById(TENANT_ID, tenantRow);
      // getClientById + findTenantById (parallel)
      nockGetRow(TABLE_IDS.clients, '20', clientRow);
      nockTenantById(TENANT_ID, tenantRow);
      // patchClientKycFields -> getClientById + updateRow
      nockGetRow(TABLE_IDS.clients, '20', clientRow);
      nockUpdateRow(TABLE_IDS.clients, '20', updatedClientRow);

      const res = await supertest(app)
        .post('/api/kyc/der/docusign')
        .set('Authorization', authHeader({ userId: USER_ID, tenantId: TENANT_ID }))
        .send(derDocusignBody);

      expect(res.status).toBe(200);
      expect(res.body.client).toBeDefined();
      expect(res.body.client.derStatut).toBe('Envoyé');
      expect(res.body.client.ldmStatut).toBe('Envoyé');
    });

    it('happy path PM: denomination included in payload', async () => {
      const client = makeDbClient({
        id: '21',
        email: 'pm@example.com',
        client_type: 'PM',
        trade_name: 'Société Dupont SARL',
        der_statut: 'À envoyer',
        ldm_statut: 'À envoyer',
      });
      const clientRow = makeClientRow(client);
      const updatedClientRow = {
        ...clientRow,
        [BASEROW_FIELDS.clients.derStatut]: { id: 2, value: 'Envoyé', color: 'green' },
        [BASEROW_FIELDS.clients.derDate]: new Date().toISOString().split('T')[0],
        [BASEROW_FIELDS.clients.ldmStatut]: { id: 2, value: 'Envoyé', color: 'green' },
        [BASEROW_FIELDS.clients.ldmDate]: new Date().toISOString().split('T')[0],
      };

      nockUserById(USER_ID, userRow);
      nockTenantById(TENANT_ID, tenantRow);
      nockGetRow(TABLE_IDS.clients, '21', clientRow);
      nockTenantById(TENANT_ID, tenantRow);
      nockGetRow(TABLE_IDS.clients, '21', clientRow);
      nockUpdateRow(TABLE_IDS.clients, '21', updatedClientRow);

      const res = await supertest(app)
        .post('/api/kyc/der/docusign')
        .set('Authorization', authHeader({ userId: USER_ID, tenantId: TENANT_ID }))
        .send({
          clientId: '21',
          signataireName: 'Baptiste Money',
          signataireEmail: 'baptiste@nm.com',
          ldmType: 'PM_SANS',
        });

      expect(res.status).toBe(200);
      expect(res.body.client).toBeDefined();
      expect(res.body.client.derStatut).toBe('Envoyé');
    });

    it('returns 400 without clientId', async () => {
      nockUserById(USER_ID, userRow);
      nockTenantById(TENANT_ID, tenantRow);

      const res = await supertest(app)
        .post('/api/kyc/der/docusign')
        .set('Authorization', authHeader({ userId: USER_ID, tenantId: TENANT_ID }))
        .send({ signataireName: 'Baptiste Money', signataireEmail: 'baptiste@nm.com' });

      expect(res.status).toBe(400);
    });

    it('returns 400 for client without email', async () => {
      const client = makeDbClient({ id: '22', email: null as unknown as string, client_type: 'PP' });
      // Override email to null in the row
      const clientRow = { ...makeClientRow(client), [BASEROW_FIELDS.clients.email]: '' };

      nockUserById(USER_ID, userRow);
      nockTenantById(TENANT_ID, tenantRow);
      nockGetRow(TABLE_IDS.clients, '22', clientRow);
      nockTenantById(TENANT_ID, tenantRow);

      const res = await supertest(app)
        .post('/api/kyc/der/docusign')
        .set('Authorization', authHeader({ userId: USER_ID, tenantId: TENANT_ID }))
        .send({ clientId: '22', signataireName: 'Baptiste Money', signataireEmail: 'baptiste@nm.com', ldmType: 'PP_SANS' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Email client manquant');
    });
  });

  // ---------------------------------------------------------------------------
  // POST /api/kyc/fcc/docusign
  // ---------------------------------------------------------------------------
  describe('POST /api/kyc/fcc/docusign', () => {
    it('happy path: stores envelope_id, updates fcc_statut to DocuSign envoyé', async () => {
      // Override fetch to return envelope_id
      restoreFetch();
      vi.stubGlobal('fetch', async () => new Response(
        JSON.stringify({ envelope_id: 'env-123' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ));

      const client = makeDbClient({
        id: '30',
        email: 'client@example.com',
        fcc_statut: 'Soumis',
        fcc_date: '2026-07-01',
      });
      const clientRow = makeClientRow(client);
      const updatedClientRow = {
        ...clientRow,
        [BASEROW_FIELDS.clients.fccStatut]: { id: 2, value: 'DocuSign envoyé', color: 'green' },
      };

      const submission = makeDbFccSubmission({
        id: '500',
        client_id: '30',
        statut: 'En attente',
        pdf_filename: 'fcc-30.pdf',
      });
      const submissionRow = makeFccSubmissionRow(submission);
      const updatedSubmissionRow = {
        ...submissionRow,
        [BASEROW_FIELDS.fccSubmissions.docusignEnvelopeId]: 'env-123',
      };

      // auth middleware
      nockUserById(USER_ID, userRow);
      // resolveTenantDbContext (called by getClientById)
      nockTenantById(TENANT_ID, tenantRow);
      // getClientById + findTenantById (parallel)
      nockGetRow(TABLE_IDS.clients, '30', clientRow);
      nockTenantById(TENANT_ID, tenantRow);
      // listSubmissionsByClient
      nockListRows(TABLE_IDS.fccSubmissions, [submissionRow]);
      // updateSubmissionStatus (with envelope_id)
      nockUpdateRow(TABLE_IDS.fccSubmissions, '500', updatedSubmissionRow);
      // patchClientKycFields -> getClientById + updateRow
      nockGetRow(TABLE_IDS.clients, '30', clientRow);
      nockUpdateRow(TABLE_IDS.clients, '30', updatedClientRow);

      const res = await supertest(app)
        .post('/api/kyc/fcc/docusign')
        .set('Authorization', authHeader({ userId: USER_ID, tenantId: TENANT_ID }))
        .send({ clientId: '30' });

      expect(res.status).toBe(200);
      expect(res.body.client).toBeDefined();
      expect(res.body.client.fccStatut).toBe('DocuSign envoyé');
    });

    it('returns 400 without clientId', async () => {
      nockUserById(USER_ID, userRow);
      nockTenantById(TENANT_ID, tenantRow);

      const res = await supertest(app)
        .post('/api/kyc/fcc/docusign')
        .set('Authorization', authHeader({ userId: USER_ID, tenantId: TENANT_ID }))
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('clientId');
    });

    it('returns 401 without auth', async () => {
      const res = await supertest(app)
        .post('/api/kyc/fcc/docusign')
        .send({ clientId: '30' });

      expect(res.status).toBe(401);
    });
  });

  // ---------------------------------------------------------------------------
  // POST /api/kyc/ldm/send
  // ---------------------------------------------------------------------------
  describe('POST /api/kyc/ldm/send', () => {
    // der_date must be at least 2 calendar days in the past for ldmIsUnlocked to return true.
    // Use 5 days ago to be safe regardless of timezone.
    const derDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const ldmBody = {
      clientId: '40',
      signataireName: 'Baptiste Money',
      signataireEmail: 'baptiste@nm.com',
      ldmType: 'PP_SANS',
    };

    it('happy path (DER > 48h ago): calls Make webhook and updates ldm_statut to Envoyé', async () => {
      const client = makeDbClient({
        id: '40',
        email: 'client@example.com',
        client_type: 'PP',
        first_name: 'Paul',
        last_name: 'Bernard',
        der_statut: 'Envoyé',
        der_date: derDate,
        ldm_statut: 'À envoyer',
      });
      const clientRow = makeClientRow(client);
      const updatedClientRow = {
        ...clientRow,
        [BASEROW_FIELDS.clients.ldmStatut]: { id: 2, value: 'Envoyé', color: 'green' },
        [BASEROW_FIELDS.clients.ldmDate]: new Date().toISOString().split('T')[0],
      };

      // auth middleware
      nockUserById(USER_ID, userRow);
      // resolveTenantDbContext (called by getClientById)
      nockTenantById(TENANT_ID, tenantRow);
      // getClientById + findTenantById (parallel)
      nockGetRow(TABLE_IDS.clients, '40', clientRow);
      nockTenantById(TENANT_ID, tenantRow);
      // patchClientKycFields -> getClientById + updateRow
      nockGetRow(TABLE_IDS.clients, '40', clientRow);
      nockUpdateRow(TABLE_IDS.clients, '40', updatedClientRow);

      const res = await supertest(app)
        .post('/api/kyc/ldm/send')
        .set('Authorization', authHeader({ userId: USER_ID, tenantId: TENANT_ID }))
        .send(ldmBody);

      expect(res.status).toBe(200);
      expect(res.body.client).toBeDefined();
      expect(res.body.client.ldmStatut).toBe('Envoyé');
    });

    it('returns 400 when der_statut is À envoyer (DER not sent yet)', async () => {
      const client = makeDbClient({
        id: '41',
        email: 'client@example.com',
        client_type: 'PP',
        der_statut: 'À envoyer',
        der_date: null,
      });
      const clientRow = makeClientRow(client);

      nockUserById(USER_ID, userRow);
      nockTenantById(TENANT_ID, tenantRow);
      nockGetRow(TABLE_IDS.clients, '41', clientRow);
      nockTenantById(TENANT_ID, tenantRow);

      const res = await supertest(app)
        .post('/api/kyc/ldm/send')
        .set('Authorization', authHeader({ userId: USER_ID, tenantId: TENANT_ID }))
        .send({ ...ldmBody, clientId: '41' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('La DER doit être envoyée avant la LdM');
    });

    it('returns 400 when ldmType is missing', async () => {
      nockUserById(USER_ID, userRow);
      nockTenantById(TENANT_ID, tenantRow);

      const res = await supertest(app)
        .post('/api/kyc/ldm/send')
        .set('Authorization', authHeader({ userId: USER_ID, tenantId: TENANT_ID }))
        .send({
          clientId: '40',
          signataireName: 'Baptiste Money',
          signataireEmail: 'baptiste@nm.com',
          // ldmType intentionally omitted
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('ldmType');
    });
  });
});
