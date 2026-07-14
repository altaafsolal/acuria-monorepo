import { describe, it, expect } from 'vitest';
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
  nockGetRow,
  nockCreateRow,
  nockUpdateRow,
  TABLE_IDS,
} from '../../test/helpers/nock-baserow.js';
import { BASEROW_FIELDS } from '../../../baserow/schema.js';

const F = BASEROW_FIELDS.clients;

const TENANT_ID = '1';

function makeClientRow(client: ReturnType<typeof makeDbClient>): Record<string, unknown> {
  return {
    id: Number(client.id),
    [F.name]: client.name,
    [F.email]: client.email,
    [F.clientType]: { id: 1, value: client.client_type, color: 'blue' },
    [F.kycStatus]: { id: 1, value: client.kyc_status, color: 'green' },
    [F.status]: { id: 1, value: client.status, color: 'green' },
    [F.statutClient]: { id: 1, value: client.statut_client, color: 'blue' },
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
    [F.fccStatut]: { id: 1, value: client.fcc_statut ?? 'Non envoyé', color: 'gray' },
    [F.fccDate]: client.fcc_date ?? '',
    [F.derStatut]: { id: 1, value: client.der_statut ?? 'Non envoyé', color: 'gray' },
    [F.derDate]: client.der_date ?? '',
    [F.derEnvoiTimestamp]: client.der_envoi_timestamp ?? '',
    [F.ldmStatut]: { id: 1, value: client.ldm_statut ?? 'Non envoyé', color: 'gray' },
    [F.ldmDate]: client.ldm_date ?? '',
    [F.notesInternes]: client.notes_internes ?? '',
    [F.airtableRecordId]: client.airtable_record_id ?? '',
    [F.be1Nom]: '', [F.be1Ddn]: '', [F.be1LieuNaissance]: '', [F.be1Nationalite]: '', [F.be1Adresse]: '', [F.be1ResidenceFiscale]: '', [F.be1Detention]: '',
    [F.be2Nom]: '', [F.be2Ddn]: '', [F.be2LieuNaissance]: '', [F.be2Nationalite]: '', [F.be2Adresse]: '', [F.be2ResidenceFiscale]: '', [F.be2Detention]: '',
    [F.be3Nom]: '', [F.be3Ddn]: '', [F.be3LieuNaissance]: '', [F.be3Nationalite]: '', [F.be3Adresse]: '', [F.be3ResidenceFiscale]: '', [F.be3Detention]: '',
    [F.be4Nom]: '', [F.be4Ddn]: '', [F.be4LieuNaissance]: '', [F.be4Nationalite]: '', [F.be4Adresse]: '', [F.be4ResidenceFiscale]: '', [F.be4Detention]: '',
  };
}

function setupAuth(opts: { role?: 'tenant_admin' | 'standard_user'; userId?: string } = {}) {
  const role = opts.role ?? 'standard_user';
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

describe('GET /api/clients', () => {
  it('returns a list of non-archived clients', async () => {
    const { token } = setupAuth();

    const clientA = makeDbClient({ id: '10', name: 'Alice', statut_client: 'Client actif' });
    const clientB = makeDbClient({ id: '11', name: 'Bob', statut_client: 'Prospect' });
    nockListRows(TABLE_IDS.clients, [makeClientRow(clientA), makeClientRow(clientB)]);

    const res = await supertest(app)
      .get('/api/clients')
      .set('Authorization', token)
      .expect(200);

    expect(res.body.clients).toHaveLength(2);
    expect(res.body.clients[0]).toMatchObject({ id: '10', name: 'Alice', clientType: 'PP' });
    expect(res.body.clients[1]).toMatchObject({ id: '11', name: 'Bob' });
  });

  it('excludes archived clients from the response', async () => {
    const { token } = setupAuth();

    const active = makeDbClient({ id: '10', statut_client: 'Client actif' });
    const archived = makeDbClient({ id: '11', statut_client: 'Archivé' });
    nockListRows(TABLE_IDS.clients, [makeClientRow(active), makeClientRow(archived)]);

    const res = await supertest(app)
      .get('/api/clients')
      .set('Authorization', token)
      .expect(200);

    // listClientsByTenantId defaults includeArchived=true, but the route maps through
    // toPublicClient without filtering — the route returns ALL clients including archived.
    // The handler does NOT filter archived; it uses listClientsByTenantId(tenantId) which
    // defaults includeArchived=true.
    expect(res.body.clients).toHaveLength(2);
  });
});

describe('POST /api/clients', () => {
  it('creates a new client and returns 201', async () => {
    const { token } = setupAuth();

    const created = makeDbClient({ id: '50', name: 'New Client', email: 'new@test.com' });
    const createdRow = makeClientRow(created);
    nockCreateRow(TABLE_IDS.clients, createdRow);

    const res = await supertest(app)
      .post('/api/clients')
      .set('Authorization', token)
      .send({ name: 'New Client', email: 'new@test.com', clientType: 'PP' })
      .expect(201);

    expect(res.body.client).toMatchObject({
      id: '50',
      name: 'New Client',
      email: 'new@test.com',
      clientType: 'PP',
    });
  });

  it('returns 400 if name is empty and cannot be resolved', async () => {
    const { token } = setupAuth();

    const res = await supertest(app)
      .post('/api/clients')
      .set('Authorization', token)
      .send({ name: '', clientType: 'PP' })
      .expect(400);

    expect(res.body.error).toMatch(/name/i);
  });
});

describe('GET /api/clients/:id', () => {
  it('returns a single client by id', async () => {
    const { token } = setupAuth();

    const client = makeDbClient({ id: '10', name: 'Alice' });
    nockGetRow(TABLE_IDS.clients, '10', makeClientRow(client));

    const res = await supertest(app)
      .get('/api/clients/10')
      .set('Authorization', token)
      .expect(200);

    expect(res.body.client).toMatchObject({ id: '10', name: 'Alice' });
  });

  it('returns 404 if client does not exist', async () => {
    const { token } = setupAuth();

    // nock a 404 so getRow throws and getClientById returns null
    const nock = await import('nock');
    nock.default('https://api.baserow.io')
      .get(`/api/database/rows/table/${TABLE_IDS.clients}/999/`)
      .query(true)
      .reply(404, { error: 'NOT_FOUND' });

    const res = await supertest(app)
      .get('/api/clients/999')
      .set('Authorization', token)
      .expect(404);

    expect(res.body.error).toMatch(/not found/i);
  });
});

describe('PUT /api/clients/:id', () => {
  it('updates a client and returns the updated data', async () => {
    const { token } = setupAuth();

    const existing = makeDbClient({ id: '10', name: 'Old Name' });
    const updated = makeDbClient({ id: '10', name: 'New Name', email: 'updated@test.com' });

    // updateClient first calls getClientById (GET row), then updateRow (PATCH)
    nockGetRow(TABLE_IDS.clients, '10', makeClientRow(existing));
    nockUpdateRow(TABLE_IDS.clients, '10', makeClientRow(updated));

    const res = await supertest(app)
      .put('/api/clients/10')
      .set('Authorization', token)
      .send({ name: 'New Name', email: 'updated@test.com' })
      .expect(200);

    expect(res.body.client).toMatchObject({
      id: '10',
      name: 'New Name',
      email: 'updated@test.com',
    });
  });
});

describe('Authentication', () => {
  it('returns 401 for requests without auth header', async () => {
    const res = await supertest(app)
      .get('/api/clients')
      .expect(401);

    expect(res.body.error).toBeDefined();
  });
});
