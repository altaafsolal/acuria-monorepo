import { describe, it, expect } from 'vitest';
import { lightenHex, normalizeHexColor } from './color';

describe('lightenHex', () => {
  it('lightens black toward white', () => {
    const result = lightenHex('#000000', 0.5);
    expect(result).toBe('#808080');
  });

  it('keeps white unchanged', () => {
    expect(lightenHex('#ffffff', 0.5)).toBe('#ffffff');
  });

  it('returns input unchanged for invalid hex', () => {
    expect(lightenHex('red', 0.5)).toBe('red');
    expect(lightenHex('invalid', 0.5)).toBe('invalid');
  });

  it('handles hex without # prefix', () => {
    const result = lightenHex('000000', 0.5);
    expect(result).toBe('#808080');
  });

  it('applies default amount of 0.25', () => {
    const result = lightenHex('#000000');
    expect(result).toBe('#404040');
  });
});

describe('normalizeHexColor', () => {
  it('returns uppercased value with # prefix', () => {
    expect(normalizeHexColor('#ff5733')).toBe('#FF5733');
  });

  it('adds # prefix when missing', () => {
    expect(normalizeHexColor('ff5733')).toBe('#FF5733');
  });

  it('returns null for invalid hex', () => {
    expect(normalizeHexColor('red')).toBeNull();
    expect(normalizeHexColor('#FFF')).toBeNull();
    expect(normalizeHexColor('')).toBeNull();
  });

  it('trims whitespace', () => {
    expect(normalizeHexColor('  #AABBCC  ')).toBe('#AABBCC');
  });
});
