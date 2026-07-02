import api from '../api';

const ACCESS_TOKEN_KEY = 'accessToken';

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

export function setAccessToken(token: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearAccessToken(): void {
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

export async function request<T = unknown, V = void>(
  method: string,
  path: PathResolver<V>,
  { body, variables, headers, _retry = false, ...fetchOptions }: RequestOptions<V> = {},
): Promise<T> {
  const token = getAccessToken();
  const resolvedPath = resolvePath(path, variables);
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
          headers,
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
