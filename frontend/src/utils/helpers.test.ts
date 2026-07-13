import { describe, it, expect } from 'vitest';
import { slugifyName, textIncludes, filterBySearch } from './helpers';

describe('slugifyName', () => {
  it('converts name to slug', () => {
    expect(slugifyName('Jean Dupont')).toBe('jean-dupont');
  });

  it('trims whitespace', () => {
    expect(slugifyName('  Acuria  ')).toBe('acuria');
  });

  it('replaces non-alphanumeric with hyphens', () => {
    expect(slugifyName('Café & Croissants!')).toBe('caf-croissants');
  });

  it('returns empty string for empty input', () => {
    expect(slugifyName('')).toBe('');
  });

  it('strips leading/trailing hyphens', () => {
    expect(slugifyName('---hello---')).toBe('hello');
  });
});

describe('textIncludes', () => {
  it('matches case-insensitively', () => {
    expect(textIncludes('Hello World', 'hello')).toBe(true);
    expect(textIncludes('Hello World', 'WORLD')).toBe(true);
  });

  it('returns false for no match', () => {
    expect(textIncludes('Hello', 'xyz')).toBe(false);
  });
});

describe('filterBySearch', () => {
  const items = [
    { name: 'Jean Dupont', email: 'jean@test.com' },
    { name: 'Marie Martin', email: 'marie@test.com' },
    { name: 'Pierre Durand', email: 'pierre@test.com' },
  ];
  const getValues = (item: typeof items[0]) => [item.name, item.email];

  it('returns all items for empty query', () => {
    expect(filterBySearch(items, '', getValues)).toHaveLength(3);
    expect(filterBySearch(items, '   ', getValues)).toHaveLength(3);
  });

  it('filters matching items', () => {
    const result = filterBySearch(items, 'jean', getValues);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Jean Dupont');
  });

  it('matches on any field', () => {
    const result = filterBySearch(items, 'marie@test', getValues);
    expect(result).toHaveLength(1);
  });

  it('returns empty array for no match', () => {
    expect(filterBySearch(items, 'xyz', getValues)).toHaveLength(0);
  });
});
