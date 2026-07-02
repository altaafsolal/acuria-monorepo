export function getPlatformWsUrl(token: string): string {
  const configured = import.meta.env.VITE_WS_URL as string | undefined;
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
