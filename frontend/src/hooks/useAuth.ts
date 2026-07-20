import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { clearSession, persistSession } from '../api/auth';
import { queryKeys } from '../api/queryKeys';
import { useGet, usePost } from '../lib/api';
import {
  get,
  getAccessToken,
  isAccessTokenStale,
  onAuthFailure,
  post,
  tryRefreshAccessToken,
} from '../lib/http';
import type { LoginResponse, MeResponse, User } from '../types';

async function fetchSession(): Promise<User | null> {
  try {
    // Expired access tokens stay in localStorage until cleared — always refresh
    // when missing or stale so a tab left open past 15m recovers without F5.
    if (!getAccessToken() || isAccessTokenStale()) {
      const refreshed = await tryRefreshAccessToken();
      if (!refreshed && !getAccessToken()) {
        return null;
      }
      if (!refreshed) {
        clearSession();
        return null;
      }
    }

    const { user } = await get<MeResponse>(api.me);
    return user;
  } catch {
    clearSession();
    return null;
  }
}

export function useAuthSession() {
  const queryClient = useQueryClient();

  useEffect(() => {
    return onAuthFailure(() => {
      clearSession();
      queryClient.setQueryData(queryKeys.auth.session, null);
    });
  }, [queryClient]);

  return useGet<User | null>({
    queryKey: queryKeys.auth.session,
    path: api.me,
    queryFn: fetchSession,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

interface LoginVariables {
  email: string;
  password: string;
}

export function useLogin() {
  const queryClient = useQueryClient();

  return usePost<LoginResponse, LoginVariables>({
    path: api.login,
    onSuccess: (data) => {
      persistSession(data);
      queryClient.setQueryData(queryKeys.auth.session, data.user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return usePost<{ message: string }, void>({
    path: api.logout,
    mutationFn: () => post<{ message: string }>(api.logout),
    onSettled: () => {
      clearSession();
      queryClient.setQueryData(queryKeys.auth.session, null);
      queryClient.removeQueries({ queryKey: queryKeys.auth.session });
      queryClient.removeQueries({ queryKey: ['platform'] });
      queryClient.removeQueries({ queryKey: ['tenant'] });
    },
  });
}
