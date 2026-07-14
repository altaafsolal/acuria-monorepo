import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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
  nockListRows,
  nockGetRow,
  nockUpdateRow,
  nockCreateRow,
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
});
const tenantRow = makeTenantRow(tenant);

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

describe('FCC Routes', () => {
  beforeEach(() => {
    seedTableCaches(TENANT_ID);
  });

  describe('GET /api/fcc/history', () => {
    it('returns FCC submissions for the tenant', async () => {
      const sub1 = makeDbFccSubmission({
        id: '300',
        form_type: 'PP',
        statut: 'En attente',
        client: 'Jean Dupont',
      });
      const sub2 = makeDbFccSubmission({
        id: '301',
        form_type: 'PM',
        statut: 'Signé',
        client: 'Société ABC',
      });

      nockUserById(USER_ID, userRow);
      nockTenantById(TENANT_ID, tenantRow);
      nockListRows(TABLE_IDS.fccSubmissions, [
        makeFccSubmissionRow(sub1),
        makeFccSubmissionRow(sub2),
      ]);

      const res = await supertest(app)
        .get('/api/fcc/history')
        .set('Authorization', authHeader({ userId: USER_ID, tenantId: TENANT_ID }));

      expect(res.status).toBe(200);
      expect(res.body.submissions).toHaveLength(2);
      expect(res.body.submissions[0].id).toBe('300');
      expect(res.body.submissions[0].formType).toBe('PP');
      expect(res.body.submissions[0].statut).toBe('En attente');
      expect(res.body.submissions[1].id).toBe('301');
      expect(res.body.submissions[1].statut).toBe('Signé');
    });

    it('returns 401 without auth', async () => {
      const res = await supertest(app).get('/api/fcc/history');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/fcc/quick-validate', () => {
    it('updates submission and client status to Signé', async () => {
      const client = makeDbClient({
        id: '10',
        fcc_statut: 'Soumis',
        fcc_date: '2026-07-01',
      });
      const clientRow = makeClientRow(client);
      const updatedClientRow = {
        ...clientRow,
        [BASEROW_FIELDS.clients.fccStatut]: { id: 2, value: 'Signé', color: 'green' },
      };
      const sub = makeDbFccSubmission({ id: '300', statut: 'En attente' });
      const updatedSubRow = {
        ...makeFccSubmissionRow(sub),
        [BASEROW_FIELDS.fccSubmissions.statut]: { id: 2, value: 'Signé', color: 'green' },
      };

      nockUserById(USER_ID, userRow);
      nockTenantById(TENANT_ID, tenantRow);
      // updateSubmissionStatus
      nockUpdateRow(TABLE_IDS.fccSubmissions, '300', updatedSubRow);
      // getClientById (for quick-validate)
      nockGetRow(TABLE_IDS.clients, '10', clientRow);
      // patchClientKycFields -> getClientById + updateRow
      nockGetRow(TABLE_IDS.clients, '10', clientRow);
      nockUpdateRow(TABLE_IDS.clients, '10', updatedClientRow);

      const res = await supertest(app)
        .post('/api/fcc/quick-validate')
        .set('Authorization', authHeader({ userId: USER_ID, tenantId: TENANT_ID }))
        .send({ submissionId: '300', clientId: '10' });

      expect(res.status).toBe(200);
      expect(res.body.client).toBeDefined();
      expect(res.body.client.fccStatut).toBe('Signé');
    });

    it('returns 400 when neither submissionId nor clientId provided', async () => {
      nockUserById(USER_ID, userRow);
      nockTenantById(TENANT_ID, tenantRow);

      const res = await supertest(app)
        .post('/api/fcc/quick-validate')
        .set('Authorization', authHeader({ userId: USER_ID, tenantId: TENANT_ID }))
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('submissionId or clientId');
    });
  });

  describe('POST /api/fcc/submit', () => {
    afterEach(() => {
      restoreFetch();
    });

    it('creates an FCC submission (public endpoint, no auth)', async () => {
      const fetchCalls = stubFetch();

      const newSubRow = makeFccSubmissionRow(
        makeDbFccSubmission({ id: '400', statut: 'En attente' }),
      );

      // findTenantById for tenant lookup (route-level)
      nockTenantById(TENANT_ID, tenantRow);
      // resolveTenantDbContext -> findTenantById (for listClientsByTenantId)
      nockTenantById(TENANT_ID, tenantRow);
      // listClientsByTenantId to find client by email
      nockListRows(TABLE_IDS.clients, []);
      // createSubmission
      nockCreateRow(TABLE_IDS.fccSubmissions, newSubRow);

      const res = await supertest(app)
        .post('/api/fcc/submit')
        .send({
          tenant_id: TENANT_ID,
          form_type: 'PP',
          client_nom_complet: 'Jean Dupont',
          client_email: 'jean@example.com',
          score_total: 42,
          pdf_filename: 'test.pdf',
          pdf_base64: 'dGVzdA==',
          xlsx_filename: 'test.xlsx',
          xlsx_base64: 'dGVzdA==',
          timestamp_soumission: '2026-07-13T10:00:00Z',
        });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      // Verify Make webhook was called (even if url is empty, stubFetch captures it)
      // The webhook call is via postWebhook which uses fetch
      expect(fetchCalls.length).toBeGreaterThanOrEqual(1);
    });
  });
});
