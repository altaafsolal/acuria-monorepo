import { describe, it, expect } from 'vitest';
import { isAllowedBaserowFileUrl, sanitizeFileFilename } from './baserow-file.js';

describe('isAllowedBaserowFileUrl', () => {
  it('returns true for a Baserow origin URL', () => {
    expect(isAllowedBaserowFileUrl('https://api.baserow.io/media/user_files/abc.pdf')).toBe(true);
  });

  it('returns true for *.s3.amazonaws.com with /user_files/ path', () => {
    expect(isAllowedBaserowFileUrl('https://bucket.s3.amazonaws.com/user_files/abc.pdf')).toBe(true);
  });

  it('returns false for *.s3.amazonaws.com without /user_files/ path', () => {
    expect(isAllowedBaserowFileUrl('https://bucket.s3.amazonaws.com/other/abc.pdf')).toBe(false);
  });

  it('returns false for an external URL', () => {
    expect(isAllowedBaserowFileUrl('https://evil.com/malware.exe')).toBe(false);
  });

  it('returns false for a malformed URL', () => {
    expect(isAllowedBaserowFileUrl('not-a-url')).toBe(false);
  });
});

describe('sanitizeFileFilename', () => {
  it('leaves a normal filename unchanged', () => {
    expect(sanitizeFileFilename('document.pdf')).toBe('document.pdf');
  });

  it('replaces special characters with underscores', () => {
    const result = sanitizeFileFilename('file<name>:test.pdf');
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
    expect(result).not.toContain(':');
  });

  it('collapses multiple spaces', () => {
    const result = sanitizeFileFilename('file   name.pdf');
    expect(result).not.toMatch(/  /);
  });

  it('returns "fichier" for empty or whitespace-only input', () => {
    expect(sanitizeFileFilename('')).toBe('fichier');
    expect(sanitizeFileFilename('   ')).toBe('fichier');
  });
});
