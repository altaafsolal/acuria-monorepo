import { describe, it, expect } from 'vitest';
import {
  pickFieldValue,
  pickNumberValue,
  pickTextValue,
  pickLinkRowId,
  isBlankRow,
  normalizeDateForBaserow,
  normalizeDateTimeForBaserow,
  pickFileValues,
  normalizePhoneForBaserow,
} from './baserow.js';

describe('pickFieldValue', () => {
  it('returns null for null/undefined/empty string', () => {
    expect(pickFieldValue(null)).toBeNull();
    expect(pickFieldValue(undefined)).toBeNull();
    expect(pickFieldValue('')).toBeNull();
  });

  it('unwraps {value} objects', () => {
    expect(pickFieldValue({ value: 'foo' })).toBe('foo');
    expect(pickFieldValue({ value: null })).toBe('null');
    expect(pickFieldValue({ value: 42 })).toBe('42');
  });

  it('extracts id from array of objects with id', () => {
    expect(pickFieldValue([{ id: 5 }])).toBe('5');
    expect(pickFieldValue([{ id: 0 }])).toBe('0');
  });

  it('extracts first element from plain arrays', () => {
    expect(pickFieldValue(['hello', 'world'])).toBe('hello');
    expect(pickFieldValue([null])).toBeNull();
    expect(pickFieldValue([])).toBeNull();
  });

  it('converts primitives to string', () => {
    expect(pickFieldValue(42)).toBe('42');
    expect(pickFieldValue('hello')).toBe('hello');
    expect(pickFieldValue(true)).toBe('true');
  });
});

describe('pickNumberValue', () => {
  it('returns null for null/undefined/empty string', () => {
    expect(pickNumberValue(null)).toBeNull();
    expect(pickNumberValue(undefined)).toBeNull();
    expect(pickNumberValue('')).toBeNull();
  });

  it('returns numbers directly', () => {
    expect(pickNumberValue(42)).toBe(42);
    expect(pickNumberValue(3.14)).toBe(3.14);
    expect(pickNumberValue(0)).toBe(0);
  });

  it('parses numeric strings', () => {
    expect(pickNumberValue('42')).toBe(42);
    expect(pickNumberValue('3.14')).toBe(3.14);
  });

  it('returns null for non-numeric values', () => {
    expect(pickNumberValue('abc')).toBeNull();
    expect(pickNumberValue(NaN)).toBeNull();
    expect(pickNumberValue(Infinity)).toBeNull();
  });
});

describe('pickTextValue', () => {
  it('returns null for null/undefined/empty string', () => {
    expect(pickTextValue(null)).toBeNull();
    expect(pickTextValue(undefined)).toBeNull();
    expect(pickTextValue('')).toBeNull();
  });

  it('returns text for valid values', () => {
    expect(pickTextValue('hello')).toBe('hello');
    expect(pickTextValue(42)).toBe('42');
  });

  it('returns null when pickFieldValue produces empty string', () => {
    expect(pickTextValue({ value: '' })).toBeNull();
  });
});

describe('pickLinkRowId', () => {
  it('returns null for null/undefined/empty string', () => {
    expect(pickLinkRowId(null)).toBeNull();
    expect(pickLinkRowId(undefined)).toBeNull();
    expect(pickLinkRowId('')).toBeNull();
  });

  it('extracts id from array of objects', () => {
    expect(pickLinkRowId([{ id: 99 }])).toBe('99');
    expect(pickLinkRowId([{ id: 0 }])).toBe('0');
  });

  it('extracts id from plain object', () => {
    expect(pickLinkRowId({ id: 7 })).toBe('7');
  });

  it('converts plain value to string', () => {
    expect(pickLinkRowId('literal')).toBe('literal');
    expect(pickLinkRowId(42)).toBe('42');
  });

  it('handles arrays of primitives', () => {
    expect(pickLinkRowId(['hello'])).toBe('hello');
  });
});

describe('isBlankRow', () => {
  it('returns true for rows with only id and order', () => {
    expect(isBlankRow({ id: 1, order: '1.00' })).toBe(true);
  });

  it('returns true when all fields are empty', () => {
    expect(isBlankRow({ id: 1, name: '', status: null, tags: [], active: false })).toBe(true);
  });

  it('returns true when fields have empty {value} objects', () => {
    expect(isBlankRow({ id: 1, type: { value: '' }, status: { value: null } })).toBe(true);
  });

  it('returns false when any field has a value', () => {
    expect(isBlankRow({ id: 1, name: 'Jean' })).toBe(false);
    expect(isBlankRow({ id: 1, count: 42 })).toBe(false);
  });

  it('returns true for whitespace-only strings', () => {
    expect(isBlankRow({ id: 1, name: '   ' })).toBe(true);
  });
});

