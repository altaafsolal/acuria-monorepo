import { describe, it, expect, afterEach, vi } from 'vitest';
import { getPlatformWsUrl } from './ws';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getPlatformWsUrl', () => {
  it('derives wss URL from absolute VITE_API_URL', () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com/api');
    vi.stubEnv('VITE_WS_URL', '');
    expect(getPlatformWsUrl('tok')).toBe('wss://api.example.com/api/ws?token=tok');
  });

  it('prefers VITE_API_URL host when VITE_WS_URL points elsewhere', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubEnv('VITE_API_URL', 'https://live-api.onrender.com/api');
    vi.stubEnv('VITE_WS_URL', 'wss://acuria-api.onrender.com/api/ws');
    expect(getPlatformWsUrl('tok')).toBe('wss://live-api.onrender.com/api/ws?token=tok');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('uses VITE_WS_URL when VITE_API_URL is relative', () => {
    vi.stubEnv('VITE_API_URL', '/api');
    vi.stubEnv('VITE_WS_URL', 'wss://api.example.com/api/ws');
    const url = new URL(getPlatformWsUrl('tok'));
    expect(url.host).toBe('api.example.com');
    expect(url.pathname).toBe('/api/ws');
  });

  it('falls back to same-origin /api/ws', () => {
    vi.stubEnv('VITE_WS_URL', '');
    vi.stubEnv('VITE_API_URL', '/api');
    const url = new URL(getPlatformWsUrl('tok'));
    expect(url.pathname).toBe('/api/ws');
    expect(url.searchParams.get('token')).toBe('tok');
  });
});
