import { clientsRepo, kycDocsRepo, clientMapper } from './baserow/index.js';
import { derIsSent, ldmIsUnlocked } from './make.js';
import type { AccueilResponse, AccueilStats, AccueilTodoItem, DbClient } from '../types/domain.js';

const { excludeArchived, resolveClientDisplayName } = clientMapper;

const ID_DOC_TYPES = ['CNI', 'Passeport', 'Pièce d\'identité'];

function isExpiringSoon(dateValidite: string | null, months = 6): boolean {
  if (!dateValidite) return false;
  const expiry = new Date(dateValidite);
  const threshold = new Date();
  threshold.setMonth(threshold.getMonth() + months);
  return expiry <= threshold;
}

function isExpired(dateValidite: string | null): boolean {
  if (!dateValidite) return false;
  return new Date(dateValidite) < new Date();
}

function computeCrmStats(clients: DbClient[]): AccueilStats['crm'] {
  return {
    total: clients.length,
    prospects: clients.filter((c) => c.statut_client === 'Prospect').length,
    actifs: clients.filter((c) => c.statut_client === 'Client actif').length,
    inactifs: clients.filter((c) => c.statut_client === 'Inactif').length,
  };
}

function computeDerStats(clients: DbClient[]): AccueilStats['der'] {
  return {
    total: clients.length,
    aEnvoyer: clients.filter((c) => !c.der_statut || c.der_statut === 'Non envoyé').length,
    derEnvoye: clients.filter((c) => c.der_statut === 'Envoyé').length,
    ldmEnvoye: clients.filter((c) => c.ldm_statut === 'Envoyé').length,
    signe: clients.filter((c) => c.ldm_statut === 'Signé').length,
  };
}

function computeFccStats(clients: DbClient[]): AccueilStats['fcc'] {
  return {
    total: clients.length,
    aEnvoyer: clients.filter((c) => !c.fcc_statut || c.fcc_statut === 'Non envoyé').length,
    envoye: clients.filter((c) => c.fcc_statut === 'Envoyé').length,
    signe: clients.filter((c) => c.fcc_statut === 'Signé').length,
    renouveler: clients.filter((c) => c.fcc_statut === 'À renouveler').length,
  };
}

export async function getAccueilData(tenantId: string): Promise<AccueilResponse> {
  const allClients = await clientsRepo.listClientsByTenantId(tenantId);
  const clients = excludeArchived(allClients);
  const kycDocs = await kycDocsRepo.listAllKycDocuments(tenantId);

  const stats: AccueilStats = {
    crm: computeCrmStats(clients),
    der: computeDerStats(clients),
    fcc: computeFccStats(clients),
  };

  const kycTodos: AccueilTodoItem[] = [];
  for (const doc of kycDocs) {
    if (!doc.client_id) continue;
    const client = clients.find((c) => c.id === doc.client_id);
    if (!client) continue;
    const isIdDoc = ID_DOC_TYPES.some((t) => doc.doc_type.toLowerCase().includes(t.toLowerCase()));
    if (!isIdDoc) continue;
    if (!isExpiringSoon(doc.date_validite) && !isExpired(doc.date_validite)) continue;
    kycTodos.push({
      id: `kyc-doc-${doc.id}`,
      clientId: client.id,
      clientName: resolveClientDisplayName(client),
      label: `${doc.doc_type} — ${isExpired(doc.date_validite) ? 'expiré' : 'expire bientôt'}`,
      priority: isExpired(doc.date_validite) ? 1 : 2,
      kind: 'kyc_doc',
    });
  }

  const complianceTodos: AccueilTodoItem[] = [];
  for (const client of clients) {
    const name = resolveClientDisplayName(client);
    if (!client.der_statut || client.der_statut === 'Non envoyé') {
      complianceTodos.push({
        id: `der-${client.id}`,
        clientId: client.id,
        clientName: name,
        label: 'DER à envoyer',
        priority: 1,
        kind: 'compliance',
      });
      continue;
    }
    if (derIsSent(client.der_statut) && ldmIsUnlocked(client.der_date)
      && (!client.ldm_statut || client.ldm_statut === 'Non envoyé')) {
      complianceTodos.push({
        id: `ldm-${client.id}`,
        clientId: client.id,
        clientName: name,
        label: 'Lettre de mission à envoyer',
        priority: 2,
        kind: 'compliance',
      });
      continue;
    }
    if (!client.fcc_statut || client.fcc_statut === 'Non envoyé') {
      complianceTodos.push({
        id: `fcc-${client.id}`,
        clientId: client.id,
        clientName: name,
        label: 'FCC à envoyer',
        priority: 3,
        kind: 'compliance',
      });
      continue;
    }
    if (client.fcc_statut === 'À renouveler') {
      complianceTodos.push({
        id: `fcc-renew-${client.id}`,
        clientId: client.id,
        clientName: name,
        label: 'FCC à renouveler',
        priority: 4,
        kind: 'compliance',
      });
    }
  }

  complianceTodos.sort((a, b) => a.priority - b.priority);
  kycTodos.sort((a, b) => a.priority - b.priority);

  return { stats, kycTodos, complianceTodos };
}

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
