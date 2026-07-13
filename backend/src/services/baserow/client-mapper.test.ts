import { describe, it, expect } from 'vitest';
import type { DbClient } from '../../types/domain.js';
import { resolveClientDisplayName, isClientArchived, excludeArchived } from './client-mapper.js';

const makeClient = (overrides: Partial<DbClient> = {}): DbClient => ({
  id: '1', name: '', email: '', client_type: 'PP', kyc_status: 'pending', status: 'prospect', statut_client: 'Prospect',
  signataire: null, gestionnaire: null, origine: null, date_entree: null, phone: null, phone_mobile: null, phone_home: null, phone_office: null,
  address: null, postal_code: null, city: null, country: null, civilite: null, first_name: null, last_name: null,
  birth_date: null, birth_place: null, nationality: null, marital_status: null, matrimonial_regime: null,
  profession: null, pro_status: null, sector: null, employer: null, annual_income: null, current_charges: null,
  trade_name: null, legal_form: null, siren: null, naf_code: null, activity: null, legal_rep_name: null, legal_rep_role: null,
  revenue: null, total_balance: null, equity: null, taxation: null, fiscal_country: null, capital: null,
  patrimoine_immobilier: null, patrimoine_epargne: null, patrimoine_participations: null, patrimoine_liquidites: null, patrimoine_autres: null,
  fcc_statut: 'Non envoyé', fcc_date: null, der_statut: 'Non envoyé', der_date: null, der_envoi_timestamp: null,
  ldm_statut: 'Non envoyé', ldm_date: null, notes_internes: null, airtable_record_id: null,
  be1_nom: null, be1_ddn: null, be1_lieu_naissance: null, be1_nationalite: null, be1_adresse: null, be1_residence_fiscale: null, be1_detention: null,
  be2_nom: null, be2_ddn: null, be2_lieu_naissance: null, be2_nationalite: null, be2_adresse: null, be2_residence_fiscale: null, be2_detention: null,
  be3_nom: null, be3_ddn: null, be3_lieu_naissance: null, be3_nationalite: null, be3_adresse: null, be3_residence_fiscale: null, be3_detention: null,
  be4_nom: null, be4_ddn: null, be4_lieu_naissance: null, be4_nationalite: null, be4_adresse: null, be4_residence_fiscale: null, be4_detention: null,
  ...overrides,
});

describe('resolveClientDisplayName', () => {
  it('returns trimmed name when client has a name', () => {
    expect(resolveClientDisplayName(makeClient({ name: '  Acme Corp  ' }))).toBe('Acme Corp');
  });

  it('returns trade_name for PM client with no name', () => {
    expect(resolveClientDisplayName(makeClient({ client_type: 'PM', trade_name: 'SAS Exemple' }))).toBe('SAS Exemple');
  });

  it('returns assembled parts for PP client with no name', () => {
    const client = makeClient({ civilite: 'M.', first_name: 'Jean', last_name: 'Dupont' });
    expect(resolveClientDisplayName(client)).toBe('M. Jean DUPONT');
  });

  it('returns empty string when all fields are empty', () => {
    expect(resolveClientDisplayName(makeClient())).toBe('');
  });
});

describe('isClientArchived', () => {
  it('returns true when statut_client is "Archivé"', () => {
    expect(isClientArchived(makeClient({ statut_client: 'Archivé' }))).toBe(true);
  });

  it('returns true when status is "archived"', () => {
    expect(isClientArchived(makeClient({ status: 'archived' }))).toBe(true);
  });

  it('returns false when neither field indicates archived', () => {
    expect(isClientArchived(makeClient())).toBe(false);
  });
});

describe('excludeArchived', () => {
  it('filters out archived clients', () => {
    const clients = [
      makeClient({ id: '1', statut_client: 'Prospect' }),
      makeClient({ id: '2', statut_client: 'Archivé' }),
      makeClient({ id: '3', status: 'archived' }),
      makeClient({ id: '4', statut_client: 'Client' }),
    ];
    const result = excludeArchived(clients);
    expect(result).toHaveLength(2);
    expect(result.map((c) => c.id)).toEqual(['1', '4']);
  });
});
