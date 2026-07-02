import api from '../api';
import { queryKeys } from '../api/queryKeys';
import { useGet } from '../lib/api';
import type { HealthResponse } from '../types';

export function useHealth() {
  return useGet<HealthResponse>({
    path: api.health,
    queryKey: queryKeys.health,
    retry: false,
  });
}
