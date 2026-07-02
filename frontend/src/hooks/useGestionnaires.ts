import api from '../api';
import { queryKeys } from '../api/queryKeys';
import { useGet } from '../lib/api';
import type { Gestionnaire } from '../types';

export function useGestionnaires() {
  return useGet<{ gestionnaires: Gestionnaire[] }, Gestionnaire[]>({
    path: api.gestionnaires,
    queryKey: queryKeys.gestionnaires.list,
    select: (data) => data.gestionnaires,
  });
}
