import { getAccessToken, setAccessToken, clearAccessToken } from '../lib/http';
import type { LoginResponse, User } from '../types';

export function persistSession({ accessToken, user }: LoginResponse): User {
  setAccessToken(accessToken);
  return user;
}

export function clearSession(): void {
  clearAccessToken();
}

export { getAccessToken, setAccessToken, clearAccessToken };
