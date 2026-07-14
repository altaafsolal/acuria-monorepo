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
  makeDbNote,
  makeDbTask,
  makeDbGestionnaire,
  makeDbKycDocument,
} from '../../test/helpers/fixtures.js';
import {
  seedTableCaches,
  nockUserById,
  nockTenantById,
  nockListRows,
  nockGetRow,
  nockCreateRow,
  nockUpdateRow,
  nockDeleteRow,
  TABLE_IDS,
} from '../../test/helpers/nock-baserow.js';
import { BASEROW_FIELDS } from '../../../baserow/schema.js';
import type { DbRelation } from '../../types/domain.js';

const TENANT_ID = '1';
const ADMIN_USER_ID = '100';
const STANDARD_USER_ID = '200';
const CLIENT_ID = '42';

const adminUser = makeDbUser({ id: ADMIN_USER_ID, tenant_id: TENANT_ID, role: 'tenant_admin', name: 'Admin User' });
const adminUserRow = makeDbUserRow(adminUser);

const standardUser = makeDbUser({ id: STANDARD_USER_ID, tenant_id: TENANT_ID, role: 'standard_user', name: 'Standard User' });
const standardUserRow = makeDbUserRow(standardUser);

const tenant = makeTenantRecord({ id: TENANT_ID, database_token: 'test-tenant-token' });
const tenantRow = makeTenantRow(tenant);

// ─── Row factories ─────────────────────────────────────────────────────────

function makeClientRow(client: ReturnType<typeof makeDbClient>): Record<string, unknown> {
  const F = BASEROW_FIELDS.clients;
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
    [F.fccStatut]: { id: 1, value: client.fcc_statut ?? 'À envoyer', color: 'gray' },
    [F.fccDate]: client.fcc_date ?? '',
    [F.derStatut]: { id: 1, value: client.der_statut ?? 'À envoyer', color: 'gray' },
    [F.derDate]: client.der_date ?? '',
    [F.derEnvoiTimestamp]: client.der_envoi_timestamp ?? '',
    [F.ldmStatut]: { id: 1, value: client.ldm_statut ?? 'À envoyer', color: 'gray' },
    [F.ldmDate]: client.ldm_date ?? '',
    [F.notesInternes]: client.notes_internes ?? '',
    [F.airtableRecordId]: client.airtable_record_id ?? '',
    [F.be1Nom]: '', [F.be1Ddn]: '', [F.be1LieuNaissance]: '', [F.be1Nationalite]: '', [F.be1Adresse]: '', [F.be1ResidenceFiscale]: '', [F.be1Detention]: '',
    [F.be2Nom]: '', [F.be2Ddn]: '', [F.be2LieuNaissance]: '', [F.be2Nationalite]: '', [F.be2Adresse]: '', [F.be2ResidenceFiscale]: '', [F.be2Detention]: '',
    [F.be3Nom]: '', [F.be3Ddn]: '', [F.be3LieuNaissance]: '', [F.be3Nationalite]: '', [F.be3Adresse]: '', [F.be3ResidenceFiscale]: '', [F.be3Detention]: '',
    [F.be4Nom]: '', [F.be4Ddn]: '', [F.be4LieuNaissance]: '', [F.be4Nationalite]: '', [F.be4Adresse]: '', [F.be4ResidenceFiscale]: '', [F.be4Detention]: '',
  };
}

function makeNoteRow(note: ReturnType<typeof makeDbNote>): Record<string, unknown> {
  const F = BASEROW_FIELDS.notes;
  return {
    id: Number(note.id),
    [F.name]: note.name,
    [F.clientId]: note.client_id ? [{ id: Number(note.client_id), value: `Client ${note.client_id}` }] : [],
    [F.date]: note.date ?? '',
    [F.noteType]: { id: 1, value: note.note_type, color: 'blue' },
    [F.auteur]: note.auteur ?? '',
    [F.contenu]: note.contenu ?? '',
    [F.piecesJointes]: note.pieces_jointes.length > 0 ? JSON.stringify(note.pieces_jointes) : '',
    [F.source]: note.source ?? 'Manuel',
    [F.airtableRecordId]: note.airtable_record_id ?? '',
  };
}

