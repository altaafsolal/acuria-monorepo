import { http, HttpResponse } from 'msw';
import type { AccueilResponse } from '../../../types';

export const sampleAccueilData: AccueilResponse = {
  stats: {
    crm: { total: 35, prospects: 5, actifs: 25, inactifs: 5 },
    der: { total: 30, aEnvoyer: 5, derEnvoye: 10, ldmEnvoye: 5, signe: 10 },
    fcc: { total: 30, aEnvoyer: 8, envoye: 7, signe: 12, renouveler: 3 },
  },
  kycTodos: [
    { id: 'kyc-1', clientId: '1', clientName: 'Jean Dupont', label: 'CNI expirée', priority: 1, kind: 'kyc_doc' },
    { id: 'kyc-2', clientId: '2', clientName: 'Marie Martin', label: 'Justificatif domicile manquant', priority: 2, kind: 'kyc_doc' },
  ],
  complianceTodos: [
    { id: 'comp-1', clientId: '1', clientName: 'Jean Dupont', label: 'DER à envoyer', priority: 1, kind: 'compliance' },
  ],
};

export const accueilHandlers = [
  http.get('/api/accueil', () => {
    return HttpResponse.json(sampleAccueilData);
  }),

  http.get('/api/tenant/branding', () => {
    return HttpResponse.json({
      name: 'NM Prime',
      orias: '12345678',
      accent: '#3B82F6',
      hasLogo: false,
      logoDataUrl: null,
    });
  }),

  http.get('/api/tenant/stats', () => {
    return HttpResponse.json({
      tenants: { total: 1, active: 1, inactive: 0 },
      users: { total: 3, active: 3, inactive: 0 },
      clients: { total: 35, active: 30, inactive: 5 },
      tenant: {
        id: '1', name: 'NM Prime', slug: 'nm-prime', status: 'active',
        createdAt: '2026-01-01T00:00:00Z', updatedAt: null,
      },
    });
  }),

  http.get('/api/gestionnaires', () => {
    return HttpResponse.json({
      gestionnaires: [
        {
          id: '1', name: 'Jean Dupont', firstName: 'Jean', lastName: 'Dupont',
          email: 'jean@cabinet.com', phone: null, role: 'Gestionnaire',
          peutSignerDocusign: true, status: 'Actif', initiales: 'JD', couleur: '#3B82F6', userId: null,
        },
      ],
    });
  }),
];
