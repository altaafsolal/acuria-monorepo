import api from '../api';
import { queryKeys } from '../api/queryKeys';
import { useGet } from '../lib/api';
import type { AccueilResponse } from '../types';

export function useAccueil(enabled = true) {
  return useGet<AccueilResponse>({
    path: api.accueil,
    queryKey: queryKeys.accueil.data,
    enabled,
  });
}
