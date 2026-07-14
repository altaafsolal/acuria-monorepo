import type { User, Client, Tenant } from '../../types';

const emptyBe = { nom: null, ddn: null, lieuNaissance: null, nationalite: null, adresse: null, residenceFiscale: null, detention: null };

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: '999',
    email: 'test@example.com',
    name: 'Test User',
    role: 'standard_user',
    tenantId: '1',
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: null,
    ...overrides,
  };
}

export function makeTenantAdmin(overrides: Partial<User> = {}): User {
  return makeUser({ id: '888', email: 'admin@example.com', name: 'Admin User', role: 'tenant_admin', ...overrides });
}

export function makeSuperAdmin(overrides: Partial<User> = {}): User {
  return makeUser({ id: '777', email: 'super@example.com', name: 'Super Admin', role: 'super_admin', tenantId: null, ...overrides });
}

export function makeClient(overrides: Partial<Client> = {}): Client {
  return {
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
    fccStatut: 'À envoyer', fccDate: null, derStatut: 'À envoyer', derDate: null,
    derEnvoiTimestamp: null, ldmStatut: 'À envoyer', ldmDate: null,
    notesInternes: null, be1: emptyBe, be2: emptyBe, be3: emptyBe, be4: emptyBe,
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

export function makeTenant(overrides: Partial<Tenant> = {}): Tenant {
  return {
    id: '1', name: 'NM Prime', slug: 'nm-prime', status: 'active',
    createdAt: '2026-01-01T00:00:00Z', updatedAt: null,
    userCount: 3, clientCount: 25,
    brandingName: 'NM Prime', brandingOrias: '12345678',
    brandingAccent: '#3B82F6', hasBrandingLogo: false,
    ...overrides,
  };
}
