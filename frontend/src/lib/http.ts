import api from '../api';

const ACCESS_TOKEN_KEY = 'accessToken';
/** Refresh this far before access-token exp so in-flight requests don't race expiry. */
const REFRESH_SKEW_MS = 60_000;

type PathResolver<T> = string | ((variables: T) => string);

interface RequestOptions<T = void> {
  body?: unknown;
  variables?: T;
  headers?: Record<string, string>;
  credentials?: RequestCredentials;
  signal?: AbortSignal;
  _retry?: boolean;
}

type AuthFailureListener = () => void;
const authFailureListeners = new Set<AuthFailureListener>();

export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

export function onAuthFailure(listener: AuthFailureListener): () => void {
  authFailureListeners.add(listener);
  return () => authFailureListeners.delete(listener);
}

function notifyAuthFailure(): void {
  clearAccessToken();
  for (const listener of authFailureListeners) {
    listener();
  }
}

function resolvePath<T>(path: PathResolver<T>, variables?: T): string {
  if (typeof path === 'function') {
    return path(variables as T);
  }
  return path;
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

/** JWT `exp` as epoch ms, or null if the token can't be decoded. */
export function getAccessTokenExpiresAt(token: string | null = getAccessToken()): number | null {
  if (!token) return null;
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '=');
    const payload = JSON.parse(atob(padded)) as { exp?: unknown };
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

/** True when missing, undecodable, already expired, or inside the refresh skew window. */
export function isAccessTokenStale(token: string | null = getAccessToken()): boolean {
  if (!token) return true;
  const expiresAt = getAccessTokenExpiresAt(token);
  if (expiresAt === null) return true;
  return Date.now() >= expiresAt - REFRESH_SKEW_MS;
}

let refreshTimer: ReturnType<typeof setTimeout> | null = null;

function clearRefreshTimer(): void {
  if (refreshTimer !== null) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}

/** Schedule a background refresh shortly before the access token expires. */
function scheduleProactiveRefresh(token: string): void {
  clearRefreshTimer();
  const expiresAt = getAccessTokenExpiresAt(token);
  if (expiresAt === null) return;

  const delay = expiresAt - REFRESH_SKEW_MS - Date.now();
  // Already inside the skew window — leave refresh to the next request / visibility hook.
  if (delay <= 0) return;

  refreshTimer = setTimeout(() => {
    void tryRefreshAccessToken().then((next) => {
      if (!next) notifyAuthFailure();
    });
  }, delay);
}

export function setAccessToken(token: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
  scheduleProactiveRefresh(token);
}

export function clearAccessToken(): void {
  clearRefreshTimer();
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  try {
    const response = await fetch(api.refresh, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json() as { accessToken?: string };
    if (!data.accessToken) {
      return null;
    }

    setAccessToken(data.accessToken);
    return data.accessToken;
  } catch {
    return null;
  }
}

export function tryRefreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

/**
 * Ensure we have a non-stale access token before calling a protected API.
 * Returns the token to use, or null if refresh failed (caller should treat as logged out).
 */
export async function ensureFreshAccessToken(): Promise<string | null> {
  const current = getAccessToken();
  if (current && !isAccessTokenStale(current)) {
    return current;
  }
  return tryRefreshAccessToken();
}

function shouldRetryWithRefresh(path: string, status: number): boolean {
  if (status !== 401) {
    return false;
  }

  const normalized = path.split('?')[0] ?? path;
  return !normalized.endsWith('/auth/refresh')
    && !normalized.endsWith('/auth/login')
    && !normalized.endsWith('/auth/forgot-password')
    && !normalized.endsWith('/auth/verify-otp')
    && !normalized.endsWith('/auth/set-password');
}

let visibilityHookInstalled = false;

/** Refresh when the user returns to a tab left open past access-token expiry. */
export function installAuthVisibilityRefresh(): void {
  if (visibilityHookInstalled || typeof document === 'undefined') return;
  visibilityHookInstalled = true;

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (!getAccessToken()) return;
    if (!isAccessTokenStale()) return;
    void tryRefreshAccessToken().then((next) => {
      if (!next) notifyAuthFailure();
    });
  });
}

export async function request<T = unknown, V = void>(
  method: string,
  path: PathResolver<V>,
  { body, variables, headers, _retry = false, ...fetchOptions }: RequestOptions<V> = {},
): Promise<T> {
  const resolvedPath = resolvePath(path, variables);
  const isAuthEndpoint = !shouldRetryWithRefresh(resolvedPath, 401);

  // Proactively rotate before the request so we don't wait for a 401 round-trip.
  // Only when we already have a session token that is expired / near expiry.
  let token = getAccessToken();
  if (!_retry && !isAuthEndpoint && token && isAccessTokenStale(token)) {
    const refreshed = await tryRefreshAccessToken();
    if (refreshed) {
      token = refreshed;
    }
    // If refresh failed, still attempt the request; the 401 handler below retries once
    // more or calls notifyAuthFailure().
  }

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const resolvedHeaders: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...headers,
  };

  if (token) {
    resolvedHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(resolvedPath, {
    method,
    ...fetchOptions,
    headers: resolvedHeaders,
    credentials: 'include',
    body: body !== undefined
      ? (isFormData ? body as BodyInit : JSON.stringify(body))
      : undefined,
  });

  if (!response.ok) {
    if (!_retry && shouldRetryWithRefresh(resolvedPath, response.status)) {
      const newToken = await tryRefreshAccessToken();
      if (newToken) {
        return request<T, V>(method, path, {
          body,
          variables,
          headers: {
            ...headers,
            Authorization: `Bearer ${newToken}`,
          },
          _retry: true,
          ...fetchOptions,
        });
      }
      notifyAuthFailure();
    }

    const data = await response.json().catch(() => ({})) as { error?: string };
    throw new HttpError(response.status, data.error || 'Request failed');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json().catch(() => ({})) as { error?: string };
  return data as T;
}

export function get<T = unknown, V = void>(
  path: PathResolver<V>,
  options: RequestOptions<V> = {},
): Promise<T> {
  return request<T, V>('GET', path, options);
}

export function post<T = unknown, B = unknown>(
  path: string,
  body?: B,
  options: Omit<RequestOptions, 'body'> = {},
): Promise<T> {
  return request<T>('POST', path, { ...options, body });
}

export function postForm<T = unknown>(
  path: string,
  formData: FormData,
  options: Omit<RequestOptions, 'body'> = {},
): Promise<T> {
  return request<T>('POST', path, { ...options, body: formData });
}

export function put<T = unknown, B = unknown>(
  path: string | PathResolver<B>,
  body?: B,
  options: Omit<RequestOptions, 'body'> = {},
): Promise<T> {
  const resolvedPath = typeof path === 'function' ? path(body as B) : path;
  return request<T>('PUT', resolvedPath, { ...options, body });
}

export function del<T = unknown, V = void>(
  path: PathResolver<V>,
  options: RequestOptions<V> = {},
): Promise<T> {
  return request<T, V>('DELETE', path, options);
}
