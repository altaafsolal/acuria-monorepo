import { BASEROW_FIELDS } from '../../../baserow/schema.js';
import {
  pickFieldValue,
  pickLinkRowId,
  pickTextValue,
} from '../../utils/baserow.js';
import { createRow, listAllRows, updateRow } from './api.js';
import { resolveTenantDbContext } from './tenant-context.js';
import { resolveTenantTableId } from './tenant-tables.js';
import type { BaserowRow, DbFccSubmission, PublicFccSubmission } from '../../types/domain.js';

const F = BASEROW_FIELDS.fccSubmissions;

function mapRow(row: BaserowRow): DbFccSubmission {
  return {
    id: String(row.id),
    name: String(row[F.name] || ''),
    client_id: pickLinkRowId(row[F.clientId]),
    submitted_at: pickTextValue(row[F.submittedAt]),
    form_type: pickTextValue(row[F.formType]) || 'PP',
    profil_risque: pickTextValue(row[F.profilRisque]),
    profil_connaissance: pickTextValue(row[F.profilConnaissance]),
    score_connaissance: typeof row[F.scoreConnaissance] === 'number' ? (row[F.scoreConnaissance] as number) : null,
    score_risque: typeof row[F.scoreRisque] === 'number' ? (row[F.scoreRisque] as number) : null,
    statut: pickFieldValue(row[F.statut]) || 'Soumis',
    raw_data: pickTextValue(row[F.rawData]),
    docusign_envelope_id: pickTextValue(row[F.docusignEnvelopeId]),
    airtable_record_id: pickTextValue(row[F.airtableRecordId]),
    type_formulaire: pickTextValue(row[F.typeFormulaire]),
    id_formulaire: pickTextValue(row[F.idFormulaire]),
    date_soumission: pickTextValue(row[F.dateSoumission]),
    statut_dossier: pickFieldValue(row[F.statutDossier]),
    client: pickTextValue(row[F.client]),
    email: pickTextValue(row[F.email]),
    telephone: pickTextValue(row[F.telephone]),
    ville: pickTextValue(row[F.ville]),
    profession: pickTextValue(row[F.profession]),
    score_total: typeof row[F.scoreTotal] === 'number' ? (row[F.scoreTotal] as number) : null,
    sharepoint_file_url: pickTextValue(row[F.sharepointFileUrl]),
    sharepoint_file_id: pickTextValue(row[F.sharepointFileId]),
    ip_client: pickTextValue(row[F.ipClient]),
    pdf_filename: pickTextValue(row[F.pdfFilename]),
    prefill_token: pickTextValue(row[F.prefillToken]),
    bo_agent: pickTextValue(row[F.boAgent]),
    be1_nom: pickTextValue(row[F.be1Nom]),
    be1_ddn: pickTextValue(row[F.be1Ddn]),
    be1_lieu_naissance: pickTextValue(row[F.be1LieuNaissance]),
    be1_nationalite: pickTextValue(row[F.be1Nationalite]),
    be1_residence_fiscale: pickTextValue(row[F.be1ResidenceFiscale]),
    be1_adresse: pickTextValue(row[F.be1Adresse]),
    be1_detention: pickTextValue(row[F.be1Detention]),
    be2_nom: pickTextValue(row[F.be2Nom]),
    be2_ddn: pickTextValue(row[F.be2Ddn]),
    be2_lieu_naissance: pickTextValue(row[F.be2LieuNaissance]),
    be2_nationalite: pickTextValue(row[F.be2Nationalite]),
    be2_residence_fiscale: pickTextValue(row[F.be2ResidenceFiscale]),
    be2_adresse: pickTextValue(row[F.be2Adresse]),
    be2_detention: pickTextValue(row[F.be2Detention]),
    be3_nom: pickTextValue(row[F.be3Nom]),
    be3_ddn: pickTextValue(row[F.be3Ddn]),
    be3_nationalite: pickTextValue(row[F.be3Nationalite]),
    be3_detention: pickTextValue(row[F.be3Detention]),
    be4_nom: pickTextValue(row[F.be4Nom]),
    be4_ddn: pickTextValue(row[F.be4Ddn]),
    be4_nationalite: pickTextValue(row[F.be4Nationalite]),
    be4_detention: pickTextValue(row[F.be4Detention]),
    client_denomination: pickTextValue(row[F.clientDenomination]),
    client_representant_nom: pickTextValue(row[F.clientRepresentantNom]),
    client_representant_fonction: pickTextValue(row[F.clientRepresentantFonction]),
    client_siren: pickTextValue(row[F.clientSiren]),
    client_naf: pickTextValue(row[F.clientNaf]),
    client_activite: pickTextValue(row[F.clientActivite]),
    client_forme_juridique: pickTextValue(row[F.clientFormeJuridique]),
    client_ca: pickTextValue(row[F.clientCa]),
    client_bilan: pickTextValue(row[F.clientBilan]),
    client_fonds_propres: pickTextValue(row[F.clientFondsPropres]),
    client_fiscalite: pickTextValue(row[F.clientFiscalite]),
  };
}

