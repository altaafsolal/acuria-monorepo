import { describe, it, expect, beforeEach } from 'vitest';
import supertest from 'supertest';
import { app } from '../../test/helpers/app.js';
import {
  makeDbClient,
  makeDbFccClient,
  makeTenantRecord,
  makeTenantRow,
} from '../../test/helpers/fixtures.js';
import {
  seedTableCaches,
  nockTenantById,
  nockGetRow,
  nockUpdateRow,
  nockListRows,
  TABLE_IDS,
} from '../../test/helpers/nock-baserow.js';
import { BASEROW_FIELDS } from '../../../baserow/schema.js';

const TENANT_ID = '1';
// Matches WEBHOOK_SECRET injected by vitest.integration.config.ts
const WEBHOOK_SECRET = 'test-webhook-secret';

const tenant = makeTenantRecord({
  id: TENANT_ID,
  database_token: 'test-tenant-token',
  branding_name: 'Test Cabinet',
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

describe('POST /api/fcc/docusign-webhook', () => {
  beforeEach(() => {
    seedTableCaches(TENANT_ID);
  });

  it("status 'completed' → fcc_statut = 'Signé'", async () => {
    const client = makeDbClient({ id: '10', fcc_statut: 'DocuSign envoyé' });
    const clientRow = makeClientRow(client);
    const updatedClientRow = {
      ...clientRow,
      [BASEROW_FIELDS.clients.fccStatut]: { id: 2, value: 'Signé', color: 'green' },
    };
    const sub = makeDbFccClient({ id: '300', statut_dossier: 'Envoyé DocuSign' });
    const updatedSubRow = {
      ...makeFccClientRow(sub),
      [BASEROW_FIELDS.fccClients.statutDossier]: { id: 2, value: 'Signé', color: 'green' },
    };

    nockTenantById(TENANT_ID, tenantRow);
    nockGetRow(TABLE_IDS.clients, '10', clientRow);
    nockUpdateRow(TABLE_IDS.clients, '10', updatedClientRow);
    nockListRows(TABLE_IDS.fccClients, [makeFccClientRow(sub)]);
    nockUpdateRow(TABLE_IDS.fccClients, '300', updatedSubRow);

    const res = await supertest(app)
      .post('/api/fcc/docusign-webhook')
      .set('Authorization', WEBHOOK_SECRET)
      .send({ tenant_id: TENANT_ID, record_id: '10', status: 'completed' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.statut).toBe('Signé');
  });

  it("status 'signed' → fcc_statut = 'Signé'", async () => {
    const client = makeDbClient({ id: '10', fcc_statut: 'DocuSign envoyé' });
    const clientRow = makeClientRow(client);
    const updatedClientRow = {
      ...clientRow,
      [BASEROW_FIELDS.clients.fccStatut]: { id: 2, value: 'Signé', color: 'green' },
    };
    const sub = makeDbFccClient({ id: '300', statut_dossier: 'Envoyé DocuSign' });
    const updatedSubRow = {
      ...makeFccClientRow(sub),
      [BASEROW_FIELDS.fccClients.statutDossier]: { id: 2, value: 'Signé', color: 'green' },
    };

    nockTenantById(TENANT_ID, tenantRow);
    nockGetRow(TABLE_IDS.clients, '10', clientRow);
    nockUpdateRow(TABLE_IDS.clients, '10', updatedClientRow);
    nockListRows(TABLE_IDS.fccClients, [makeFccClientRow(sub)]);
    nockUpdateRow(TABLE_IDS.fccClients, '300', updatedSubRow);

    const res = await supertest(app)
      .post('/api/fcc/docusign-webhook')
      .set('Authorization', WEBHOOK_SECRET)
      .send({ tenant_id: TENANT_ID, record_id: '10', status: 'signed' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.statut).toBe('Signé');
  });

  it("status 'sent' → fcc_statut = 'DocuSign envoyé'", async () => {
    const client = makeDbClient({ id: '10', fcc_statut: 'Soumis' });
    const clientRow = makeClientRow(client);
    const updatedClientRow = {
      ...clientRow,
      [BASEROW_FIELDS.clients.fccStatut]: { id: 2, value: 'DocuSign envoyé', color: 'orange' },
    };
    const sub = makeDbFccClient({ id: '300', statut_dossier: 'En attente' });
    const updatedSubRow = {
      ...makeFccClientRow(sub),
      [BASEROW_FIELDS.fccClients.statutDossier]: { id: 2, value: 'DocuSign envoyé', color: 'orange' },
    };

    nockTenantById(TENANT_ID, tenantRow);
    nockGetRow(TABLE_IDS.clients, '10', clientRow);
    nockUpdateRow(TABLE_IDS.clients, '10', updatedClientRow);
    nockListRows(TABLE_IDS.fccClients, [makeFccClientRow(sub)]);
    nockUpdateRow(TABLE_IDS.fccClients, '300', updatedSubRow);

    const res = await supertest(app)
      .post('/api/fcc/docusign-webhook')
      .set('Authorization', WEBHOOK_SECRET)
      .send({ tenant_id: TENANT_ID, record_id: '10', status: 'sent' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.statut).toBe('DocuSign envoyé');
  });

  it('envelope_id is stored on the submission update', async () => {
    const client = makeDbClient({ id: '10', fcc_statut: 'DocuSign envoyé' });
    const clientRow = makeClientRow(client);
    const updatedClientRow = {
      ...clientRow,
      [BASEROW_FIELDS.clients.fccStatut]: { id: 2, value: 'Signé', color: 'green' },
    };
    const sub = makeDbFccClient({ id: '300', statut_dossier: 'Envoyé DocuSign' });
    const updatedSubRow = {
      ...makeFccClientRow(sub),
      [BASEROW_FIELDS.fccClients.statutDossier]: { id: 2, value: 'Signé', color: 'green' },
      [BASEROW_FIELDS.fccClients.docusignEnvelopeId]: 'env-123',
    };

    nockTenantById(TENANT_ID, tenantRow);
    nockGetRow(TABLE_IDS.clients, '10', clientRow);
    nockUpdateRow(TABLE_IDS.clients, '10', updatedClientRow);
    nockListRows(TABLE_IDS.fccClients, [makeFccClientRow(sub)]);
    nockUpdateRow(TABLE_IDS.fccClients, '300', updatedSubRow);

    const res = await supertest(app)
      .post('/api/fcc/docusign-webhook')
      .set('Authorization', WEBHOOK_SECRET)
      .send({ tenant_id: TENANT_ID, record_id: '10', status: 'completed', envelope_id: 'env-123' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.statut).toBe('Signé');
  });

  it('no submissions exist → returns 200 gracefully without updating a submission', async () => {
    const client = makeDbClient({ id: '10', fcc_statut: 'DocuSign envoyé' });
    const clientRow = makeClientRow(client);
    const updatedClientRow = {
      ...clientRow,
      [BASEROW_FIELDS.clients.fccStatut]: { id: 2, value: 'Signé', color: 'green' },
    };

    nockTenantById(TENANT_ID, tenantRow);
    nockGetRow(TABLE_IDS.clients, '10', clientRow);
    nockUpdateRow(TABLE_IDS.clients, '10', updatedClientRow);
    nockListRows(TABLE_IDS.fccClients, []);

    const res = await supertest(app)
      .post('/api/fcc/docusign-webhook')
      .set('Authorization', WEBHOOK_SECRET)
      .send({ tenant_id: TENANT_ID, record_id: '10', status: 'completed' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('returns 400 when tenant_id is missing', async () => {
    const res = await supertest(app)
      .post('/api/fcc/docusign-webhook')
      .set('Authorization', WEBHOOK_SECRET)
      .send({ record_id: '10' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns 400 when record_id is missing', async () => {
    const res = await supertest(app)
      .post('/api/fcc/docusign-webhook')
      .set('Authorization', WEBHOOK_SECRET)
      .send({ tenant_id: TENANT_ID });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('rejects the webhook when the shared secret is missing', async () => {
    const res = await supertest(app)
      .post('/api/fcc/docusign-webhook')
      .send({ tenant_id: TENANT_ID, record_id: '10', status: 'completed' });
    // No Authorization header — must be rejected before any DB access.

    expect(res.status).toBe(401);
  });

  it('rejects the webhook when the shared secret is wrong', async () => {
    const res = await supertest(app)
      .post('/api/fcc/docusign-webhook')
      .set('Authorization', 'wrong-secret')
      .send({ tenant_id: TENANT_ID, record_id: '10', status: 'completed' });

    expect(res.status).toBe(401);
  });
});
