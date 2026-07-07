import { clientsRepo, notesRepo, tasksRepo, clientMapper, tenantsRepo, tenantTables } from './baserow/index.js';
import { filterTasksForUser } from './lib/task-access.js';
import {
  buildFccPrefillLink,
  buildKycVars,
  derIsSent,
  ldmAvailableDate,
  ldmIsUnlocked,
  previewLdm,
  sendDerEmail,
  sendFccDocuSign,
  sendFccEmail,
  sendLdmDocuSign,
} from './make/index.js';
import { filterDerClients, filterFccClients } from './lib/client-filters.js';
import type { PublicClient, SendDerInput, SendLdmInput } from '../types/domain.js';

const { resolveClientDisplayName, toPublicClient } = clientMapper;

export async function listDerClients(tenantId: string, filter = ''): Promise<PublicClient[]> {
  const clients = filterDerClients(await clientsRepo.listClientsByTenantId(tenantId), filter);
  return clients.map(toPublicClient);
}

export async function listFccClients(tenantId: string, filter = ''): Promise<PublicClient[]> {
  const clients = filterFccClients(await clientsRepo.listClientsByTenantId(tenantId), filter);
  return clients.map(toPublicClient);
}

export async function sendDer(tenantId: string, input: SendDerInput): Promise<PublicClient> {
  const [client, tenant] = await Promise.all([
    clientsRepo.getClientById(tenantId, input.clientId),
    tenantsRepo.findTenantById(tenantId),
  ]);
  if (!client) throw new Error('Client not found');
  if (!client.email) throw new Error('Email client manquant');

  const vars = buildKycVars(client, {
    signataireName: input.signataireName,
    signataireEmail: input.signataireEmail,
    ldmType: input.ldmType,
    montantForfait: input.montantForfait,
    dropboxPathBase: tenant?.dropbox_path_base || '',
  });

  const tenantName = tenant?.branding_name || tenant?.name || '';
  const tenantEmail = tenant?.email || '';
  await sendDerEmail(vars, tenantName, tenantEmail);

  const today = new Date().toISOString().split('T')[0];
  const updated = await clientsRepo.patchClientKycFields(tenantId, client.id, {
    der_statut: 'Envoyé',
    der_date: today,
    der_envoi_timestamp: new Date().toISOString(),
  });

  return toPublicClient(updated!);
}

export async function sendLdm(tenantId: string, input: SendLdmInput): Promise<PublicClient> {
  const [client, tenant, clientsTableId] = await Promise.all([
    clientsRepo.getClientById(tenantId, input.clientId),
    tenantsRepo.findTenantById(tenantId),
    tenantTables.resolveTenantTableId(tenantId, 'clients'),
  ]);
  if (!client) throw new Error('Client not found');
  if (!derIsSent(client.der_statut)) throw new Error('La DER doit être envoyée avant la LdM');
  if (!ldmIsUnlocked(client.der_date)) {
    const avail = ldmAvailableDate(client.der_date);
    throw new Error(`LdM disponible à partir du ${avail?.toLocaleDateString('fr-FR')} (délai AMF 48h)`);
  }
  if (!input.ldmType) throw new Error('Type de lettre de mission requis');

  const vars = buildKycVars(client, {
    signataireName: input.signataireName,
    signataireEmail: input.signataireEmail,
    ldmType: input.ldmType,
    montantForfait: input.montantForfait,
    dropboxPathBase: tenant?.dropbox_path_base || '',
  });

  const tenantName = tenant?.branding_name || tenant?.name || '';
  const tenantEmail = tenant?.email || '';
  const tenantDropbox = tenant?.dropbox_path_base || '';
  await sendLdmDocuSign(vars, tenantName, tenantEmail, tenantDropbox, clientsTableId);

  const updated = await clientsRepo.patchClientKycFields(tenantId, client.id, {
    ldm_statut: 'Envoyé',
    ldm_date: new Date().toISOString().split('T')[0],
  });

  return toPublicClient(updated!);
}