export function toPublicFccSubmission(sub: DbFccSubmission): PublicFccSubmission {
  return {
    id: sub.id,
    clientId: sub.client_id,
    submittedAt: sub.submitted_at,
    formType: sub.form_type,
    profilRisque: sub.profil_risque,
    profilConnaissance: sub.profil_connaissance,
    scoreConnaissance: sub.score_connaissance,
    scoreRisque: sub.score_risque,
    statut: sub.statut,
    docusignEnvelopeId: sub.docusign_envelope_id,
    typeFormulaire: sub.type_formulaire,
    idFormulaire: sub.id_formulaire,
    dateSoumission: sub.date_soumission,
    statutDossier: sub.statut_dossier,
    client: sub.client,
    email: sub.email,
    telephone: sub.telephone,
    ville: sub.ville,
    profession: sub.profession,
    scoreTotal: sub.score_total,
    sharepointFileUrl: sub.sharepoint_file_url,
    sharepointFileId: sub.sharepoint_file_id,
    ipClient: sub.ip_client,
    pdfFilename: sub.pdf_filename,
    boAgent: sub.bo_agent,
  };
}

export async function listSubmissionsByClient(tenantId: string, clientId: string): Promise<PublicFccSubmission[]> {
  const ctx = await resolveTenantDbContext(tenantId);
  const tableId = await resolveTenantTableId(tenantId, 'fcc_submissions');
  const rows = await listAllRows(tableId, {
    filters: { filter_type: 'AND', filters: [{ type: 'link_row_has', field: F.clientId, value: clientId }] },
  }, ctx);
  return rows.map(mapRow).map(toPublicFccSubmission);
}

export async function listAllSubmissions(tenantId: string): Promise<PublicFccSubmission[]> {
  const ctx = await resolveTenantDbContext(tenantId);
  const tableId = await resolveTenantTableId(tenantId, 'fcc_submissions');
  const rows = await listAllRows(tableId, {}, ctx);
  return rows.map(mapRow).map(toPublicFccSubmission);
}

