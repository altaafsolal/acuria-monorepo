import type { User } from './user';

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export interface RefreshResponse {
  accessToken: string;
}

export interface MeResponse {
  user: User;
}
