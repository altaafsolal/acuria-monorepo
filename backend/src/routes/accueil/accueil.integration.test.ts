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
  TABLE_IDS,
} from '../../test/helpers/nock-baserow.js';
import { BASEROW_FIELDS } from '../../../baserow/schema.js';

const FC = BASEROW_FIELDS.clients;
const FK = BASEROW_FIELDS.kycDocuments;

const TENANT_ID = '1';

function makeClientRow(client: ReturnType<typeof makeDbClient>): Record<string, unknown> {
  return {
    id: Number(client.id),
    [FC.name]: client.name,
    [FC.email]: client.email,
    [FC.clientType]: { id: 1, value: client.client_type, color: 'blue' },
    [FC.kycStatus]: { id: 1, value: client.kyc_status, color: 'green' },
    [FC.status]: { id: 1, value: client.status, color: 'green' },
    [FC.statutClient]: { id: 1, value: client.statut_client, color: 'blue' },
    [FC.signataire]: client.signataire ?? '',
    [FC.gestionnaire]: client.gestionnaire ?? '',
    [FC.origine]: client.origine ?? '',
    [FC.dateEntree]: client.date_entree ?? '',
    [FC.phone]: '', [FC.phoneMobile]: '', [FC.phoneHome]: '', [FC.phoneOffice]: '',
    [FC.address]: '', [FC.postalCode]: '', [FC.city]: '', [FC.country]: '',
    [FC.civilite]: '', [FC.firstName]: '', [FC.lastName]: '',
    [FC.birthDate]: '', [FC.birthPlace]: '', [FC.nationality]: '',
    [FC.maritalStatus]: '', [FC.matrimonialRegime]: '',
    [FC.profession]: '', [FC.proStatus]: '', [FC.sector]: '', [FC.employer]: '',
    [FC.annualIncome]: '', [FC.currentCharges]: '',
    [FC.tradeName]: '', [FC.legalForm]: '', [FC.siren]: '', [FC.nafCode]: '',
    [FC.activity]: '', [FC.legalRepName]: '', [FC.legalRepRole]: '',
    [FC.revenue]: '', [FC.totalBalance]: '', [FC.equity]: '',
    [FC.taxation]: '', [FC.fiscalCountry]: '', [FC.capital]: '',
    [FC.patrimoineImmobilier]: '', [FC.patrimoineEpargne]: '',
    [FC.patrimoineParticipations]: '', [FC.patrimoineLiquidites]: '',
    [FC.patrimoineAutres]: '',
    [FC.fccStatut]: { id: 1, value: client.fcc_statut ?? 'Non envoyé', color: 'gray' },
    [FC.fccDate]: client.fcc_date ?? '',
    [FC.derStatut]: { id: 1, value: client.der_statut ?? 'Non envoyé', color: 'gray' },
    [FC.derDate]: client.der_date ?? '',
    [FC.derEnvoiTimestamp]: client.der_envoi_timestamp ?? '',
    [FC.ldmStatut]: { id: 1, value: client.ldm_statut ?? 'Non envoyé', color: 'gray' },
    [FC.ldmDate]: client.ldm_date ?? '',
    [FC.notesInternes]: '', [FC.airtableRecordId]: '',
    [FC.be1Nom]: '', [FC.be1Ddn]: '', [FC.be1LieuNaissance]: '', [FC.be1Nationalite]: '', [FC.be1Adresse]: '', [FC.be1ResidenceFiscale]: '', [FC.be1Detention]: '',
    [FC.be2Nom]: '', [FC.be2Ddn]: '', [FC.be2LieuNaissance]: '', [FC.be2Nationalite]: '', [FC.be2Adresse]: '', [FC.be2ResidenceFiscale]: '', [FC.be2Detention]: '',
    [FC.be3Nom]: '', [FC.be3Ddn]: '', [FC.be3LieuNaissance]: '', [FC.be3Nationalite]: '', [FC.be3Adresse]: '', [FC.be3ResidenceFiscale]: '', [FC.be3Detention]: '',
    [FC.be4Nom]: '', [FC.be4Ddn]: '', [FC.be4LieuNaissance]: '', [FC.be4Nationalite]: '', [FC.be4Adresse]: '', [FC.be4ResidenceFiscale]: '', [FC.be4Detention]: '',
  };
}