function makeTaskRow(task: ReturnType<typeof makeDbTask>): Record<string, unknown> {
  const F = BASEROW_FIELDS.tasks;
  return {
    id: Number(task.id),
    [F.name]: task.name,
    [F.title]: task.title,
    [F.description]: task.description ?? '',
    [F.status]: { id: 1, value: task.status, color: 'blue' },
    [F.priorite]: task.priorite ? { id: 1, value: task.priorite, color: 'blue' } : null,
    [F.assigneA]: task.assigne_a ?? '',
    [F.creePar]: task.cree_par ?? '',
    [F.dueDate]: task.due_date ?? '',
    [F.clientId]: task.client_id ? [{ id: Number(task.client_id), value: `Client ${task.client_id}` }] : [],
    [F.airtableRecordId]: task.airtable_record_id ?? '',
  };
}

function makeRelationRow(rel: DbRelation): Record<string, unknown> {
  const F = BASEROW_FIELDS.relations;
  return {
    id: Number(rel.id),
    [F.name]: rel.name,
    [F.clientAId]: rel.client_a_id ? [{ id: Number(rel.client_a_id), value: `Client ${rel.client_a_id}` }] : [],
    [F.clientBId]: rel.client_b_id ? [{ id: Number(rel.client_b_id), value: `Client ${rel.client_b_id}` }] : [],
    [F.typeRelation]: rel.type_relation ?? '',
    [F.pctDetention]: rel.pct_detention ?? null,
    [F.note]: rel.note ?? '',
    [F.airtableRecordId]: rel.airtable_record_id ?? '',
  };
}

function makeKycDocRow(doc: ReturnType<typeof makeDbKycDocument>): Record<string, unknown> {
  const F = BASEROW_FIELDS.kycDocuments;
  return {
    id: Number(doc.id),
    [F.name]: doc.name,
    [F.clientId]: doc.client_id ? [{ id: Number(doc.client_id), value: `Client ${doc.client_id}` }] : [],
    [F.clientIdOld]: doc.client_id_old ?? '',
    [F.clientNom]: doc.client_nom ?? '',
    [F.docType]: doc.doc_type,
    [F.recu]: doc.recu,
    [F.dateReception]: doc.date_reception ?? '',
    [F.dateValidite]: doc.date_validite ?? '',
    [F.urlDocument]: doc.url_document ?? '',
    [F.airtableRecordId]: doc.airtable_record_id ?? '',
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
    [F.status]: { id: 1, value: g.status, color: 'green' },
    [F.initiales]: g.initiales ?? '',
    [F.couleur]: g.couleur ?? '',
    [F.userId]: g.user_id ?? '',
    [F.airtableRecordId]: g.airtable_record_id ?? '',
  };
}

// ─── Notes ─────────────────────────────────────────────────────────────────

describe('GET /api/clients/:clientId/notes', () => {
  beforeEach(() => {
    seedTableCaches(TENANT_ID);
  });

  it('returns list of notes for the client', async () => {
    const note1 = makeDbNote({ id: '501', client_id: CLIENT_ID, note_type: 'Appel', contenu: 'First call' });
    const note2 = makeDbNote({ id: '502', client_id: CLIENT_ID, note_type: 'Email', contenu: 'Email follow-up' });

    nockUserById(ADMIN_USER_ID, adminUserRow);
    nockTenantById(TENANT_ID, tenantRow);
    nockListRows(TABLE_IDS.notes, [makeNoteRow(note1), makeNoteRow(note2)]);

    const res = await supertest(app)
      .get(`/api/clients/${CLIENT_ID}/notes`)
      .set('Authorization', authHeader({ userId: ADMIN_USER_ID, role: 'tenant_admin', tenantId: TENANT_ID }));

    expect(res.status).toBe(200);
    expect(res.body.notes).toHaveLength(2);
    expect(res.body.notes[0].id).toBe('501');
    expect(res.body.notes[0].noteType).toBe('Appel');
    expect(res.body.notes[0].contenu).toBe('First call');
    expect(res.body.notes[1].id).toBe('502');
    expect(res.body.notes[1].noteType).toBe('Email');
  });

  it('returns 401 without auth on GET notes', async () => {
    const res = await supertest(app).get(`/api/clients/${CLIENT_ID}/notes`);
    expect(res.status).toBe(401);
  });
});

