import { describe, it, expect, vi } from 'vitest';

vi.mock('../baserow/index.js', () => ({
  usersRepo: { normalizeUserEmail: (e: string) => e?.toLowerCase().trim() || '' },
}));
vi.mock('../baserow/gestionnaires.js', () => ({}));

import type { GestionnaireUserInput } from '../../types/domain.js';
import { buildGestionnaireName } from './gestionnaire.js';

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
