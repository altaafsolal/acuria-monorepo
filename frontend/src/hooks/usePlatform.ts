import { useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { queryKeys } from '../api/queryKeys';
import { useApp } from '../context/AppContext';
import { useDelete, useGet, usePost, usePut } from '../lib/api';
import { post, put } from '../lib/http';
import {
  getBlobObjectUrlCacheKey,
  getOrCreateBlobObjectUrl,
  revokeBlobObjectUrls,
} from '../lib/blobObjectUrlCache';
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
    mutationFn: ({ id, logo, removeBrandingLogo, ...input }) => {
      const useMultipart = Boolean(logo || removeBrandingLogo);

      if (!useMultipart) {
        return put<TenantResponse>(api.tenantById(id), input);
      }

      const formData = new FormData();
      if (input.brandingName !== undefined) formData.append('brandingName', input.brandingName);
      if (input.brandingOrias !== undefined) formData.append('brandingOrias', input.brandingOrias);
      if (input.brandingAccent !== undefined) formData.append('brandingAccent', input.brandingAccent);
      if (input.status !== undefined) formData.append('status', input.status);
      if (input.sharepointPathBase !== undefined) formData.append('sharepointPathBase', input.sharepointPathBase);
      if (input.email !== undefined) formData.append('email', input.email);
      if (input.backofficeEmail !== undefined) formData.append('backofficeEmail', input.backofficeEmail);
      if (logo) formData.append('logo', logo);
      if (removeBrandingLogo) formData.append('removeBrandingLogo', 'true');

      return put<TenantResponse>(api.tenantById(id), formData);
    },
    onSuccess: async (data, { id, logo, removeBrandingLogo }) => {
      queryClient.setQueryData<TenantsResponse>(queryKeys.platform.tenants, (old) => {
        if (!old) return old;
        return {
          tenants: old.tenants.map((tenant) => (
            tenant.id === id ? { ...tenant, ...data.tenant } : tenant
          )),
        };
      });

      queryClient.setQueryData<TenantResponse>(queryKeys.platform.tenant(id), data);

      if (removeBrandingLogo || logo) {
        const logoQueryKeys = [
          queryKeys.assets.tenantLogo(id),
          queryKeys.tenant.logo,
        ] as const;

        revokeBlobObjectUrls(logoQueryKeys);
        queryClient.removeQueries({ queryKey: queryKeys.assets.tenantLogo(id) });
        queryClient.removeQueries({ queryKey: queryKeys.tenant.logo });

        if (logo) {
          queryClient.setQueryData(queryKeys.assets.tenantLogo(id), logo);
          getOrCreateBlobObjectUrl(
            getBlobObjectUrlCacheKey(queryKeys.assets.tenantLogo(id)),
            logo,
          );
        }
      }

      await queryClient.invalidateQueries({ queryKey: queryKeys.tenant.branding });
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
  userId?: string,
) {
  const invalidations = [
    queryClient.invalidateQueries({ queryKey: queryKeys.platform.tenantUsers(tenantId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.platform.tenants }),
    queryClient.invalidateQueries({ queryKey: queryKeys.platform.stats }),
    queryClient.invalidateQueries({ queryKey: queryKeys.gestionnaires.list }),
  ];
  if (userId) {
    invalidations.push(
      queryClient.invalidateQueries({ queryKey: queryKeys.platform.tenantUser(tenantId, userId) }),
    );
  }
  return Promise.all(invalidations);
}

export function useTenantUser(tenantId: string | undefined, userId: string | undefined) {
  return useGet<UserResponse>({
    path: api.tenantUserById(tenantId ?? '', userId ?? ''),
    queryKey: queryKeys.platform.tenantUser(tenantId ?? '', userId ?? ''),
    enabled: Boolean(tenantId && userId),
  });
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
    onSuccess: async (_data, variables) => {
      if (tenantId) {
        await invalidateTenantUserQueries(queryClient, tenantId, variables.id);
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
