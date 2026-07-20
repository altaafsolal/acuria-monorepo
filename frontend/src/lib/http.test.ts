import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  HttpError,
  getAccessToken,
  setAccessToken,
  clearAccessToken,
  onAuthFailure,
  request,
  tryRefreshAccessToken,
  isAccessTokenStale,
} from './http';

/** Unsigned JWT-shaped token with the given exp offset from now (seconds). */
function makeJwt(expOffsetSeconds: number): string {
  const exp = Math.floor(Date.now() / 1000) + expOffsetSeconds;
  const payload = btoa(JSON.stringify({ exp })).replace(/\+/g, '-').replace(/\//g, '_');
  return `hdr.${payload}.sig`;
}

beforeEach(() => {
  clearAccessToken();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('HttpError', () => {
  it('has status and message', () => {
    const err = new HttpError(404, 'Not found');
    expect(err.status).toBe(404);
    expect(err.message).toBe('Not found');
    expect(err.name).toBe('HttpError');
    expect(err).toBeInstanceOf(Error);
  });
});

describe('access token management', () => {
  it('set/get/clear', () => {
    expect(getAccessToken()).toBeNull();
    setAccessToken('tok1');
    expect(getAccessToken()).toBe('tok1');
    clearAccessToken();
    expect(getAccessToken()).toBeNull();
  });
});

describe('onAuthFailure', () => {
  it('registers a listener and returns unsubscribe', () => {
    const listener = vi.fn();
    const unsub = onAuthFailure(listener);
    expect(typeof unsub).toBe('function');
    unsub();
  });
});

describe('request', () => {
  it('makes a successful GET request', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: 'test' }),
    }));

    const result = await request('GET', '/api/test');
    expect(result).toEqual({ data: 'test' });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('returns undefined for 204', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      json: () => Promise.resolve({}),
    }));

    const result = await request('DELETE', '/api/test');
    expect(result).toBeUndefined();
  });

  it('throws HttpError on non-OK response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: () => Promise.resolve({ error: 'Validation failed' }),
    }));

    await expect(request('POST', '/api/test', { body: {} })).rejects.toThrow(HttpError);
    try {
      await request('POST', '/api/test', { body: {} });
    } catch (e) {
      expect((e as HttpError).status).toBe(422);
      expect((e as HttpError).message).toBe('Validation failed');
    }
  });

  it('includes Authorization header when token is set', async () => {
    const token = makeJwt(600);
    setAccessToken(token);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    }));

    await request('GET', '/api/test');
    const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(callArgs[1].headers.Authorization).toBe(`Bearer ${token}`);
  });

  it('does not set Content-Type for FormData', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    }));

    const formData = new FormData();
    formData.append('file', 'test');
    await request('POST', '/api/upload', { body: formData });
    const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(callArgs[1].headers['Content-Type']).toBeUndefined();
  });

  it('retries on 401 with token refresh', async () => {
    // Fresh enough to skip proactive refresh; server still rejects → 401 path.
    setAccessToken(makeJwt(600));
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 401, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ accessToken: 'new-tok' }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ data: 'success' }) });
    vi.stubGlobal('fetch', fetchMock);

    const result = await request('GET', '/api/data');
    expect(result).toEqual({ data: 'success' });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('does not retry 401 on auth endpoints', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'Bad credentials' }),
    }));

    await expect(request('POST', '/api/auth/login', { body: {} })).rejects.toThrow(HttpError);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe('tryRefreshAccessToken', () => {
  it('deduplicates concurrent calls', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ accessToken: 'new-tok' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const [r1, r2] = await Promise.all([tryRefreshAccessToken(), tryRefreshAccessToken()]);
    expect(r1).toBe('new-tok');
    expect(r2).toBe('new-tok');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('isAccessTokenStale / getAccessTokenExpiresAt', () => {
  it('treats missing token as stale', () => {
    expect(isAccessTokenStale(null)).toBe(true);
  });

  it('treats a token expiring within the skew window as stale', () => {
    expect(isAccessTokenStale(makeJwt(30))).toBe(true);
  });

  it('treats a token with plenty of life as fresh', () => {
    expect(isAccessTokenStale(makeJwt(600))).toBe(false);
  });

  it('refreshes proactively before sending a request with a stale token', async () => {
    setAccessToken(makeJwt(-10));

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ accessToken: 'fresh-tok' }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ data: 'ok' }) });
    vi.stubGlobal('fetch', fetchMock);

    const result = await request('GET', '/api/data');
    expect(result).toEqual({ data: 'ok' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toContain('/auth/refresh');
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer fresh-tok');
  });
});
