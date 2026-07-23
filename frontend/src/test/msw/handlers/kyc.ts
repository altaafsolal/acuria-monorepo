import { http, HttpResponse } from 'msw';
import type { Client, FccClient, Gestionnaire } from '../../../types';

const emptyBe = { nom: null, ddn: null, lieuNaissance: null, nationalite: null, adresse: null, residenceFiscale: null, detention: null };

export const sampleDerClients: Client[] = [
  {
    id: '1', name: 'Jean Dupont', email: 'jean@example.com', clientType: 'PP',
    kycStatus: 'Complet', status: 'Actif', statutClient: 'Actif',
    signataire: null, gestionnaire: null, origine: null, dateEntree: null,
    phone: null, phoneMobile: null, phoneHome: null, phoneOffice: null,
    address: null, postalCode: null, city: null, country: null,
    civilite: null, firstName: 'Jean', lastName: 'Dupont',
    birthDate: null, birthPlace: null, nationality: null,
    maritalStatus: null, matrimonialRegime: null,
    profession: null, proStatus: null, sector: null, employer: null,
    annualIncome: null, currentCharges: null,
    tradeName: null, legalForm: null, siren: null, nafCode: null, activity: null,
    legalRepName: null, legalRepRole: null, revenue: null, totalBalance: null,
    equity: null, taxation: null, fiscalCountry: null, capital: null,
    patrimoineImmobilier: null, patrimoineEpargne: null, patrimoineParticipations: null,
    patrimoineLiquidites: null, patrimoineAutres: null,
    fccStatut: 'À envoyer', fccDate: null,
    derStatut: 'À envoyer', derDate: null, derEnvoiTimestamp: null,
    ldmStatut: 'À envoyer', ldmDate: null,
    notesInternes: null, be1: emptyBe, be2: emptyBe, be3: emptyBe, be4: emptyBe,
    createdAt: '2026-01-01T00:00:00Z',
  },
];

export const sampleSignataires: Gestionnaire[] = [
  {
    id: '1', name: 'Jean Dupont', firstName: 'Jean', lastName: 'Dupont',
    email: 'jean@cabinet.com', phone: null, role: 'Gestionnaire',
    peutSignerDocusign: true, status: 'Actif', initiales: 'JD', userId: null,
  },
];

export const sampleFccClients: FccClient[] = [
  {
    id: '1', clientId: '1',
    profilRisque: 'Prudent', profilConnaissance: 'Débutant',
    scoreConnaissance: 10, scoreRisque: 5,
    docusignEnvelopeId: null, docusignSentAt: null, notesNm: null,
    typeFormulaire: 'PP', idFormulaire: null,
    dateSoumission: '2026-07-01', statutDossier: 'En attente',
    client: 'Jean Dupont', email: 'jean@example.com',
    telephone: null, ville: null, profession: null, scoreTotal: 15,
    sharepointFileUrl: null, sharepointFileId: null, ipClient: null,
    pdfFilename: null, boAgent: null,
  },
];

export const kycHandlers = [
  http.get('/api/kyc/der', () => {
    return HttpResponse.json({ clients: sampleDerClients });
  }),

  http.get('/api/kyc/fcc', () => {
    return HttpResponse.json({ clients: sampleDerClients });
  }),

  http.get('/api/kyc/signataires', () => {
    return HttpResponse.json({ signataires: sampleSignataires });
  }),

  http.post('/api/kyc/der/send', () => {
    return HttpResponse.json({ message: 'DER envoyé' });
  }),

  http.post('/api/kyc/der/docusign', () => {
    return HttpResponse.json({ message: 'DocuSign envoyé' });
  }),

  http.post('/api/kyc/ldm/send', () => {
    return HttpResponse.json({ message: 'LdM envoyée' });
  }),

  http.post('/api/kyc/fcc/send', () => {
    return HttpResponse.json({
      client: sampleDerClients[0],
      link: 'https://form.example.com/fcc?token=abc',
    });
  }),

  http.post('/api/kyc/fcc/docusign', () => {
    return HttpResponse.json({ message: 'FCC DocuSign envoyé' });
  }),

  http.get('/api/fcc/history', () => {
    return HttpResponse.json({ fccClients: sampleFccClients });
  }),

  http.post('/api/fcc/quick-validate', () => {
    return HttpResponse.json({ message: 'Validé' });
  }),
];
