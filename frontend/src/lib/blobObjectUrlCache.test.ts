import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getBlobObjectUrlCacheKey,
  getOrCreateBlobObjectUrl,
  revokeBlobObjectUrl,
  revokeBlobObjectUrls,
} from './blobObjectUrlCache';

let urlCounter = 0;

beforeEach(() => {
  urlCounter = 0;
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn(() => `blob:fake-url-${++urlCounter}`),
    revokeObjectURL: vi.fn(),
  });
});

describe('getBlobObjectUrlCacheKey', () => {
  it('serializes query key to JSON string', () => {
    expect(getBlobObjectUrlCacheKey(['clients', '123'])).toBe('["clients","123"]');
  });

  it('handles nested keys', () => {
    expect(getBlobObjectUrlCacheKey(['a', { id: 1 }])).toBe('["a",{"id":1}]');
  });
});

describe('getOrCreateBlobObjectUrl', () => {
  it('creates a new object URL', () => {
    const blob = new Blob(['test']);
    const url = getOrCreateBlobObjectUrl('key1', blob);
    expect(url).toBe('blob:fake-url-1');
    expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
  });

  it('returns cached URL on second call', () => {
    const blob = new Blob(['test']);
    const url1 = getOrCreateBlobObjectUrl('key2', blob);
    const url2 = getOrCreateBlobObjectUrl('key2', blob);
    expect(url1).toBe(url2);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
  });
});

describe('revokeBlobObjectUrl', () => {
  it('revokes and removes cached URL', () => {
    const blob = new Blob(['test']);
    getOrCreateBlobObjectUrl('key3', blob);
    revokeBlobObjectUrl('key3');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake-url-1');
  });

  it('does nothing for unknown key', () => {
    revokeBlobObjectUrl('nonexistent');
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  });
});

describe('revokeBlobObjectUrls', () => {
  it('revokes all provided keys', () => {
    const blob = new Blob(['test']);
    getOrCreateBlobObjectUrl(getBlobObjectUrlCacheKey(['a']), blob);
    getOrCreateBlobObjectUrl(getBlobObjectUrlCacheKey(['b']), blob);
    revokeBlobObjectUrls([['a'], ['b']]);
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
  });
});
