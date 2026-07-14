import { http, HttpResponse } from 'msw';
import type { Client } from '../../../types';

const emptyBe = { nom: null, ddn: null, lieuNaissance: null, nationalite: null, adresse: null, residenceFiscale: null, detention: null };

export const sampleClients: Client[] = [
  {
    id: '1', name: 'Jean Dupont', email: 'jean@example.com', clientType: 'PP',
    kycStatus: 'Complet', status: 'Actif', statutClient: 'Actif',
    signataire: null, gestionnaire: null, origine: null, dateEntree: '2026-01-15',
    phone: '+33600000001', phoneMobile: null, phoneHome: null, phoneOffice: null,
    address: '1 rue de Paris', postalCode: '75001', city: 'Paris', country: 'France',
    civilite: 'M.', firstName: 'Jean', lastName: 'Dupont',
    birthDate: '1985-03-15', birthPlace: 'Paris', nationality: 'Française',
    maritalStatus: 'Marié', matrimonialRegime: 'Communauté réduite aux acquêts',
    profession: 'Ingénieur', proStatus: 'Salarié', sector: 'Tech', employer: 'TechCorp',
    annualIncome: 60000, currentCharges: 1200,
    tradeName: null, legalForm: null, siren: null, nafCode: null, activity: null,
    legalRepName: null, legalRepRole: null, revenue: null, totalBalance: null,
    equity: null, taxation: null, fiscalCountry: null, capital: null,
    patrimoineImmobilier: null, patrimoineEpargne: null, patrimoineParticipations: null,
    patrimoineLiquidites: null, patrimoineAutres: null,
    fccStatut: 'Signé', fccDate: '2026-06-01', derStatut: 'Signé', derDate: '2026-05-01',
    derEnvoiTimestamp: '2026-04-28T10:00:00Z', ldmStatut: 'Signé', ldmDate: '2026-05-15',
    notesInternes: null, be1: emptyBe, be2: emptyBe, be3: emptyBe, be4: emptyBe, createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: '2', name: 'Marie Martin', email: 'marie@example.com', clientType: 'PP',
    kycStatus: 'En cours', status: 'Prospect', statutClient: 'Prospect',
    signataire: null, gestionnaire: null, origine: null, dateEntree: null,
    phone: null, phoneMobile: null, phoneHome: null, phoneOffice: null,
    address: null, postalCode: null, city: null, country: null,
    civilite: 'Mme', firstName: 'Marie', lastName: 'Martin',
    birthDate: null, birthPlace: null, nationality: null,
    maritalStatus: null, matrimonialRegime: null,
    profession: null, proStatus: null, sector: null, employer: null,
    annualIncome: null, currentCharges: null,
    tradeName: null, legalForm: null, siren: null, nafCode: null, activity: null,
    legalRepName: null, legalRepRole: null, revenue: null, totalBalance: null,
    equity: null, taxation: null, fiscalCountry: null, capital: null,
    patrimoineImmobilier: null, patrimoineEpargne: null, patrimoineParticipations: null,
    patrimoineLiquidites: null, patrimoineAutres: null,
    fccStatut: 'À envoyer', fccDate: null, derStatut: 'À envoyer', derDate: null,
    derEnvoiTimestamp: null, ldmStatut: 'À envoyer', ldmDate: null,
    notesInternes: null, be1: emptyBe, be2: emptyBe, be3: emptyBe, be4: emptyBe, createdAt: '2026-02-01T00:00:00Z',
  },
];

export const clientsHandlers = [
  http.get('/api/clients', () => {
    return HttpResponse.json({ clients: sampleClients });
  }),

  http.get('/api/clients/:clientId', ({ params }) => {
    const client = sampleClients.find((c) => c.id === params.clientId);
    if (!client) return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    return HttpResponse.json({ client });
  }),

  http.post('/api/clients', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    const newClient: Client = {
      ...sampleClients[0],
      id: '99',
      name: String(body.name ?? 'New Client'),
      email: String(body.email ?? ''),
    };
    return HttpResponse.json({ client: newClient });
  }),

  http.put('/api/clients/:clientId', async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>;
    const client = sampleClients.find((c) => c.id === params.clientId);
    if (!client) return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    return HttpResponse.json({ client: { ...client, ...body } });
  }),

  http.get('/api/clients/:clientId/timeline', () => {
    return HttpResponse.json({
      events: [
        { date: '2026-07-01', type: 'note', label: 'Note ajoutée', detail: 'Test' },
      ],
    });
  }),
];
