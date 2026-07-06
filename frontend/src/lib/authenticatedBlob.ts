import { getAccessToken, tryRefreshAccessToken } from './http';

export async function fetchAuthenticatedBlob(url: string, retried = false): Promise<Blob> {
  const token = getAccessToken();
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  });

  if (response.status === 401 && !retried) {
    const newToken = await tryRefreshAccessToken();
    if (newToken) {
      return fetchAuthenticatedBlob(url, true);
    }
  }

  if (!response.ok) {
    throw new Error('Failed to load image');
  }

  return response.blob();
}

export async function postAuthenticatedBlob(
  url: string,
  body: unknown,
  retried = false,
): Promise<Blob> {
  const token = getAccessToken();
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
    body: JSON.stringify(body),
  });

  if (response.status === 401 && !retried) {
    const newToken = await tryRefreshAccessToken();
    if (newToken) return postAuthenticatedBlob(url, body, true);
  }

  if (!response.ok) throw new Error('Failed to generate preview');
  return response.blob();
}

export function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