export async function previewLdmPdf(tenantId: string, input: SendLdmInput): Promise<Buffer> {
  const [client, tenant] = await Promise.all([
    clientsRepo.getClientById(tenantId, input.clientId),
    tenantsRepo.findTenantById(tenantId),
  ]);
  if (!client) throw new Error('Client not found');
  if (!input.ldmType) throw new Error('Type de lettre de mission requis');

  const vars = buildKycVars(client, {
    signataireName: input.signataireName,
    signataireEmail: input.signataireEmail,
    ldmType: input.ldmType,
    montantForfait: input.montantForfait,
    dropboxPathBase: tenant?.dropbox_path_base || '',
  });

  return previewLdm(vars);
}

export async function sendFccDocusign(tenantId: string, clientId: string): Promise<PublicClient> {
  const [client, tenant] = await Promise.all([
    clientsRepo.getClientById(tenantId, clientId),
    tenantsRepo.findTenantById(tenantId),
  ]);
  if (!client) throw new Error('Client not found');
  if (!client.email) throw new Error('Email client manquant');

  const name = resolveClientDisplayName(client);
  const formType = client.client_type === 'PM' ? 'PM' : 'PP';
  const tenantName = tenant?.branding_name || tenant?.name || '';
  const tenantEmail = tenant?.email || '';

  await sendFccDocuSign(client.id, name, client.email, formType, tenantName, tenantEmail);

  const updated = await clientsRepo.patchClientKycFields(tenantId, client.id, {
    fcc_statut: 'DocuSign envoyé',
    fcc_date: client.fcc_date || new Date().toISOString().split('T')[0],
  });

  return toPublicClient(updated!);
}

export async function sendFcc(tenantId: string, clientId: string): Promise<{ client: PublicClient; link: string }> {
  const [client, tenant] = await Promise.all([
    clientsRepo.getClientById(tenantId, clientId),
    tenantsRepo.findTenantById(tenantId),
  ]);
  if (!client) throw new Error('Client not found');

  const tenantBranding = tenant
    ? { name: tenant.branding_name || tenant.name, orias: tenant.branding_orias, email: tenant.email }
    : undefined;
  const { link } = buildFccPrefillLink(client, tenantBranding);
  const name = resolveClientDisplayName(client);
  const tenantName = tenant?.branding_name || tenant?.name || '';
  const tenantEmail = tenant?.email || '';

  if (client.email) {
    await sendFccEmail(name, client.email, link, tenantName, tenantEmail);
    const updated = await clientsRepo.patchClientKycFields(tenantId, client.id, {
      fcc_statut: 'Envoyé',
      fcc_date: new Date().toISOString().split('T')[0],
    });
    return { client: toPublicClient(updated!), link };
  }

  return { client: toPublicClient(client), link };
}

export async function getClientTimeline(
  tenantId: string,
  clientId: string,
  viewer?: { userId: string; userName: string; role: import('../types/domain.js').Role },
) {
  const client = await clientsRepo.getClientById(tenantId, clientId);
  if (!client) return [];

  const [notes, tasks, dbTasks] = await Promise.all([
    notesRepo.listNotesByClient(tenantId, clientId),
    tasksRepo.listTasksByClient(tenantId, clientId),
    tasksRepo.listDbTasksByClientId(tenantId, clientId),
  ]);

  let visibleTasks = tasks;
  if (viewer) {
    visibleTasks = await filterTasksForUser(tenantId, tasks, dbTasks, viewer);
  }

  const events: Array<{ date: string; type: string; label: string; detail: string }> = [];

  if (client.date_entree) {
    events.push({ date: client.date_entree, type: 'client', label: 'Entrée en relation', detail: '' });
  }
  if (client.der_date) {
    events.push({ date: client.der_date, type: 'der', label: `DER — ${client.der_statut}`, detail: '' });
  }
  if (client.ldm_date) {
    events.push({ date: client.ldm_date, type: 'ldm', label: `LdM — ${client.ldm_statut}`, detail: '' });
  }
  if (client.fcc_date) {
    events.push({ date: client.fcc_date, type: 'fcc', label: `FCC — ${client.fcc_statut}`, detail: '' });
  }

  for (const note of notes) {
    events.push({
      date: note.date || '',
      type: 'note',
      label: `${note.noteType} — ${note.auteur || ''}`,
      detail: note.contenu || '',
    });
  }

  for (const task of visibleTasks) {
    events.push({
      date: task.dueDate || '',
      type: 'task',
      label: `${task.title} — ${task.status}`,
      detail: task.assigneA || '',
    });
  }

  return events
    .filter((e) => e.date)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