describe('POST /api/clients/:clientId/notes', () => {
  beforeEach(() => {
    seedTableCaches(TENANT_ID);
  });

  it('creates a note and returns 201', async () => {
    const created = makeDbNote({
      id: '503',
      client_id: CLIENT_ID,
      note_type: 'RDV',
      auteur: 'Admin User',
      contenu: 'Meeting content',
      date: '2026-07-14',
    });

    nockUserById(ADMIN_USER_ID, adminUserRow);
    nockTenantById(TENANT_ID, tenantRow);
    nockCreateRow(TABLE_IDS.notes, makeNoteRow(created));

    const res = await supertest(app)
      .post(`/api/clients/${CLIENT_ID}/notes`)
      .set('Authorization', authHeader({ userId: ADMIN_USER_ID, role: 'tenant_admin', tenantId: TENANT_ID }))
      .send({
        noteType: 'RDV',
        auteur: 'Admin User',
        contenu: 'Meeting content',
        date: '2026-07-14',
      });

    expect(res.status).toBe(201);
    expect(res.body.note).toBeDefined();
    expect(res.body.note.id).toBe('503');
    expect(res.body.note.noteType).toBe('RDV');
    expect(res.body.note.contenu).toBe('Meeting content');
  });

  it('returns 400 when contenu is missing', async () => {
    nockUserById(ADMIN_USER_ID, adminUserRow);
    nockTenantById(TENANT_ID, tenantRow);

    const res = await supertest(app)
      .post(`/api/clients/${CLIENT_ID}/notes`)
      .set('Authorization', authHeader({ userId: ADMIN_USER_ID, role: 'tenant_admin', tenantId: TENANT_ID }))
      .send({
        noteType: 'RDV',
        auteur: 'Admin User',
        date: '2026-07-14',
        // contenu missing
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Contenu/i);
  });
});

describe('DELETE /api/clients/:clientId/notes/:noteId', () => {
  beforeEach(() => {
    seedTableCaches(TENANT_ID);
  });

  it('deletes a note and returns 204', async () => {
    nockUserById(ADMIN_USER_ID, adminUserRow);
    nockTenantById(TENANT_ID, tenantRow);
    nockDeleteRow(TABLE_IDS.notes, '501');

    const res = await supertest(app)
      .delete(`/api/clients/${CLIENT_ID}/notes/501`)
      .set('Authorization', authHeader({ userId: ADMIN_USER_ID, role: 'tenant_admin', tenantId: TENANT_ID }));

    expect(res.status).toBe(204);
  });
});

// ─── Tasks ─────────────────────────────────────────────────────────────────

describe('GET /api/clients/:clientId/tasks', () => {
  beforeEach(() => {
    seedTableCaches(TENANT_ID);
  });

  it('returns all tasks as tenant_admin', async () => {
    const task1 = makeDbTask({ id: '601', client_id: CLIENT_ID, title: 'Review docs', cree_par: 'Someone Else', assigne_a: 'Another' });
    const task2 = makeDbTask({ id: '602', client_id: CLIENT_ID, title: 'Call client', cree_par: 'Admin User', assigne_a: 'Admin User' });

    nockUserById(ADMIN_USER_ID, adminUserRow);
    nockTenantById(TENANT_ID, tenantRow);
    nockListRows(TABLE_IDS.tasks, [makeTaskRow(task1), makeTaskRow(task2)]);

    const res = await supertest(app)
      .get(`/api/clients/${CLIENT_ID}/tasks`)
      .set('Authorization', authHeader({ userId: ADMIN_USER_ID, role: 'tenant_admin', tenantId: TENANT_ID, name: 'Admin User' }));

    expect(res.status).toBe(200);
    expect(res.body.tasks).toHaveLength(2);
    expect(res.body.tasks[0].id).toBe('601');
    expect(res.body.tasks[1].id).toBe('602');
  });

  it('returns only own tasks as standard_user', async () => {
    // Task created by the standard user (should be visible)
    const ownTask = makeDbTask({ id: '603', client_id: CLIENT_ID, title: 'Own task', cree_par: 'Standard User', assigne_a: 'Someone Else' });
    // Task created by someone else and not assigned to user's gestionnaire (should be hidden)
    const otherTask = makeDbTask({ id: '604', client_id: CLIENT_ID, title: 'Other task', cree_par: 'Different Person', assigne_a: 'Different Gestionnaire' });

    const gestionnaire = makeDbGestionnaire({ id: '50', name: 'Standard Gestionnaire', user_id: STANDARD_USER_ID });

    nockUserById(STANDARD_USER_ID, standardUserRow);
    nockTenantById(TENANT_ID, tenantRow);
    nockListRows(TABLE_IDS.tasks, [makeTaskRow(ownTask), makeTaskRow(otherTask)]);
    // findGestionnaireByUserId calls listAllGestionnaires which uses listAllRows
    nockListRows(TABLE_IDS.gestionnaires, [makeGestionnaireRow(gestionnaire)]);

    const res = await supertest(app)
      .get(`/api/clients/${CLIENT_ID}/tasks`)
      .set('Authorization', authHeader({ userId: STANDARD_USER_ID, role: 'standard_user', tenantId: TENANT_ID, name: 'Standard User' }));

    expect(res.status).toBe(200);
    // Only the task where cree_par === user.name is visible
    expect(res.body.tasks).toHaveLength(1);
    expect(res.body.tasks[0].id).toBe('603');
  });

  it('returns 401 without auth on GET tasks', async () => {
    const res = await supertest(app).get(`/api/clients/${CLIENT_ID}/tasks`);
    expect(res.status).toBe(401);
  });
});

describe('POST /api/clients/:clientId/tasks', () => {
  beforeEach(() => {
    seedTableCaches(TENANT_ID);
  });

  it('creates a task and returns 201', async () => {
    const created = makeDbTask({
      id: '605',
      client_id: CLIENT_ID,
      title: 'New task',
      status: 'À faire',
      priorite: 'Normale',
      assigne_a: 'Admin User',
      cree_par: 'Admin User',
      due_date: '2026-07-20',
    });

    nockUserById(ADMIN_USER_ID, adminUserRow);
    nockTenantById(TENANT_ID, tenantRow);
    nockCreateRow(TABLE_IDS.tasks, makeTaskRow(created));

    const res = await supertest(app)
      .post(`/api/clients/${CLIENT_ID}/tasks`)
      .set('Authorization', authHeader({ userId: ADMIN_USER_ID, role: 'tenant_admin', tenantId: TENANT_ID, name: 'Admin User' }))
      .send({
        title: 'New task',
        status: 'À faire',
        priorite: 'Normale',
        assigneA: 'Admin User',
        dueDate: '2026-07-20',
      });

    expect(res.status).toBe(201);
    expect(res.body.task).toBeDefined();
    expect(res.body.task.id).toBe('605');
    expect(res.body.task.title).toBe('New task');
    expect(res.body.task.assigneA).toBe('Admin User');
  });
});

describe('PUT /api/clients/:clientId/tasks/:taskId', () => {
  beforeEach(() => {
    seedTableCaches(TENANT_ID);
  });

  it('updates a task and returns 200', async () => {
    const existing = makeDbTask({ id: '606', client_id: CLIENT_ID, title: 'Old title', cree_par: 'Admin User', assigne_a: 'Admin User' });
    const updated = makeDbTask({ id: '606', client_id: CLIENT_ID, title: 'Updated title', status: 'Fait', cree_par: 'Admin User', assigne_a: 'Admin User' });

    nockUserById(ADMIN_USER_ID, adminUserRow);
    nockTenantById(TENANT_ID, tenantRow);
    // putTask calls getTaskById (GET single row) then updateTask (PATCH)
    nockGetRow(TABLE_IDS.tasks, '606', makeTaskRow(existing));
    nockUpdateRow(TABLE_IDS.tasks, '606', makeTaskRow(updated));

    const res = await supertest(app)
      .put(`/api/clients/${CLIENT_ID}/tasks/606`)
      .set('Authorization', authHeader({ userId: ADMIN_USER_ID, role: 'tenant_admin', tenantId: TENANT_ID, name: 'Admin User' }))
      .send({ title: 'Updated title', status: 'Fait' });

    expect(res.status).toBe(200);
    expect(res.body.task).toBeDefined();
    expect(res.body.task.id).toBe('606');
    expect(res.body.task.title).toBe('Updated title');
    expect(res.body.task.status).toBe('Fait');
  });
});

describe('DELETE /api/clients/:clientId/tasks/:taskId', () => {
  beforeEach(() => {
    seedTableCaches(TENANT_ID);
  });

  it('deletes a task and returns 204', async () => {
    const existing = makeDbTask({ id: '607', client_id: CLIENT_ID, cree_par: 'Admin User', assigne_a: 'Admin User' });

    nockUserById(ADMIN_USER_ID, adminUserRow);
    nockTenantById(TENANT_ID, tenantRow);
    // deleteTask first calls getTaskById to check existence
    nockGetRow(TABLE_IDS.tasks, '607', makeTaskRow(existing));
    nockDeleteRow(TABLE_IDS.tasks, '607');

    const res = await supertest(app)
      .delete(`/api/clients/${CLIENT_ID}/tasks/607`)
      .set('Authorization', authHeader({ userId: ADMIN_USER_ID, role: 'tenant_admin', tenantId: TENANT_ID, name: 'Admin User' }));

    expect(res.status).toBe(204);
  });
});

// ─── Relations ─────────────────────────────────────────────────────────────

describe('GET /api/clients/:clientId/relations', () => {
  beforeEach(() => {
    seedTableCaches(TENANT_ID);
  });

  it('returns enriched relations with clientAName and clientBName', async () => {
    const clientA = makeDbClient({ id: CLIENT_ID, name: 'Alice Dupont' });
    const clientB = makeDbClient({ id: '99', name: 'Bob Martin' });

    const relation: DbRelation = {
      id: '700',
      name: 'Associé',
      client_a_id: CLIENT_ID,
      client_b_id: '99',
      client_a_name: null,
      client_b_name: null,
      type_relation: 'Associé',
      pct_detention: 50,
      note: null,
      airtable_record_id: null,
    };

    nockUserById(ADMIN_USER_ID, adminUserRow);
    nockTenantById(TENANT_ID, tenantRow);
    nockListRows(TABLE_IDS.relations, [makeRelationRow(relation)]);
    // enrichRelation calls getClientById for both clientA and clientB
    nockGetRow(TABLE_IDS.clients, CLIENT_ID, makeClientRow(clientA));
    nockGetRow(TABLE_IDS.clients, '99', makeClientRow(clientB));

    const res = await supertest(app)
      .get(`/api/clients/${CLIENT_ID}/relations`)
      .set('Authorization', authHeader({ userId: ADMIN_USER_ID, role: 'tenant_admin', tenantId: TENANT_ID }));

    expect(res.status).toBe(200);
    expect(res.body.relations).toHaveLength(1);
    expect(res.body.relations[0].id).toBe('700');
    expect(res.body.relations[0].clientAId).toBe(CLIENT_ID);
    expect(res.body.relations[0].clientBId).toBe('99');
    expect(res.body.relations[0].clientAName).toBe('Alice Dupont');
    expect(res.body.relations[0].clientBName).toBe('Bob Martin');
    expect(res.body.relations[0].typeRelation).toBe('Associé');
    expect(res.body.relations[0].pctDetention).toBe(50);
  });

  it('returns 401 without auth on GET relations', async () => {
    const res = await supertest(app).get(`/api/clients/${CLIENT_ID}/relations`);
    expect(res.status).toBe(401);
  });
});

describe('POST /api/clients/:clientId/relations', () => {
  beforeEach(() => {
    seedTableCaches(TENANT_ID);
  });

  it('creates a relation and returns 201', async () => {
    const clientA = makeDbClient({ id: CLIENT_ID, name: 'Alice Dupont' });
    const clientB = makeDbClient({ id: '99', name: 'Bob Martin' });

    const created: DbRelation = {
      id: '701',
      name: 'Époux',
      client_a_id: CLIENT_ID,
      client_b_id: '99',
      client_a_name: null,
      client_b_name: null,
      type_relation: 'Époux',
      pct_detention: null,
      note: null,
      airtable_record_id: null,
    };

    nockUserById(ADMIN_USER_ID, adminUserRow);
    nockTenantById(TENANT_ID, tenantRow);
    nockCreateRow(TABLE_IDS.relations, makeRelationRow(created));
    // enrichRelation after createRelation also looks up both clients
    nockGetRow(TABLE_IDS.clients, CLIENT_ID, makeClientRow(clientA));
    nockGetRow(TABLE_IDS.clients, '99', makeClientRow(clientB));

    const res = await supertest(app)
      .post(`/api/clients/${CLIENT_ID}/relations`)
      .set('Authorization', authHeader({ userId: ADMIN_USER_ID, role: 'tenant_admin', tenantId: TENANT_ID }))
      .send({ clientBId: '99', typeRelation: 'Époux' });

    expect(res.status).toBe(201);
    expect(res.body.relation).toBeDefined();
    expect(res.body.relation.id).toBe('701');
    expect(res.body.relation.typeRelation).toBe('Époux');
    expect(res.body.relation.clientAName).toBe('Alice Dupont');
    expect(res.body.relation.clientBName).toBe('Bob Martin');
  });
});

describe('DELETE /api/clients/:clientId/relations/:relationId', () => {
  beforeEach(() => {
    seedTableCaches(TENANT_ID);
  });

  it('deletes a relation and returns 204', async () => {
    nockUserById(ADMIN_USER_ID, adminUserRow);
    nockTenantById(TENANT_ID, tenantRow);
    nockDeleteRow(TABLE_IDS.relations, '700');

    const res = await supertest(app)
      .delete(`/api/clients/${CLIENT_ID}/relations/700`)
      .set('Authorization', authHeader({ userId: ADMIN_USER_ID, role: 'tenant_admin', tenantId: TENANT_ID }));

    expect(res.status).toBe(204);
  });
});

// ─── KYC Documents ─────────────────────────────────────────────────────────

describe('GET /api/clients/:clientId/kyc-documents', () => {
  beforeEach(() => {
    seedTableCaches(TENANT_ID);
  });

  it('returns list of kyc documents for the client', async () => {
    const doc1 = makeDbKycDocument({ id: '800', client_id: CLIENT_ID, doc_type: 'CNI', recu: true });
    const doc2 = makeDbKycDocument({ id: '801', client_id: CLIENT_ID, doc_type: 'Justificatif de domicile', recu: false });

    nockUserById(ADMIN_USER_ID, adminUserRow);
    nockTenantById(TENANT_ID, tenantRow);
    nockListRows(TABLE_IDS.kycDocuments, [makeKycDocRow(doc1), makeKycDocRow(doc2)]);

    const res = await supertest(app)
      .get(`/api/clients/${CLIENT_ID}/kyc-documents`)
      .set('Authorization', authHeader({ userId: ADMIN_USER_ID, role: 'tenant_admin', tenantId: TENANT_ID }));

    expect(res.status).toBe(200);
    expect(res.body.documents).toHaveLength(2);
    expect(res.body.documents[0].id).toBe('800');
    expect(res.body.documents[0].docType).toBe('CNI');
    expect(res.body.documents[0].recu).toBe(true);
    expect(res.body.documents[1].id).toBe('801');
    expect(res.body.documents[1].recu).toBe(false);
  });

  it('returns 401 without auth on GET kyc-documents', async () => {
    const res = await supertest(app).get(`/api/clients/${CLIENT_ID}/kyc-documents`);
    expect(res.status).toBe(401);
  });
});

describe('POST /api/clients/:clientId/kyc-documents', () => {
  beforeEach(() => {
    seedTableCaches(TENANT_ID);
  });

  it('creates a kyc document and returns 201', async () => {
    const created = makeDbKycDocument({
      id: '802',
      client_id: CLIENT_ID,
      doc_type: 'Passport',
      recu: false,
    });

    nockUserById(ADMIN_USER_ID, adminUserRow);
    nockTenantById(TENANT_ID, tenantRow);
    nockCreateRow(TABLE_IDS.kycDocuments, makeKycDocRow(created));

    const res = await supertest(app)
      .post(`/api/clients/${CLIENT_ID}/kyc-documents`)
      .set('Authorization', authHeader({ userId: ADMIN_USER_ID, role: 'tenant_admin', tenantId: TENANT_ID }))
      .send({ docType: 'Passport', recu: false });

    expect(res.status).toBe(201);
    expect(res.body.document).toBeDefined();
    expect(res.body.document.id).toBe('802');
    expect(res.body.document.docType).toBe('Passport');
    expect(res.body.document.recu).toBe(false);
  });
});

describe('PUT /api/clients/:clientId/kyc-documents/:documentId', () => {
  beforeEach(() => {
    seedTableCaches(TENANT_ID);
  });

  it('updates recu to true and returns 200', async () => {
    const existing = makeDbKycDocument({ id: '803', client_id: CLIENT_ID, doc_type: 'CNI', recu: false });
    const updated = makeDbKycDocument({ id: '803', client_id: CLIENT_ID, doc_type: 'CNI', recu: true });

    nockUserById(ADMIN_USER_ID, adminUserRow);
    nockTenantById(TENANT_ID, tenantRow);
    // putKycDocument calls getKycDocumentById first
    nockGetRow(TABLE_IDS.kycDocuments, '803', makeKycDocRow(existing));
    nockUpdateRow(TABLE_IDS.kycDocuments, '803', makeKycDocRow(updated));

    const res = await supertest(app)
      .put(`/api/clients/${CLIENT_ID}/kyc-documents/803`)
      .set('Authorization', authHeader({ userId: ADMIN_USER_ID, role: 'tenant_admin', tenantId: TENANT_ID }))
      .send({ recu: true });

    expect(res.status).toBe(200);
    expect(res.body.document).toBeDefined();
    expect(res.body.document.id).toBe('803');
    expect(res.body.document.recu).toBe(true);
  });

  it('returns 404 when document not found', async () => {
    nockUserById(ADMIN_USER_ID, adminUserRow);
    nockTenantById(TENANT_ID, tenantRow);

    // Simulate a 404 from Baserow so getKycDocumentById returns null
    const nockLib = await import('nock');
    nockLib.default('https://api.baserow.io')
      .get(`/api/database/rows/table/${TABLE_IDS.kycDocuments}/9999/`)
      .query(true)
      .reply(404, { error: 'NOT_FOUND' });

    const res = await supertest(app)
      .put(`/api/clients/${CLIENT_ID}/kyc-documents/9999`)
      .set('Authorization', authHeader({ userId: ADMIN_USER_ID, role: 'tenant_admin', tenantId: TENANT_ID }))
      .send({ recu: true });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });
});

// ─── Timeline ──────────────────────────────────────────────────────────────

describe('GET /api/clients/:id/timeline', () => {
  beforeEach(() => {
    seedTableCaches(TENANT_ID);
  });

  it('returns sorted timeline events for tenant_admin', async () => {
    const client = makeDbClient({
      id: CLIENT_ID,
      name: 'Alice',
      date_entree: '2026-01-01',
      der_date: '2026-03-15',
      der_statut: 'Signé',
      fcc_date: '2026-06-01',
      fcc_statut: 'Signé',
      ldm_date: null,
    });
    const note = makeDbNote({ id: '900', client_id: CLIENT_ID, date: '2026-05-10', note_type: 'Appel', auteur: 'Admin User', contenu: 'Called client' });
    const task = makeDbTask({ id: '901', client_id: CLIENT_ID, title: 'Follow-up', due_date: '2026-04-20', status: 'Fait', assigne_a: 'Admin User' });

    nockUserById(ADMIN_USER_ID, adminUserRow);
    nockTenantById(TENANT_ID, tenantRow);
    // getClientById
    nockGetRow(TABLE_IDS.clients, CLIENT_ID, makeClientRow(client));
    // listNotesByClient
    nockListRows(TABLE_IDS.notes, [makeNoteRow(note)]);
    // listTasksByClient AND listDbTasksByClientId each make their own Baserow list call
    nockListRows(TABLE_IDS.tasks, [makeTaskRow(task)], { times: 2 });

    const res = await supertest(app)
      .get(`/api/clients/${CLIENT_ID}/timeline`)
      .set('Authorization', authHeader({ userId: ADMIN_USER_ID, role: 'tenant_admin', tenantId: TENANT_ID }));

    expect(res.status).toBe(200);
    expect(res.body.events).toBeDefined();
    expect(Array.isArray(res.body.events)).toBe(true);

    // Should contain events from client dates + notes + tasks
    const types = res.body.events.map((e: { type: string }) => e.type);
    expect(types).toContain('client');
    expect(types).toContain('der');
    expect(types).toContain('fcc');
    expect(types).toContain('note');
    expect(types).toContain('task');

    // Events should be sorted descending by date
    const dates = res.body.events.map((e: { date: string }) => new Date(e.date).getTime());
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i]).toBeLessThanOrEqual(dates[i - 1]);
    }
  });

  it('returns empty events array when client not found', async () => {
    nockUserById(ADMIN_USER_ID, adminUserRow);
    nockTenantById(TENANT_ID, tenantRow);

    // Simulate 404 so getClientById returns null
    const nockLib = await import('nock');
    nockLib.default('https://api.baserow.io')
      .get(`/api/database/rows/table/${TABLE_IDS.clients}/9999/`)
      .query(true)
      .reply(404, { error: 'NOT_FOUND' });

    const res = await supertest(app)
      .get('/api/clients/9999/timeline')
      .set('Authorization', authHeader({ userId: ADMIN_USER_ID, role: 'tenant_admin', tenantId: TENANT_ID }));

    expect(res.status).toBe(200);
    expect(res.body.events).toEqual([]);
  });

  it('returns only visible tasks for standard_user on timeline', async () => {
    const client = makeDbClient({ id: CLIENT_ID, name: 'Alice', date_entree: '2026-01-01' });
    // Task created by standard user → visible
    const ownTask = makeDbTask({ id: '902', client_id: CLIENT_ID, title: 'Own task', due_date: '2026-07-01', status: 'À faire', cree_par: 'Standard User', assigne_a: 'Someone' });
    // Task created by someone else → hidden
    const otherTask = makeDbTask({ id: '903', client_id: CLIENT_ID, title: 'Other task', due_date: '2026-07-02', status: 'À faire', cree_par: 'Someone Else', assigne_a: 'Someone Else' });

    const gestionnaire = makeDbGestionnaire({ id: '51', name: 'Standard Gestionnaire', user_id: STANDARD_USER_ID });

    nockUserById(STANDARD_USER_ID, standardUserRow);
    nockTenantById(TENANT_ID, tenantRow);
    // getClientById
    nockGetRow(TABLE_IDS.clients, CLIENT_ID, makeClientRow(client));
    // listNotesByClient
    nockListRows(TABLE_IDS.notes, []);
    // listTasksByClient AND listDbTasksByClientId
    nockListRows(TABLE_IDS.tasks, [makeTaskRow(ownTask), makeTaskRow(otherTask)], { times: 2 });
    // findGestionnaireByUserId
    nockListRows(TABLE_IDS.gestionnaires, [makeGestionnaireRow(gestionnaire)]);

    const res = await supertest(app)
      .get(`/api/clients/${CLIENT_ID}/timeline`)
      .set('Authorization', authHeader({ userId: STANDARD_USER_ID, role: 'standard_user', tenantId: TENANT_ID, name: 'Standard User' }));

    expect(res.status).toBe(200);
    const taskEvents = res.body.events.filter((e: { type: string }) => e.type === 'task');
    expect(taskEvents).toHaveLength(1);
    expect(taskEvents[0].label).toContain('Own task');
  });

  it('returns 401 without auth on GET timeline', async () => {
    const res = await supertest(app).get(`/api/clients/${CLIENT_ID}/timeline`);
    expect(res.status).toBe(401);
  });
});
