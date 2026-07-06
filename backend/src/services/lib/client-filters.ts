import { clientMapper } from '../baserow/index.js';
import type { DbClient } from '../../types/domain.js';

const { excludeArchived } = clientMapper;

export function filterDerClients(clients: DbClient[], filter: string): DbClient[] {
  const active = excludeArchived(clients);
  if (!filter || filter === 'all') return active;
  if (filter === 'non_envoye') return active.filter((c) => !c.der_statut || c.der_statut === 'Non envoyé');
  if (filter === 'envoye') return active.filter((c) => c.der_statut === 'Envoyé' || c.ldm_statut === 'Envoyé');
  if (filter === 'signe') return active.filter((c) => c.ldm_statut === 'Signé');
  return active;
}

export function filterFccClients(clients: DbClient[], filter: string): DbClient[] {
  const active = excludeArchived(clients);
  if (!filter || filter === 'all') return active;
  if (filter === 'non_envoye') return active.filter((c) => !c.fcc_statut || c.fcc_statut === 'Non envoyé');
  if (filter === 'envoye') return active.filter((c) => c.fcc_statut === 'Envoyé');
  if (filter === 'signe') return active.filter((c) => c.fcc_statut === 'Signé');
  if (filter === 'renouveler') return active.filter((c) => c.fcc_statut === 'À renouveler');
  return active;
}
