import { describe, it, expect } from 'vitest';
import {
  gestionnaireFromResponse,
  buildUserNameFromGestionnaire,
  hasUserEmail,
  EMPTY_GESTIONNAIRE_FORM,
} from './user';

describe('gestionnaireFromResponse', () => {
  it('splits user name into firstName/lastName when no gestionnaire', () => {
    const result = gestionnaireFromResponse(null, { name: 'Jean Dupont', email: 'jean@test.com' });
    expect(result.firstName).toBe('Jean');
    expect(result.lastName).toBe('Dupont');
    expect(result.email).toBe('jean@test.com');
  });

  it('handles user with only first name', () => {
    const result = gestionnaireFromResponse(undefined, { name: 'Jean', email: '' });
    expect(result.firstName).toBe('Jean');
    expect(result.lastName).toBe('');
  });

  it('uses gestionnaire fields when provided', () => {
    const gestionnaire = {
      id: 'g1',
      name: 'Test',
      firstName: 'Marie',
      lastName: 'Martin',
      email: 'marie@test.com',
      phone: '0612345678',
      role: 'CGP',
      status: 'Actif' as const,
      peutSignerDocusign: true,
      initiales: 'MM',
      couleur: '#FF0000',
      userId: null,
    };
    const result = gestionnaireFromResponse(gestionnaire);
    expect(result.firstName).toBe('Marie');
    expect(result.lastName).toBe('Martin');
    expect(result.email).toBe('marie@test.com');
    expect(result.peutSignerDocusign).toBe(true);
  });

  it('falls back to user email when gestionnaire has no email', () => {
    const gestionnaire = {
      id: 'g1', name: 'Test', firstName: 'A', lastName: 'B',
      email: '', phone: '', role: '', status: 'Actif' as const,
      peutSignerDocusign: false, initiales: '', couleur: '', userId: null,
    };
    const result = gestionnaireFromResponse(gestionnaire, { name: 'X', email: 'fallback@test.com' });
    expect(result.email).toBe('fallback@test.com');
  });

  it('returns defaults when both are missing', () => {
    const result = gestionnaireFromResponse();
    expect(result.firstName).toBe('');
    expect(result.lastName).toBe('');
    expect(result.email).toBe('');
  });
});

describe('buildUserNameFromGestionnaire', () => {
  it('joins firstName and lastName', () => {
    expect(buildUserNameFromGestionnaire({ firstName: 'Jean', lastName: 'Dupont' })).toBe('Jean Dupont');
  });

  it('returns only firstName when lastName is empty', () => {
    expect(buildUserNameFromGestionnaire({ firstName: 'Jean', lastName: '' })).toBe('Jean');
  });

  it('returns fallback when both are empty', () => {
    expect(buildUserNameFromGestionnaire({ firstName: '', lastName: '' }, 'Fallback')).toBe('Fallback');
  });

  it('trims parts', () => {
    expect(buildUserNameFromGestionnaire({ firstName: '  Jean  ', lastName: '  Dupont  ' })).toBe('Jean Dupont');
  });
});

describe('hasUserEmail', () => {
  it('returns true for valid email', () => {
    expect(hasUserEmail('user@example.com')).toBe(true);
  });

  it('returns false for null/undefined/whitespace', () => {
    expect(hasUserEmail(null)).toBe(false);
    expect(hasUserEmail(undefined)).toBe(false);
    expect(hasUserEmail('   ')).toBe(false);
  });
});

describe('EMPTY_GESTIONNAIRE_FORM', () => {
  it('has all fields with defaults', () => {
    expect(EMPTY_GESTIONNAIRE_FORM.firstName).toBe('');
    expect(EMPTY_GESTIONNAIRE_FORM.status).toBe('Actif');
    expect(EMPTY_GESTIONNAIRE_FORM.peutSignerDocusign).toBe(false);
  });
});