function makeKycDocRow(overrides: {
  id: number;
  clientId?: string;
  docType?: string;
  dateValidite?: string;
}): Record<string, unknown> {
  return {
    id: overrides.id,
    [FK.name]: `Doc ${overrides.id}`,
    [FK.clientId]: overrides.clientId
      ? [{ id: Number(overrides.clientId), value: `Client ${overrides.clientId}` }]
      : [],
    [FK.clientIdOld]: '',
    [FK.clientNom]: '',
    [FK.docType]: overrides.docType ?? 'CNI',
    [FK.recu]: false,
    [FK.dateReception]: '',
    [FK.dateValidite]: overrides.dateValidite ?? '',
    [FK.urlDocument]: '',
    [FK.airtableRecordId]: '',
  };
}

function setupAuth(opts: { role?: 'tenant_admin' | 'standard_user' } = {}) {
  const role = opts.role ?? 'standard_user';
  const userId = '999';
  const user = makeDbUser({ id: userId, role, tenant_id: TENANT_ID });
  const userRow = makeDbUserRow(user);
  const tenant = makeTenantRecord({ id: TENANT_ID });
  const tenantRow = makeTenantRow(tenant);

  seedTableCaches(TENANT_ID);
  nockUserById(userId, userRow);
  nockTenantById(TENANT_ID, tenantRow);

  return {
    token: authHeader({ userId, role, tenantId: TENANT_ID }),
  };
}

describe('GET /api/accueil', () => {
  it('returns stats, kycTodos, and complianceTodos', async () => {
    const { token } = setupAuth();

    // Create test clients with various statuses
    const prospect = makeDbClient({ id: '10', statut_client: 'Prospect', der_statut: 'Non envoyé', fcc_statut: 'Non envoyé' });
    const actif = makeDbClient({ id: '11', statut_client: 'Client actif', der_statut: 'Envoyé', der_date: '2026-01-01', ldm_statut: 'Signé', fcc_statut: 'Signé' });
    const inactif = makeDbClient({ id: '12', statut_client: 'Inactif', der_statut: 'Envoyé', der_date: '2026-01-01', ldm_statut: 'Non envoyé', fcc_statut: 'Non envoyé' });

    nockListRows(TABLE_IDS.clients, [
      makeClientRow(prospect),
      makeClientRow(actif),
      makeClientRow(inactif),
    ]);

    // KYC doc with expired CNI for the prospect
    const expiredDate = '2020-01-01';
    nockListRows(TABLE_IDS.kycDocuments, [
      makeKycDocRow({ id: 500, clientId: '10', docType: 'CNI', dateValidite: expiredDate }),
    ]);

    const res = await supertest(app)
      .get('/api/accueil')
      .set('Authorization', token)
      .expect(200);

    // Check stats shape
    expect(res.body.stats).toBeDefined();
    expect(res.body.stats.crm).toMatchObject({
      total: 3,
      prospects: 1,
      actifs: 1,
      inactifs: 1,
    });
    expect(res.body.stats.der).toMatchObject({
      total: 3,
      aEnvoyer: 1,   // prospect has no der_statut or "Non envoyé"
      derEnvoye: 2,   // actif + inactif have "Envoyé"
      signe: 1,       // actif has ldm_statut "Signé"
    });
    expect(res.body.stats.fcc).toMatchObject({
      total: 3,
      aEnvoyer: 2,   // prospect + inactif
      signe: 1,       // actif
    });

    // KYC todos — expired CNI for prospect
    expect(res.body.kycTodos).toHaveLength(1);
    expect(res.body.kycTodos[0]).toMatchObject({
      clientId: '10',
      kind: 'kyc_doc',
    });
    expect(res.body.kycTodos[0].label).toMatch(/CNI/);

    // Compliance todos — prospect needs DER
    expect(res.body.complianceTodos.length).toBeGreaterThanOrEqual(1);
    const derTodo = res.body.complianceTodos.find((t: { id: string }) => t.id === 'der-10');
    expect(derTodo).toBeDefined();
    expect(derTodo.label).toBe('DER à envoyer');
  });

  it('returns empty arrays when there are no clients', async () => {
    const { token } = setupAuth();

    nockListRows(TABLE_IDS.clients, []);
    nockListRows(TABLE_IDS.kycDocuments, []);

    const res = await supertest(app)
      .get('/api/accueil')
      .set('Authorization', token)
      .expect(200);

    expect(res.body.stats.crm.total).toBe(0);
    expect(res.body.kycTodos).toEqual([]);
    expect(res.body.complianceTodos).toEqual([]);
  });

  it('returns 401 without auth', async () => {
    const res = await supertest(app)
      .get('/api/accueil')
      .expect(401);

    expect(res.body.error).toBeDefined();
  });
});
