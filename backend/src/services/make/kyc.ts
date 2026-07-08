import { env } from '../../config/env.js';
import { webhookUrl, postWebhook } from './http.js';
import type { DbClient } from '../../types/domain.js';

export const NM_SIGNATAIRES = {
  'Baptiste Money': { name: 'Baptiste Money', email: 'baptistemoney@nm-prime.com', titre: 'Président' },
  'Jean du Boisdulier': { name: 'Jean du Boisdulier', email: 'jeanduboisdulier@nm-prime.com', titre: 'Directeur Général Délégué' },
} as const;

export interface KycWebhookVars {
  record_id: string;
  ldm_template_id?: string;
  der_template_id?: string;
  type_ldm?: string;
  ldm_filename?: string;
  der_filename?: string;
  client_email: string;
  client_name: string;
  nm_email: string;
  nm_name: string;
  nm_titre: string;
  civilite_nom_prenom?: string;
  adresse_complete?: string;
  date_naissance?: string;
  lieu_naissance?: string;
  email_client?: string;
  nm_signataire?: string;
  montant_forfait?: string;
  denomination?: string;
  capital?: string;
  adresse_siege?: string;
  rcs_ville?: string;
  siren?: string;
  representant_nom?: string;
  dropbox_path_ldm?: string;
  dropbox_path_der?: string;
  der_envoi_timestamp?: string;
  der_envoi_local?: string;
}

function getLdmTemplateIds(): Record<string, string> {
  return {
    PP_SANS: env.kyc.ldmTemplatePpSans,
    PP_AVEC: env.kyc.ldmTemplatePpAvec,
    PM_SANS: env.kyc.ldmTemplatePmSans,
    PM_AVEC: env.kyc.ldmTemplatePmAvec,
  };
}

export function buildKycVars(
  client: DbClient,
  options: {
    ldmType?: string;
    signataireName: string;
    signataireEmail: string;
    montantForfait?: string;
    dropboxPathBase?: string;
  },
): KycWebhookVars {
  const isPP = client.client_type === 'PP';
  const type = options.ldmType || '';
  const nomClient = isPP
    ? [client.first_name, client.last_name?.toUpperCase()].filter(Boolean).join(' ')
    : (client.trade_name || client.name || '').toUpperCase();
  const today = new Date().toISOString().split('T')[0];
  const nomFile = nomClient.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
  const nmTitre = options.signataireName === 'Baptiste Money' ? 'Président' : 'Directeur Général Délégué';

  const ldmTemplateIds = getLdmTemplateIds();
  return {
    record_id: client.id,
    ldm_template_id: type ? ldmTemplateIds[type] : undefined,
    der_template_id: env.kyc.derTemplateId,
    type_ldm: type || undefined,
    ldm_filename: type ? `${nomFile}_LDM_${today}` : undefined,
    der_filename: `${nomFile}_DER_${today}`,
    client_email: client.email,
    client_name: nomClient,
    nm_email: options.signataireEmail,
    nm_name: options.signataireName,
    nm_titre: nmTitre,
    civilite_nom_prenom: isPP
      ? [client.civilite, client.first_name, client.last_name?.toUpperCase()].filter(Boolean).join(' ')
      : '',
    adresse_complete: isPP ? [client.address, client.postal_code, client.city].filter(Boolean).join(', ') : '',
    date_naissance: isPP && client.birth_date
      ? new Date(client.birth_date).toLocaleDateString('fr-FR')
      : '',
    lieu_naissance: isPP ? (client.birth_place || '') : '',
    email_client: client.email,
    nm_signataire: options.signataireName,
    montant_forfait: type.endsWith('AVEC') ? (options.montantForfait || '') : '',
    denomination: !isPP ? (client.trade_name || client.name || '') : '',
    capital: !isPP ? (client.capital || client.equity || '') : '',
    adresse_siege: !isPP ? [client.address, client.postal_code, client.city].filter(Boolean).join(', ') : '',
    rcs_ville: !isPP ? (client.city || '') : '',
    siren: !isPP ? (client.siren || '') : '',
    representant_nom: !isPP ? (client.legal_rep_name || '') : '',
    dropbox_path_ldm: options.dropboxPathBase ? `${options.dropboxPathBase}/${nomFile}_LDM_${today}.pdf` : '',
    dropbox_path_der: options.dropboxPathBase ? `${options.dropboxPathBase}/${nomFile}_DER_${today}.pdf` : '',
  };
}

