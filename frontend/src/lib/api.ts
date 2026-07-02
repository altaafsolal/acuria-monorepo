import {
  useMutation,
  useQuery,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult,
} from '@tanstack/react-query';
import { del, get, post, put } from './http';

type PathResolver<T> = string | ((variables: T) => string);

interface UseGetOptions<TQueryFnData, TData = TQueryFnData, TError = Error> extends Omit<
  UseQueryOptions<TQueryFnData, TError, TData>,
  'queryKey' | 'queryFn'
> {
  path: PathResolver<unknown>;
  queryKey: readonly unknown[];
  queryFn?: () => Promise<TQueryFnData>;
}

export function useGet<TQueryFnData, TData = TQueryFnData, TError = Error>({
  path,
  queryKey,
  queryFn,
  ...queryOptions
}: UseGetOptions<TQueryFnData, TData, TError>): UseQueryResult<TData, TError> {
  return useQuery({
    queryKey,
    queryFn: queryFn ?? (() => get<TQueryFnData>(path)),
    ...queryOptions,
  });
}

interface UsePostOptions<TData, TVariables, TError = Error> extends Omit<
  UseMutationOptions<TData, TError, TVariables>,
  'mutationFn'
> {
  path: string;
  mutationFn?: (variables: TVariables) => Promise<TData>;
}

export function usePost<TData, TVariables = unknown, TError = Error>({
  path,
  mutationFn,
  ...mutationOptions
}: UsePostOptions<TData, TVariables, TError>): UseMutationResult<TData, TError, TVariables> {
  return useMutation({
    mutationFn: mutationFn ?? ((body: TVariables) => post<TData, TVariables>(path, body)),
    ...mutationOptions,
  });
}

interface UsePutOptions<TData, TVariables, TError = Error> extends Omit<
  UseMutationOptions<TData, TError, TVariables>,
  'mutationFn'
> {
  path: PathResolver<TVariables>;
  mutationFn?: (variables: TVariables) => Promise<TData>;
}

export function usePut<TData, TVariables = unknown, TError = Error>({
  path,
  mutationFn,
  ...mutationOptions
}: UsePutOptions<TData, TVariables, TError>): UseMutationResult<TData, TError, TVariables> {
  return useMutation({
    mutationFn:
      mutationFn
      ?? ((variables: TVariables) => {
        const resolvedPath = typeof path === 'function' ? path(variables) : path;
        return put<TData, TVariables>(resolvedPath, variables);
      }),
    ...mutationOptions,
  });
}

interface UseDeleteOptions<TData, TVariables, TError = Error> extends Omit<
  UseMutationOptions<TData, TError, TVariables>,
  'mutationFn'
> {
  path: PathResolver<TVariables>;
  mutationFn?: (variables: TVariables) => Promise<TData>;
}

export function useDelete<TData, TVariables = unknown, TError = Error>({
  path,
  mutationFn,
  ...mutationOptions
}: UseDeleteOptions<TData, TVariables, TError>): UseMutationResult<TData, TError, TVariables> {
  return useMutation({
    mutationFn: mutationFn ?? ((variables: TVariables) => del<TData, TVariables>(path, { variables })),
    ...mutationOptions,
  });
}
