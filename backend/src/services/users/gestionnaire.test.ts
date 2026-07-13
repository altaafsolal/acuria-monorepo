import { describe, it, expect, vi } from 'vitest';

vi.mock('../baserow/index.js', () => ({
  usersRepo: { normalizeUserEmail: (e: string) => e?.toLowerCase().trim() || '' },
}));
vi.mock('../baserow/gestionnaires.js', () => ({}));

import type { DbGestionnaire, GestionnaireUserInput } from '../../types/domain.js';
import { buildGestionnaireName, toGestionnaireUserInput } from './gestionnaire.js';

describe('buildGestionnaireName', () => {
  it('joins firstName and lastName when both present', () => {
    const input: GestionnaireUserInput = { firstName: 'Jean', lastName: 'Dupont' };
    expect(buildGestionnaireName(input, 'Fallback')).toBe('Jean Dupont');
  });

  it('returns only firstName when lastName is missing', () => {
    const input: GestionnaireUserInput = { firstName: 'Jean' };
    expect(buildGestionnaireName(input, 'Fallback')).toBe('Jean');
  });

  it('returns trimmed fallbackName when neither part is present', () => {
    const input: GestionnaireUserInput = {};
    expect(buildGestionnaireName(input, '  Fallback Name  ')).toBe('Fallback Name');
  });
});

describe('toGestionnaireUserInput', () => {
  it('returns null for null input', () => {
    expect(toGestionnaireUserInput(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(toGestionnaireUserInput(undefined)).toBeNull();
  });

  it('maps a full gestionnaire to GestionnaireUserInput with defaults', () => {
    const gestionnaire: DbGestionnaire = {
      id: '1',
      name: 'Jean Dupont',
      first_name: 'Jean',
      last_name: 'Dupont',
      email: 'jean@example.com',
      phone: '+33612345678',
      role: 'Conseiller',
      status: 'Actif',
      peut_signer_docusign: true,
      initiales: 'JD',
      couleur: '#FF0000',
      user_id: null,
      airtable_record_id: null,
    };

    const result = toGestionnaireUserInput(gestionnaire);
    expect(result).toEqual({
      firstName: 'Jean',
      lastName: 'Dupont',
      email: 'jean@example.com',
      phone: '+33612345678',
      role: 'Conseiller',
      status: 'Actif',
      peutSignerDocusign: true,
      initiales: 'JD',
      couleur: '#FF0000',
    });
  });

  it('uses default values for null/undefined fields', () => {
    const gestionnaire: DbGestionnaire = {
      id: '2',
      name: 'Test',
      first_name: null,
      last_name: null,
      email: '',
      phone: null,
      role: null,
      status: '',
      peut_signer_docusign: false,
      initiales: null,
      couleur: null,
      user_id: null,
      airtable_record_id: null,
    };

    const result = toGestionnaireUserInput(gestionnaire);
    expect(result).toEqual({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: '',
      status: 'Actif',
      peutSignerDocusign: false,
      initiales: '',
      couleur: '',
    });
  });
});