export async function createSubmission(
  tenantId: string,
  input: {
    clientId?: string | null;
    formType: string;
    profilRisque?: string | null;
    profilConnaissance?: string | null;
    scoreConnaissance?: number | null;
    scoreRisque?: number | null;
    rawData?: string | null;
    typeFormulaire?: string | null;
    idFormulaire?: string | null;
    dateSoumission?: string | null;
    statutDossier?: string | null;
    client?: string | null;
    email?: string | null;
    telephone?: string | null;
    ville?: string | null;
    profession?: string | null;
    scoreTotal?: number | null;
    sharepointFileUrl?: string | null;
    sharepointFileId?: string | null;
    ipClient?: string | null;
    pdfFilename?: string | null;
    prefillToken?: string | null;
    boAgent?: string | null;
    be1Nom?: string | null;
    be1Ddn?: string | null;
    be1LieuNaissance?: string | null;
    be1Nationalite?: string | null;
    be1ResidenceFiscale?: string | null;
    be1Adresse?: string | null;
    be1Detention?: string | null;
    be2Nom?: string | null;
    be2Ddn?: string | null;
    be2LieuNaissance?: string | null;
    be2Nationalite?: string | null;
    be2ResidenceFiscale?: string | null;
    be2Adresse?: string | null;
    be2Detention?: string | null;
    be3Nom?: string | null;
    be3Ddn?: string | null;
    be3Nationalite?: string | null;
    be3Detention?: string | null;
    be4Nom?: string | null;
    be4Ddn?: string | null;
    be4Nationalite?: string | null;
    be4Detention?: string | null;
    clientDenomination?: string | null;
    clientRepresentantNom?: string | null;
    clientRepresentantFonction?: string | null;
    clientSiren?: string | null;
    clientNaf?: string | null;
    clientActivite?: string | null;
    clientFormeJuridique?: string | null;
    clientCa?: string | null;
    clientBilan?: string | null;
    clientFondsPropres?: string | null;
    clientFiscalite?: string | null;
  },
): Promise<PublicFccSubmission> {
  const ctx = await resolveTenantDbContext(tenantId);
  const tableId = await resolveTenantTableId(tenantId, 'fcc_submissions');
  const now = new Date().toISOString();
  const payload: Record<string, unknown> = {
    [F.name]: `FCC ${input.formType} — ${now.split('T')[0]}`,
    [F.submittedAt]: now,
    [F.formType]: input.formType,
    [F.profilRisque]: input.profilRisque ?? '',
    [F.profilConnaissance]: input.profilConnaissance ?? '',
    [F.scoreConnaissance]: input.scoreConnaissance ?? null,
    [F.scoreRisque]: input.scoreRisque ?? null,
    [F.statut]: 'Soumis',
    [F.rawData]: input.rawData ?? null,
    [F.typeFormulaire]: input.typeFormulaire ?? '',
    [F.idFormulaire]: input.idFormulaire ?? '',
    [F.dateSoumission]: input.dateSoumission ?? '',
    [F.statutDossier]: input.statutDossier ?? 'En attente',
    [F.client]: input.client ?? '',
    [F.email]: input.email ?? '',
    [F.telephone]: input.telephone ?? '',
    [F.ville]: input.ville ?? '',
    [F.profession]: input.profession ?? '',
    [F.scoreTotal]: input.scoreTotal ?? null,
    [F.sharepointFileUrl]: input.sharepointFileUrl ?? '',
    [F.sharepointFileId]: input.sharepointFileId ?? '',
    [F.ipClient]: input.ipClient ?? '',
    [F.pdfFilename]: input.pdfFilename ?? '',
    [F.prefillToken]: input.prefillToken ?? '',
    [F.boAgent]: input.boAgent ?? '',
    [F.be1Nom]: input.be1Nom ?? '',
    [F.be1Ddn]: input.be1Ddn ?? '',
    [F.be1LieuNaissance]: input.be1LieuNaissance ?? '',
    [F.be1Nationalite]: input.be1Nationalite ?? '',
    [F.be1ResidenceFiscale]: input.be1ResidenceFiscale ?? '',
    [F.be1Adresse]: input.be1Adresse ?? '',
    [F.be1Detention]: input.be1Detention ?? '',
    [F.be2Nom]: input.be2Nom ?? '',
    [F.be2Ddn]: input.be2Ddn ?? '',
    [F.be2LieuNaissance]: input.be2LieuNaissance ?? '',
    [F.be2Nationalite]: input.be2Nationalite ?? '',
    [F.be2ResidenceFiscale]: input.be2ResidenceFiscale ?? '',
    [F.be2Adresse]: input.be2Adresse ?? '',
    [F.be2Detention]: input.be2Detention ?? '',
    [F.be3Nom]: input.be3Nom ?? '',
    [F.be3Ddn]: input.be3Ddn ?? '',
    [F.be3Nationalite]: input.be3Nationalite ?? '',
    [F.be3Detention]: input.be3Detention ?? '',
    [F.be4Nom]: input.be4Nom ?? '',
    [F.be4Ddn]: input.be4Ddn ?? '',
    [F.be4Nationalite]: input.be4Nationalite ?? '',
    [F.be4Detention]: input.be4Detention ?? '',
    [F.clientDenomination]: input.clientDenomination ?? '',
    [F.clientRepresentantNom]: input.clientRepresentantNom ?? '',
    [F.clientRepresentantFonction]: input.clientRepresentantFonction ?? '',
    [F.clientSiren]: input.clientSiren ?? '',
    [F.clientNaf]: input.clientNaf ?? '',
    [F.clientActivite]: input.clientActivite ?? '',
    [F.clientFormeJuridique]: input.clientFormeJuridique ?? '',
    [F.clientCa]: input.clientCa ?? '',
    [F.clientBilan]: input.clientBilan ?? '',
    [F.clientFondsPropres]: input.clientFondsPropres ?? '',
    [F.clientFiscalite]: input.clientFiscalite ?? '',
  };
  if (input.clientId) {
    payload[F.clientId] = [Number(input.clientId)];
  }
  const row = await createRow(tableId, payload, ctx);
  return toPublicFccSubmission(mapRow(row));
}

