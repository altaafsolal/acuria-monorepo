import { useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { queryKeys } from '../api/queryKeys';
import { useDelete, useGet, usePost, usePut } from '../lib/api';
import { post, put } from '../lib/http';
import type {
  CreateUserInput,
  UpdateUserInput,
  User,
  UserResponse,
  UsersResponse,
} from '../types';

export function useUsers() {
  return useGet<UsersResponse, User[]>({
    path: api.users,
    queryKey: queryKeys.users.list,
    select: (data) => data.users,
  });
}

export function useUser(userId: string | undefined) {
  return useGet<UserResponse, User>({
    path: api.userById(userId ?? ''),
    queryKey: queryKeys.users.detail(userId ?? ''),
    select: (data) => data.user,
    enabled: Boolean(userId),
  });
}

function invalidateUserQueries(queryClient: ReturnType<typeof useQueryClient>, userId?: string) {
  const invalidations = [
    queryClient.invalidateQueries({ queryKey: queryKeys.users.list }),
    queryClient.invalidateQueries({ queryKey: queryKeys.tenant.stats }),
  ];
  if (userId) {
    invalidations.push(queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(userId) }));
  }
  return Promise.all(invalidations);
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return usePost<UserResponse, CreateUserInput>({
    path: api.users,
    onSuccess: async () => {
      await invalidateUserQueries(queryClient);
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return usePut<UserResponse, UpdateUserInput & { id: string }>({
    path: ({ id }) => api.userById(id),
    mutationFn: ({ id, ...input }) => put<UserResponse>(api.userById(id), input),
    onSuccess: async (_data, variables) => {
      await invalidateUserQueries(queryClient, variables.id);
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useDelete<void, string>({
    path: (id) => api.userById(id),
    onSuccess: async () => {
      await invalidateUserQueries(queryClient);
    },
  });
}

export function useResetUserPassword() {
  return usePost<{ message: string }, string>({
    path: api.users,
    mutationFn: (userId) => post<{ message: string }>(api.userResetPassword(userId)),
  });
}
