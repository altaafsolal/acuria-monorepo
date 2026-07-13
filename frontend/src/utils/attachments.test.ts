import { describe, it, expect } from 'vitest';
import { attachmentDisplayName } from './attachments';

describe('attachmentDisplayName', () => {
  it('returns trimmed file name', () => {
    expect(attachmentDisplayName({ name: 'document.pdf', url: 'http://example.com' })).toBe('document.pdf');
  });

  it('returns fichier for whitespace-only name', () => {
    expect(attachmentDisplayName({ name: '   ', url: 'http://example.com' })).toBe('fichier');
  });

  it('returns fichier for empty name', () => {
    expect(attachmentDisplayName({ name: '', url: 'http://example.com' })).toBe('fichier');
  });
});
