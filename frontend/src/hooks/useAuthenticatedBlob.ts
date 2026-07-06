import { useQuery } from '@tanstack/react-query';
import { fetchAuthenticatedBlob } from '../lib/authenticatedBlob';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function useAuthenticatedBlob(
  url: string | undefined,
  queryKey: readonly unknown[],
  enabled = true,
) {
  return useQuery({
    queryKey,
    queryFn: () => fetchAuthenticatedBlob(url!),
    enabled: enabled && Boolean(url),
    staleTime: ONE_DAY_MS,
    gcTime: ONE_DAY_MS,
  });
}