describe('normalizeDateForBaserow', () => {
  it('returns null for null/undefined/empty string', () => {
    expect(normalizeDateForBaserow(null)).toBeNull();
    expect(normalizeDateForBaserow(undefined)).toBeNull();
    expect(normalizeDateForBaserow('')).toBeNull();
    expect(normalizeDateForBaserow('   ')).toBeNull();
  });

  it('extracts date from ISO format', () => {
    expect(normalizeDateForBaserow('2024-05-15')).toBe('2024-05-15');
    expect(normalizeDateForBaserow('2024-05-15T10:00:00Z')).toBe('2024-05-15');
  });

  it('handles US date format MM/DD/YYYY', () => {
    expect(normalizeDateForBaserow('05/15/2024')).toBe('2024-05-15');
  });

  it('handles EU date format DD/MM/YYYY (day > 12 unambiguous)', () => {
    expect(normalizeDateForBaserow('15/05/2024')).toBe('2024-05-15');
  });

  it('handles EU dash format DD-MM-YYYY', () => {
    expect(normalizeDateForBaserow('15-05-2024')).toBe('2024-05-15');
  });

  it('returns null for invalid dates', () => {
    expect(normalizeDateForBaserow('invalid')).toBeNull();
  });
});

describe('normalizeDateTimeForBaserow', () => {
  it('returns null for null/undefined/empty', () => {
    expect(normalizeDateTimeForBaserow(null)).toBeNull();
    expect(normalizeDateTimeForBaserow('')).toBeNull();
  });

  it('converts ISO datetime to ISO string', () => {
    const result = normalizeDateTimeForBaserow('2024-05-15T10:30:00Z');
    expect(result).toBe('2024-05-15T10:30:00.000Z');
  });

  it('falls back to normalizeDateForBaserow for date-only strings that parse', () => {
    const result = normalizeDateTimeForBaserow('2024-05-15');
    expect(result).not.toBeNull();
    expect(result!.startsWith('2024-05-15')).toBe(true);
  });
});

describe('pickFileValues', () => {
  it('returns empty array for non-array input', () => {
    expect(pickFileValues(null)).toEqual([]);
    expect(pickFileValues('string')).toEqual([]);
    expect(pickFileValues(42)).toEqual([]);
  });

  it('maps valid file objects', () => {
    const input = [{ name: 'doc.pdf', url: 'https://example.com/doc.pdf', size: 1024 }];
    const result = pickFileValues(input);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('doc.pdf');
    expect(result[0].url).toBe('https://example.com/doc.pdf');
    expect(result[0].size).toBe(1024);
    expect(result[0].visibleName).toBeNull();
  });

  it('prefers visible_name over visibleName', () => {
    const input = [{ name: 'a.pdf', url: 'http://x', visible_name: 'Display', visibleName: 'Fallback' }];
    expect(pickFileValues(input)[0].visibleName).toBe('Display');
  });

  it('falls back to visibleName', () => {
    const input = [{ name: 'a.pdf', url: 'http://x', visibleName: 'Fallback' }];
    expect(pickFileValues(input)[0].visibleName).toBe('Fallback');
  });

  it('filters out items without name or url', () => {
    const input = [{ name: '', url: 'http://x' }, { name: 'a.pdf', url: '' }, { name: 'b.pdf', url: 'http://y' }];
    expect(pickFileValues(input)).toHaveLength(1);
    expect(pickFileValues(input)[0].name).toBe('b.pdf');
  });

  it('returns null size for non-number', () => {
    const input = [{ name: 'a.pdf', url: 'http://x', size: 'big' }];
    expect(pickFileValues(input)[0].size).toBeNull();
  });
});

describe('normalizePhoneForBaserow', () => {
  it('returns null for null/undefined/empty/whitespace', () => {
    expect(normalizePhoneForBaserow(null)).toBeNull();
    expect(normalizePhoneForBaserow(undefined)).toBeNull();
    expect(normalizePhoneForBaserow('')).toBeNull();
    expect(normalizePhoneForBaserow('   ')).toBeNull();
  });

  it('trims and returns valid phone strings', () => {
    expect(normalizePhoneForBaserow(' +33 6 12 34 56 78 ')).toBe('+33 6 12 34 56 78');
  });

  it('converts numbers to string', () => {
    expect(normalizePhoneForBaserow(612345678)).toBe('612345678');
  });
});
