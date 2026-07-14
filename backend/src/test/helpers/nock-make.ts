import { vi } from 'vitest';

export interface CapturedFetch {
  url: string;
  init?: RequestInit;
  body?: unknown;
}

/**
 * Stubs global fetch to capture Make.com webhook calls.
 * Returns an array of captured calls for assertion.
 */
export function stubFetch(): CapturedFetch[] {
  const calls: CapturedFetch[] = [];

  vi.stubGlobal('fetch', async (url: string | URL | Request, init?: RequestInit) => {
    const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url;
    let body: unknown;
    try {
      body = init?.body ? JSON.parse(init.body as string) : undefined;
    } catch {
      body = init?.body;
    }
    calls.push({ url: urlStr, init, body });
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });

  return calls;
}

/** Restores original fetch */
export function restoreFetch(): void {
  vi.unstubAllGlobals();
}
