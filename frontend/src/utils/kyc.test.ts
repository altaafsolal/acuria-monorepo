import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import {
  ldmAvailableDate,
  ldmIsUnlocked,
  formatDateFr,
  formatDateTimeFr,
  docBadgeClass,
  docBadgeLabel,
  statutClientBadgeClass,
  isPersonneMorale,
} from './kyc';

describe('ldmAvailableDate', () => {
  it('returns null for null input', () => {
    expect(ldmAvailableDate(null)).toBeNull();
  });

  it('returns date + 2 days', () => {
    const result = ldmAvailableDate('2024-05-01');
    expect(result).toBeInstanceOf(Date);
    expect(result!.getDate()).toBe(3);
  });
});

describe('ldmIsUnlocked', () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-10T12:00:00Z'));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it('returns false for null', () => {
    expect(ldmIsUnlocked(null)).toBe(false);
  });

  it('returns true when 2+ days have passed', () => {
    expect(ldmIsUnlocked('2024-06-07')).toBe(true);
  });

  it('returns false when less than 2 days', () => {
    expect(ldmIsUnlocked('2024-06-09')).toBe(false);
  });
});

describe('formatDateFr', () => {
  it('returns — for null/undefined', () => {
    expect(formatDateFr(null)).toBe('—');
    expect(formatDateFr(undefined)).toBe('—');
  });

  it('returns a formatted string for valid date', () => {
    const result = formatDateFr('2024-05-15');
    expect(result).not.toBe('—');
    expect(typeof result).toBe('string');
  });
});

describe('formatDateTimeFr', () => {
  it('returns — for null/undefined', () => {
    expect(formatDateTimeFr(null)).toBe('—');
    expect(formatDateTimeFr(undefined)).toBe('—');
  });

  it('returns a formatted string for valid datetime', () => {
    const result = formatDateTimeFr('2024-05-15T10:30:00Z');
    expect(result).not.toBe('—');
  });
});

describe('docBadgeClass', () => {
  it('returns badge-doc-non for null/Non envoyé', () => {
    expect(docBadgeClass(null)).toBe('badge-doc-non');
    expect(docBadgeClass('Non envoyé')).toBe('badge-doc-non');
  });

  it('returns badge-doc-envoye for Envoyé and DocuSign envoyé', () => {
    expect(docBadgeClass('Envoyé')).toBe('badge-doc-envoye');
    expect(docBadgeClass('DocuSign envoyé')).toBe('badge-doc-envoye');
  });

  it('returns badge-doc-signe for Signé', () => {
    expect(docBadgeClass('Signé')).toBe('badge-doc-signe');
  });

  it('returns badge-doc-renouveler for À renouveler', () => {
    expect(docBadgeClass('À renouveler')).toBe('badge-doc-renouveler');
  });

  it('returns badge-doc-non for unknown status', () => {
    expect(docBadgeClass('other')).toBe('badge-doc-non');
  });
});

describe('docBadgeLabel', () => {
  it('returns — for null/Non envoyé', () => {
    expect(docBadgeLabel(null)).toBe('—');
    expect(docBadgeLabel('Non envoyé')).toBe('—');
  });

  it('returns correct labels', () => {
    expect(docBadgeLabel('Envoyé')).toBe('Envoyé');
    expect(docBadgeLabel('Signé')).toContain('Signé');
  });

  it('returns raw statut for unknown', () => {
    expect(docBadgeLabel('custom')).toBe('custom');
  });
});

describe('statutClientBadgeClass', () => {
  it('maps known statuts', () => {
    expect(statutClientBadgeClass('Prospect')).toBe('badge-prospect');
    expect(statutClientBadgeClass('Client actif')).toBe('badge-actif');
    expect(statutClientBadgeClass('Archivé')).toBe('badge-archive');
  });

  it('returns badge-inactif for unknown', () => {
    expect(statutClientBadgeClass('other')).toBe('badge-inactif');
    expect(statutClientBadgeClass(null)).toBe('badge-inactif');
  });
});

describe('isPersonneMorale', () => {
  it('returns true for PM', () => {
    expect(isPersonneMorale('PM')).toBe(true);
  });

  it('returns true for Personne morale', () => {
    expect(isPersonneMorale('Personne morale')).toBe(true);
  });

  it('returns false for PP', () => {
    expect(isPersonneMorale('PP')).toBe(false);
  });
});
