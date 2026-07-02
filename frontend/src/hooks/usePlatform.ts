import { useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { queryKeys } from '../api/queryKeys';
import { useApp } from '../context/AppContext';
import { useDelete, useGet, usePost, usePut } from '../lib/api';
import { post, put } from '../lib/http';
import type {
  Client,
  ClientsResponse,
  CreateTenantInput,
  CreateUserInput,
  DashboardStats,
  Tenant,
  TenantResponse,
  TenantsResponse,
  UpdateTenantBrandingInput,
  UpdateUserInput,
  User,
  UserResponse,
  UsersResponse,
} from '../types';

export function usePlatformStats() {
  const { isSuperAdmin, user } = useApp();

  return useGet<DashboardStats>({
    path: isSuperAdmin ? api.platformStats : api.tenantStats,
    queryKey: isSuperAdmin
      ? queryKeys.platform.stats
      : [...queryKeys.tenant.stats, user?.tenantId],
    enabled: Boolean(user?.role),
  });
}

export function useTenants() {
  return useGet<TenantsResponse, Tenant[]>({
    path: api.tenants,
    queryKey: queryKeys.platform.tenants,
    select: (data) => data.tenants,
  });
}

export function useCreateTenant() {
  const queryClient = useQueryClient();

  return usePost<TenantResponse, CreateTenantInput>({
    path: api.tenants,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.platform.tenants }),
        queryClient.invalidateQueries({ queryKey: queryKeys.platform.stats }),
      ]);
    },
  });
}

export function useUpdateTenantBranding() {
  const queryClient = useQueryClient();

  return usePut<TenantResponse, UpdateTenantBrandingInput & { id: string }>({
    path: ({ id }) => api.tenantById(id),
    mutationFn: ({ id, ...input }) => put<TenantResponse>(api.tenantById(id), input),
    onSuccess: async (_, { id }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.platform.tenants }),
        queryClient.invalidateQueries({ queryKey: queryKeys.platform.tenant(id) }),
      ]);
    },
  });
}

export function useTenant(tenantId: string | undefined) {
  return useGet<TenantResponse, Tenant>({
    path: api.tenantById(tenantId ?? ''),
    queryKey: queryKeys.platform.tenant(tenantId ?? ''),
    select: (data) => data.tenant,
    enabled: Boolean(tenantId),
  });
}

export function useTenantUsers(tenantId: string | undefined) {
  return useGet<UsersResponse, User[]>({
    path: api.tenantUsers(tenantId ?? ''),
    queryKey: queryKeys.platform.tenantUsers(tenantId ?? ''),
    select: (data) => data.users,
    enabled: Boolean(tenantId),
  });
}

export function useTenantClients(tenantId: string | undefined) {
  return useGet<ClientsResponse, Client[]>({
    path: api.tenantClients(tenantId ?? ''),
    queryKey: queryKeys.platform.tenantClients(tenantId ?? ''),
    select: (data) => data.clients,
    enabled: Boolean(tenantId),
  });
}

function invalidateTenantUserQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  tenantId: string,
) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.platform.tenantUsers(tenantId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.platform.tenants }),
    queryClient.invalidateQueries({ queryKey: queryKeys.platform.stats }),
  ]);
}

export function useCreateTenantUser(tenantId: string | undefined) {
  const queryClient = useQueryClient();

  return usePost<UserResponse, CreateUserInput>({
    path: api.tenantUserCreate(tenantId ?? ''),
    onSuccess: async () => {
      if (tenantId) {
        await invalidateTenantUserQueries(queryClient, tenantId);
      }
    },
  });
}

export function useUpdateTenantUser(tenantId: string | undefined) {
  const queryClient = useQueryClient();

  return usePut<UserResponse, UpdateUserInput & { id: string }>({
    path: ({ id }) => api.tenantUserById(tenantId ?? '', id),
    mutationFn: ({ id, ...input }) => put<UserResponse>(
      api.tenantUserById(tenantId ?? '', id),
      input,
    ),
    onSuccess: async () => {
      if (tenantId) {
        await invalidateTenantUserQueries(queryClient, tenantId);
      }
    },
  });
}

export function useDeleteTenantUser(tenantId: string | undefined) {
  const queryClient = useQueryClient();

  return useDelete<void, string>({
    path: (userId) => api.tenantUserById(tenantId ?? '', userId),
    onSuccess: async () => {
      if (tenantId) {
        await invalidateTenantUserQueries(queryClient, tenantId);
      }
    },
  });
}

export function useResetTenantUserPassword(tenantId: string | undefined) {
  return usePost<{ message: string }, string>({
    path: api.tenantUserCreate(tenantId ?? ''),
    mutationFn: (userId) => post<{ message: string }>(
      api.tenantUserResetPassword(tenantId ?? '', userId),
    ),
  });
}
