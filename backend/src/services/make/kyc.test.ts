import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

vi.mock('../../config/env.js', () => ({ env: {} }));
vi.mock('./http.js', () => ({ webhookUrl: () => '', postWebhook: async () => ({}) }));

import { ldmAvailableDate, ldmIsUnlocked, derIsSent } from './kyc.js';

describe('ldmAvailableDate', () => {
  it('returns null when derDate is null', () => {
    expect(ldmAvailableDate(null)).toBeNull();
  });

  it('returns date + 2 days for a valid date', () => {
    const result = ldmAvailableDate('2024-06-08');
    expect(result).toBeInstanceOf(Date);
    expect(result!.getUTCDate()).toBe(10);
    expect(result!.getUTCMonth()).toBe(5); // June = 5
    expect(result!.getUTCFullYear()).toBe(2024);
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

  it('returns false when derDate is null', () => {
    expect(ldmIsUnlocked(null)).toBe(false);
  });

  it('returns true when derDate is 3 days ago (past the 2-day window)', () => {
    // derDate = June 7, available = June 9, now = June 10 -> unlocked
    expect(ldmIsUnlocked('2024-06-07')).toBe(true);
  });

  it('returns false when derDate is in the future', () => {
    // derDate = June 15, available = June 17, now = June 10 -> locked
    expect(ldmIsUnlocked('2024-06-15')).toBe(false);
  });
});

describe('derIsSent', () => {
  it('returns true for "Envoyé"', () => {
    expect(derIsSent('Envoyé')).toBe(true);
  });

  it('returns true for "Signé"', () => {
    expect(derIsSent('Signé')).toBe(true);
  });

  it('returns false for "Non envoyé"', () => {
    expect(derIsSent('Non envoyé')).toBe(false);
  });

  it('returns false for null', () => {
    expect(derIsSent(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(derIsSent(undefined)).toBe(false);
  });
});
