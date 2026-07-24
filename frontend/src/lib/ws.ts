/**
 * Build the super-admin realtime WebSocket URL.
 *
 * Resolution order:
 * 1. Dev + relative API → direct `ws://localhost:3001/api/ws`
 *    (bypasses Vite's `/api/ws` proxy, which drops connections with ECONNRESET
 *    and can reconnect-storm Baserow-auth on every upgrade)
 * 2. Absolute `VITE_API_URL` → derive `wss://<same-host>/api/ws`
 * 3. `VITE_WS_URL` if set and no absolute API URL
 * 4. Same-origin `/api/ws` (monorepo same-host deploy)
 *
 * If both `VITE_API_URL` and `VITE_WS_URL` are absolute but on different hosts,
 * we always follow the API host and warn — a stale WS URL is a common deploy bug
 * (HTTP works, WebSocket hits `X-Render-Routing: no-server`).
 */
export function getPlatformWsUrl(token: string): string {
  const configured = (import.meta.env.VITE_WS_URL as string | undefined)?.trim();
  const apiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();

  // Local Vite: talk to the backend WS port directly. The HTTP `/api` proxy is fine;
  // the WS proxy is not (see ECONNRESET storms in the Vite terminal).
  if (import.meta.env.DEV && !absoluteHttpToWsUrl(apiUrl)) {
    const url = new URL('ws://localhost:3001/api/ws');
    url.searchParams.set('token', token);
    return url.toString();
  }

  const fromAbsoluteApi = absoluteHttpToWsUrl(apiUrl);
  if (fromAbsoluteApi) {
    if (configured) {
      try {
        const wsHost = new URL(configured).host;
        if (wsHost !== fromAbsoluteApi.host && typeof console !== 'undefined') {
          console.warn(
            `[ws] VITE_WS_URL host (${wsHost}) differs from VITE_API_URL host (${fromAbsoluteApi.host}); using API host for WebSocket`,
          );
        }
      } catch {
        // ignore invalid VITE_WS_URL — we already prefer the API URL
      }
    }
    fromAbsoluteApi.searchParams.set('token', token);
    return fromAbsoluteApi.toString();
  }

  if (configured) {
    const url = new URL(configured);
    url.searchParams.set('token', token);
    return url.toString();
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const url = new URL(`${protocol}//${window.location.host}/api/ws`);
  url.searchParams.set('token', token);
  return url.toString();
}

/** `https://host/api` → `wss://host/api/ws` (null if relative or unset). */
function absoluteHttpToWsUrl(apiUrl: string | undefined): URL | null {
  if (!apiUrl || !/^https?:\/\//i.test(apiUrl)) return null;
  const url = new URL(apiUrl);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  const basePath = url.pathname.replace(/\/+$/, '') || '';
  url.pathname = basePath.endsWith('/api') ? `${basePath}/ws` : '/api/ws';
  url.search = '';
  url.hash = '';
  return url;
}
