import type { Client } from './client';

export interface BeneficiaryFields {
  nom: string | null;
  ddn: string | null;
  lieuNaissance: string | null;
  nationalite: string | null;
  adresse: string | null;
  residenceFiscale: string | null;
  detention: string | null;
}

export interface Signataire {
  name: string;
  email: string;
  titre: string;
}

export interface Gestionnaire {
  id: string;
  name: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  phone?: string | null;
  role?: string | null;
  peutSignerDocusign: boolean;
  status: string;
  initiales?: string | null;
  couleur?: string | null;
  userId?: string | null;
}

export interface KycDocument {
  id: string;
  clientId: string | null;
  docType: string;
  recu: boolean;
  dateReception: string | null;
  dateValidite: string | null;
  urlDocument: string | null;
}

export interface NoteAttachment {
  name: string;
  url: string;
}

export interface ClientNote {
  id: string;
  clientId: string | null;
  date: string | null;
  noteType: string;
  auteur: string | null;
  contenu: string | null;
  piecesJointes: NoteAttachment[];
  source: string | null;
}

export interface ClientRelation {
  id: string;
  clientAId: string | null;
  clientBId: string | null;
  clientAName: string | null;
  clientBName: string | null;
  typeRelation: string | null;
  pctDetention: number | null;
  note: string | null;
}

export interface ClientTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priorite: string | null;
  assigneA: string | null;
  creePar?: string | null;
  dueDate: string | null;
  clientId: string | null;
}

export interface TimelineEvent {
  date: string;
  type: string;
  label: string;
  detail: string;
}

export interface SendDerInput {
  clientId: string;
  signataireName: string;
  signataireEmail: string;
  ldmType?: string;
  montantForfait?: string;
}

export interface SendLdmInput {
  clientId: string;
  signataireName: string;
  signataireEmail: string;
  ldmType: string;
  montantForfait?: string;
}

export interface SendFccResult {
  client: Client;
  link: string;
}

export interface TenantBranding {
  name: string;
  orias: string | null;
  accent: string;
  hasLogo?: boolean;
  logoDataUrl?: string | null;
}

export interface FccSubmission {
  id: string;
  clientId: string | null;
  submittedAt: string | null;
  formType: string;
  profilRisque: string | null;
  profilConnaissance: string | null;
  scoreConnaissance: number | null;
  scoreRisque: number | null;
  statut: string;
  docusignEnvelopeId: string | null;
  typeFormulaire: string | null;
  idFormulaire: string | null;
  dateSoumission: string | null;
  statutDossier: string | null;
  client: string | null;
  email: string | null;
  telephone: string | null;
  ville: string | null;
  profession: string | null;
  scoreTotal: number | null;
  sharepointFileUrl: string | null;
  sharepointFileId: string | null;
  ipClient: string | null;
  pdfFilename: string | null;
  boAgent: string | null;
}

export interface FccHistoryResponse {
  submissions: FccSubmission[];
}