export async function updateSubmissionStatus(
  tenantId: string,
  submissionId: string,
  statut: string,
  docusignEnvelopeId?: string,
): Promise<PublicFccSubmission> {
  const ctx = await resolveTenantDbContext(tenantId);
  const tableId = await resolveTenantTableId(tenantId, 'fcc_submissions');
  const payload: Record<string, unknown> = { [F.statut]: statut };
  if (docusignEnvelopeId) payload[F.docusignEnvelopeId] = docusignEnvelopeId;
  const row = await updateRow(tableId, submissionId, payload, ctx);
  return toPublicFccSubmission(mapRow(row));
}

export async function upsertSubmissionFromAirtable(
  tenantId: string,
  data: {
    clientId?: string | null;
    submittedAt?: string | null;
    formType?: string | null;
    profilRisque?: string | null;
    profilConnaissance?: string | null;
    scoreConnaissance?: number | null;
    scoreRisque?: number | null;
    statut?: string | null;
    airtableRecordId: string;
    typeFormulaire?: string | null;
    idFormulaire?: string | null;
    dateSoumission?: string | null;
    statutDossier?: string | null;
    client?: string | null;
    email?: string | null;
    telephone?: string | null;
    ville?: string | null;
    profession?: string | null;
    scoreTotal?: number | null;
    sharepointFileUrl?: string | null;
    sharepointFileId?: string | null;
    ipClient?: string | null;
    pdfFilename?: string | null;
    prefillToken?: string | null;
    boAgent?: string | null;
    be1Nom?: string | null;
    be1Ddn?: string | null;
    be1LieuNaissance?: string | null;
    be1Nationalite?: string | null;
    be1ResidenceFiscale?: string | null;
    be1Adresse?: string | null;
    be1Detention?: string | null;
    be2Nom?: string | null;
    be2Ddn?: string | null;
    be2LieuNaissance?: string | null;
    be2Nationalite?: string | null;
    be2ResidenceFiscale?: string | null;
    be2Adresse?: string | null;
    be2Detention?: string | null;
    be3Nom?: string | null;
    be3Ddn?: string | null;
    be3Nationalite?: string | null;
    be3Detention?: string | null;
    be4Nom?: string | null;
    be4Ddn?: string | null;
    be4Nationalite?: string | null;
    be4Detention?: string | null;
    clientDenomination?: string | null;
    clientRepresentantNom?: string | null;
    clientRepresentantFonction?: string | null;
    clientSiren?: string | null;
    clientNaf?: string | null;
    clientActivite?: string | null;
    clientFormeJuridique?: string | null;
    clientCa?: string | null;
    clientBilan?: string | null;
    clientFondsPropres?: string | null;
    clientFiscalite?: string | null;
    docusignEnvelopeId?: string | null;
  },
): Promise<DbFccSubmission> {
  const ctx = await resolveTenantDbContext(tenantId);
  const tableId = await resolveTenantTableId(tenantId, 'fcc_submissions');
  const rows = await listAllRows(tableId, {}, ctx);
  const existing = rows.find((r) => pickTextValue(r[F.airtableRecordId]) === data.airtableRecordId);
  const submittedAt = data.submittedAt || new Date().toISOString();
  const formType = data.formType || 'PP';
  const rowPayload: Record<string, unknown> = {
    [F.name]: `FCC ${formType} — ${submittedAt.split('T')[0]}`,
    [F.clientId]: data.clientId ? [Number(data.clientId)] : [],
    [F.submittedAt]: submittedAt,
    [F.formType]: formType,
    [F.profilRisque]: data.profilRisque ?? '',
    [F.profilConnaissance]: data.profilConnaissance ?? '',
    [F.scoreConnaissance]: data.scoreConnaissance ?? null,
    [F.scoreRisque]: data.scoreRisque ?? null,
    [F.statut]: data.statut || 'Soumis',
    [F.airtableRecordId]: data.airtableRecordId,
    [F.typeFormulaire]: data.typeFormulaire ?? '',
    [F.idFormulaire]: data.idFormulaire ?? '',
    [F.dateSoumission]: data.dateSoumission ?? '',
    [F.statutDossier]: data.statutDossier ?? '',
    [F.client]: data.client ?? '',
    [F.email]: data.email ?? '',
    [F.telephone]: data.telephone ?? '',
    [F.ville]: data.ville ?? '',
    [F.profession]: data.profession ?? '',
    [F.scoreTotal]: data.scoreTotal ?? null,
    [F.sharepointFileUrl]: data.sharepointFileUrl ?? '',
    [F.sharepointFileId]: data.sharepointFileId ?? '',
    [F.ipClient]: data.ipClient ?? '',
    [F.pdfFilename]: data.pdfFilename ?? '',
    [F.prefillToken]: data.prefillToken ?? '',
    [F.boAgent]: data.boAgent ?? '',
    [F.be1Nom]: data.be1Nom ?? '',
    [F.be1Ddn]: data.be1Ddn ?? '',
    [F.be1LieuNaissance]: data.be1LieuNaissance ?? '',
    [F.be1Nationalite]: data.be1Nationalite ?? '',
    [F.be1ResidenceFiscale]: data.be1ResidenceFiscale ?? '',
    [F.be1Adresse]: data.be1Adresse ?? '',
    [F.be1Detention]: data.be1Detention ?? '',
    [F.be2Nom]: data.be2Nom ?? '',
    [F.be2Ddn]: data.be2Ddn ?? '',
    [F.be2LieuNaissance]: data.be2LieuNaissance ?? '',
    [F.be2Nationalite]: data.be2Nationalite ?? '',
    [F.be2ResidenceFiscale]: data.be2ResidenceFiscale ?? '',
    [F.be2Adresse]: data.be2Adresse ?? '',
    [F.be2Detention]: data.be2Detention ?? '',
    [F.be3Nom]: data.be3Nom ?? '',
    [F.be3Ddn]: data.be3Ddn ?? '',
    [F.be3Nationalite]: data.be3Nationalite ?? '',
    [F.be3Detention]: data.be3Detention ?? '',
    [F.be4Nom]: data.be4Nom ?? '',
    [F.be4Ddn]: data.be4Ddn ?? '',
    [F.be4Nationalite]: data.be4Nationalite ?? '',
    [F.be4Detention]: data.be4Detention ?? '',
    [F.clientDenomination]: data.clientDenomination ?? '',
    [F.clientRepresentantNom]: data.clientRepresentantNom ?? '',
    [F.clientRepresentantFonction]: data.clientRepresentantFonction ?? '',
    [F.clientSiren]: data.clientSiren ?? '',
    [F.clientNaf]: data.clientNaf ?? '',
    [F.clientActivite]: data.clientActivite ?? '',
    [F.clientFormeJuridique]: data.clientFormeJuridique ?? '',
    [F.clientCa]: data.clientCa ?? '',
    [F.clientBilan]: data.clientBilan ?? '',
    [F.clientFondsPropres]: data.clientFondsPropres ?? '',
    [F.clientFiscalite]: data.clientFiscalite ?? '',
    [F.docusignEnvelopeId]: data.docusignEnvelopeId ?? '',
  };
  if (existing) {
    return mapRow(await updateRow(tableId, existing.id, rowPayload, ctx));
  }
  return mapRow(await createRow(tableId, rowPayload, ctx));
}