export function buildFccPrefillLink(
  client: DbClient,
  tenant?: { id?: string; name: string; orias?: string | null; email?: string | null },
): { link: string; type: 'PP' | 'PM' } {
  const type = client.client_type === 'PM' ? 'PM' : 'PP';
  const baseUrl = type === 'PP' ? `${env.appUrl}/fcc/pp` : `${env.appUrl}/fcc/pm`;
  const tenantMeta = tenant
    ? {
        _tenant_id: tenant.id || '',
        _tenant_name: tenant.name,
        _tenant_orias: tenant.orias || '',
        _tenant_email: tenant.email || '',
      }
    : {};
  const prefillData = type === 'PP'
    ? {
      _record_id: client.id,
      ...tenantMeta,
      civilite: client.civilite || '',
      nom: (client.last_name || '').toUpperCase(),
      prenom: client.first_name || '',
      adresse: client.address || '',
      cp: client.postal_code || '',
      ville: client.city || '',
      tel_mobile: client.phone_mobile || client.phone || '',
      email: client.email || '',
      ddn: client.birth_date || '',
      nationalite: client.nationality || '',
      situation: client.marital_status || '',
      regime: client.matrimonial_regime || '',
      profession: client.profession || '',
      statut: client.pro_status || '',
      secteur: client.sector || '',
      societe: client.employer || '',
      revenus: client.annual_income != null ? String(client.annual_income) : '',
      charges: client.current_charges != null ? String(client.current_charges) : '',
      pat_immo: client.patrimoine_immobilier || '',
      pat_epargne: client.patrimoine_epargne || '',
      pat_liqui: client.patrimoine_liquidites || '',
      pat_partici: client.patrimoine_participations || '',
      pat_autres: client.patrimoine_autres || '',
    }
    : {
      _record_id: client.id,
      ...tenantMeta,
      denomination: client.trade_name || client.name || '',
      siren: client.siren || '',
      naf: client.naf_code || '',
      adresse: client.address || '',
      cp: client.postal_code || '',
      ville: client.city || '',
      email: client.email || '',
      tel: client.phone || '',
      representant: client.legal_rep_name || '',
      fonction: client.legal_rep_role || '',
    };

  const encoded = Buffer.from(JSON.stringify(prefillData), 'utf8').toString('base64');
  return { link: `${baseUrl}?data=${encoded}`, type };
}

export async function sendLdmDocuSign(
  vars: KycWebhookVars,
  tenantName: string,
  tenantEmail: string,
  tenantDropbox: string,
  clientsTableId: string,
): Promise<void> {
  await postWebhook(webhookUrl('webhookLdm'), {
    ...vars,
    tenant_name: tenantName,
    tenant_email: tenantEmail,
    tenant_dropbox: tenantDropbox,
    baserow_table_id: clientsTableId,
  });
}

export async function previewLdm(vars: KycWebhookVars): Promise<Buffer> {
  const res = await postWebhook(webhookUrl('webhookPreview'), vars);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function sendFccEmail(
  clientName: string,
  clientEmail: string,
  link: string,
  tenantName: string,
  tenantEmail: string,
): Promise<void> {
  await postWebhook(webhookUrl('webhookFccSend'), {
    client_email: clientEmail,
    client_name: clientName,
    lien_prefill: link,
    tenant_name: tenantName,
    tenant_email: tenantEmail,
  });
}

export async function sendFccDocuSign(
  clientId: string,
  clientName: string,
  clientEmail: string,
  formType: 'PP' | 'PM',
  tenantName: string,
  tenantEmail: string,
  tenantId?: string,
): Promise<void> {
  await postWebhook(webhookUrl('webhookFccDocusign'), {
    record_id: clientId,
    client_email: clientEmail,
    client_name: clientName,
    form_type: formType,
    tenant_id: tenantId || '',
    tenant_name: tenantName,
    tenant_email: tenantEmail,
  });
}

export function ldmAvailableDate(derDate: string | null): Date | null {
  if (!derDate) return null;
  const d = new Date(derDate);
  d.setDate(d.getDate() + 2);
  return d;
}

export function ldmIsUnlocked(derDate: string | null): boolean {
  const avail = ldmAvailableDate(derDate);
  if (!avail) return false;
  return new Date() >= avail;
}

export function derIsSent(statut: string | null | undefined): boolean {
  return statut === 'Envoyé' || statut === 'Signé';
}
