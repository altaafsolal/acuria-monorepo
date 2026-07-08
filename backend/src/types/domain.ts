export type Role = 'super_admin' | 'tenant_admin' | 'standard_user';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  tenantId: string | null;
}

export interface TokenPayload {
  user_id: string;
  email: string;
  name: string;
  role: Role;
}

export interface DbUser {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: string;
  tenant_id: string | null;
  status: string;
  reset_token_hash: string | null;
  reset_token_expires: string | null;
  otp_hash: string | null;
  otp_expires: string | null;
  created_on: string | null;
  updated_on: string | null;
  airtable_record_id: string | null;
}

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string | null;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface TenantRecord {
  id: string;
  name: string;
  slug: string;
  status: string;
  workspace_id: string | null;
  database_id: string | null;
  database_token: string | null;
  branding_name: string | null;
  branding_orias: string | null;
  branding_accent: string | null;
  branding_logo: Array<{
    name: string;
    url: string;
    visibleName: string | null;
    size: number | null;
  }>;
  sharepoint_path_base: string | null;
  email: string | null;
  created_on: string | null;
  updated_on: string | null;
}

export interface PublicTenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
  userCount?: number;
  clientCount?: number;
  brandingName?: string | null;
  brandingOrias?: string | null;
  brandingAccent?: string | null;
  hasBrandingLogo?: boolean;
  brandingLogoDataUrl?: string | null;
  workspaceId?: string | null;
  databaseId?: string | null;
  databaseToken?: string | null;
  sharepointPathBase?: string | null;
  email?: string | null;
}

export interface BeneficiaryFields {
  nom: string | null;
  ddn: string | null;
  lieuNaissance: string | null;
  nationalite: string | null;
  adresse: string | null;
  residenceFiscale: string | null;
  detention: string | null;
}

export interface DbClient {
  id: string;
  name: string;
  email: string;
  client_type: string;
  kyc_status: string;
  status: string;
  statut_client: string;
  signataire: string | null;
  gestionnaire: string | null;
  origine: string | null;
  date_entree: string | null;
  phone: string | null;
  phone_mobile: string | null;
  phone_home: string | null;
  phone_office: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  civilite: string | null;
  first_name: string | null;
  last_name: string | null;
  birth_date: string | null;
  birth_place: string | null;
  nationality: string | null;
  marital_status: string | null;
  matrimonial_regime: string | null;
  profession: string | null;
  pro_status: string | null;
  sector: string | null;
  employer: string | null;
  annual_income: number | null;
  current_charges: number | null;
  trade_name: string | null;
  legal_form: string | null;
  siren: string | null;
  naf_code: string | null;
  activity: string | null;
  legal_rep_name: string | null;
  legal_rep_role: string | null;
  revenue: string | null;
  total_balance: string | null;
  equity: string | null;
  taxation: string | null;
  fiscal_country: string | null;
  capital: string | null;
  patrimoine_immobilier: string | null;
  patrimoine_epargne: string | null;
  patrimoine_participations: string | null;
  patrimoine_liquidites: string | null;
  patrimoine_autres: string | null;
  fcc_statut: string;
  fcc_date: string | null;
  der_statut: string;
  der_date: string | null;
  der_envoi_timestamp: string | null;
  ldm_statut: string;
  ldm_date: string | null;
  notes_internes: string | null;
  airtable_record_id: string | null;
  be1_nom: string | null;
  be1_ddn: string | null;
  be1_lieu_naissance: string | null;
  be1_nationalite: string | null;
  be1_adresse: string | null;
  be1_residence_fiscale: string | null;
  be1_detention: string | null;
  be2_nom: string | null;
  be2_ddn: string | null;
  be2_lieu_naissance: string | null;
  be2_nationalite: string | null;
  be2_adresse: string | null;
  be2_residence_fiscale: string | null;
  be2_detention: string | null;
  be3_nom: string | null;
  be3_ddn: string | null;
  be3_lieu_naissance: string | null;
  be3_nationalite: string | null;
  be3_adresse: string | null;
  be3_residence_fiscale: string | null;
  be3_detention: string | null;
  be4_nom: string | null;
  be4_ddn: string | null;
  be4_lieu_naissance: string | null;
  be4_nationalite: string | null;
  be4_adresse: string | null;
  be4_residence_fiscale: string | null;
  be4_detention: string | null;
}

export interface PublicClient {
  id: string;
  name: string;
  email: string;
  clientType: string;
  kycStatus: string;
  status: string;
  statutClient: string;
  signataire: string | null;
  gestionnaire: string | null;
  origine: string | null;
  dateEntree: string | null;
  phone: string | null;
  phoneMobile: string | null;
  phoneHome: string | null;
  phoneOffice: string | null;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
  civilite: string | null;
  firstName: string | null;
  lastName: string | null;
  birthDate: string | null;
  birthPlace: string | null;
  nationality: string | null;
  maritalStatus: string | null;
  matrimonialRegime: string | null;
  profession: string | null;
  proStatus: string | null;
  sector: string | null;
  employer: string | null;
  annualIncome: number | null;
  currentCharges: number | null;
  tradeName: string | null;
  legalForm: string | null;
  siren: string | null;
  nafCode: string | null;
  activity: string | null;
  legalRepName: string | null;
  legalRepRole: string | null;
  revenue: string | null;
  totalBalance: string | null;
  equity: string | null;
  taxation: string | null;
  fiscalCountry: string | null;
  capital: string | null;
  patrimoineImmobilier: string | null;
  patrimoineEpargne: string | null;
  patrimoineParticipations: string | null;
  patrimoineLiquidites: string | null;
  patrimoineAutres: string | null;
  fccStatut: string;
  fccDate: string | null;
  derStatut: string;
  derDate: string | null;
  derEnvoiTimestamp: string | null;
  ldmStatut: string;
  ldmDate: string | null;
  notesInternes: string | null;
  airtableRecordId: string | null;
  be1: BeneficiaryFields;
  be2: BeneficiaryFields;
  be3: BeneficiaryFields;
  be4: BeneficiaryFields;
  createdAt: string | null;
}

export interface ClientInputFields {
  name: string;
  email?: string;
  clientType?: string;
  kycStatus?: string;
  status?: string;
  signataire?: string | null;
  gestionnaire?: string | null;
  origine?: string | null;
  dateEntree?: string | null;
  phone?: string | null;
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country?: string | null;
  civilite?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  birthDate?: string | null;
  birthPlace?: string | null;
  nationality?: string | null;
  maritalStatus?: string | null;
  matrimonialRegime?: string | null;
  profession?: string | null;
  proStatus?: string | null;
  sector?: string | null;
  employer?: string | null;
  annualIncome?: number | null;
  currentCharges?: number | null;
  tradeName?: string | null;
  legalForm?: string | null;
  siren?: string | null;
  nafCode?: string | null;
  activity?: string | null;
  legalRepName?: string | null;
  legalRepRole?: string | null;
  revenue?: string | null;
  totalBalance?: string | null;
  equity?: string | null;
  taxation?: string | null;
  patrimoineImmobilier?: string | null;
  patrimoineEpargne?: string | null;
  patrimoineParticipations?: string | null;
  patrimoineLiquidites?: string | null;
  patrimoineAutres?: string | null;
  fccStatut?: string;
  fccDate?: string | null;
  derStatut?: string;
  derDate?: string | null;
  derEnvoiTimestamp?: string | null;
  ldmStatut?: string;
  ldmDate?: string | null;
  notesInternes?: string | null;
  statutClient?: string;
  phoneMobile?: string | null;
  phoneHome?: string | null;
  phoneOffice?: string | null;
  fiscalCountry?: string | null;
  capital?: string | null;
  be1?: BeneficiaryFields;
  be2?: BeneficiaryFields;
  be3?: BeneficiaryFields;
  be4?: BeneficiaryFields;
}

export type CreateClientInput = ClientInputFields;

export type UpdateClientInput = Partial<ClientInputFields>;

export interface CountStats {
  total: number;
  active: number;
  inactive: number;
}

export interface BaserowRow {
  id: number | string;
  order?: string;
  [key: string]: unknown;
}

export interface CreateTenantInput {
  name: string;
  slug: string;
}

export interface CreateUserInput {
  email: string;
  password_hash?: string;
  name: string;
  role: string;
  tenant_id: string | null;
  status?: string;
  airtable_record_id?: string | null;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  role?: string;
  status?: string;
  password_hash?: string;
  reset_token_hash?: string;
  reset_token_expires?: string;
  otp_hash?: string;
  otp_expires?: string;
  airtable_record_id?: string | null;
}

export interface GestionnaireUserInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  role?: string;
  status?: string;
  peutSignerDocusign?: boolean;
  initiales?: string;
  couleur?: string;
}

export interface CreateUserWithGestionnaireInput {
  name: string;
  email: string;
  role: string;
  gestionnaire?: GestionnaireUserInput;
}

export interface UpdateUserWithGestionnaireInput {
  name?: string;
  email?: string;
  role?: string;
  status?: string;
  gestionnaire?: GestionnaireUserInput;
}

export interface UserWithGestionnaireResponse {
  user: PublicUser;
  gestionnaire?: PublicGestionnaire | null;
}

export interface CreateTenantFields {
  name: string;
  slug: string;
  status?: string;
  workspace_id: string;
  database_id: string;
  database_token: string;
}

export interface DbGestionnaire {
  id: string;
  name: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  role: string | null;
  peut_signer_docusign: boolean;
  status: string;
  initiales: string | null;
  couleur: string | null;
  user_id: string | null;
  airtable_record_id: string | null;
}

export interface PublicGestionnaire {
  id: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  role: string | null;
  peutSignerDocusign: boolean;
  status: string;
  initiales: string | null;
  couleur: string | null;
  userId: string | null;
}

export interface NoteAttachment {
  name: string;
  url: string;
}

export interface DbNote {
  id: string;
  name: string;
  client_id: string | null;
  date: string | null;
  note_type: string;
  auteur: string | null;
  contenu: string | null;
  pieces_jointes: NoteAttachment[];
  source: string | null;
  airtable_record_id: string | null;
}

export interface PublicNote {
  id: string;
  clientId: string | null;
  date: string | null;
  noteType: string;
  auteur: string | null;
  contenu: string | null;
  piecesJointes: NoteAttachment[];
  source: string | null;
}

export interface DbRelation {
  id: string;
  name: string;
  client_a_id: string | null;
  client_b_id: string | null;
  client_a_name: string | null;
  client_b_name: string | null;
  type_relation: string | null;
  pct_detention: number | null;
  note: string | null;
  airtable_record_id: string | null;
}

export interface PublicRelation {
  id: string;
  clientAId: string | null;
  clientBId: string | null;
  clientAName: string | null;
  clientBName: string | null;
  typeRelation: string | null;
  pctDetention: number | null;
  note: string | null;
}

export interface DbTask {
  id: string;
  name: string;
  title: string;
  description: string | null;
  status: string;
  priorite: string | null;
  assigne_a: string | null;
  cree_par: string | null;
  due_date: string | null;
  client_id: string | null;
  airtable_record_id: string | null;
}

export interface PublicTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priorite: string | null;
  assigneA: string | null;
  creePar: string | null;
  dueDate: string | null;
  clientId: string | null;
}

export interface DbKycDocument {
  id: string;
  name: string;
  client_id: string | null;
  client_id_old: string | null;
  client_nom: string | null;
  doc_type: string;
  recu: boolean;
  date_reception: string | null;
  date_validite: string | null;
  url_document: string | null;
  airtable_record_id: string | null;
}

export interface PublicKycDocument {
  id: string;
  clientId: string | null;
  clientIdOld: string | null;
  clientNom: string | null;
  docType: string;
  recu: boolean;
  dateReception: string | null;
  dateValidite: string | null;
  urlDocument: string | null;
}

export interface AccueilStats {
  crm: { total: number; prospects: number; actifs: number; inactifs: number };
  der: { total: number; aEnvoyer: number; derEnvoye: number; ldmEnvoye: number; signe: number };
  fcc: { total: number; aEnvoyer: number; envoye: number; signe: number; renouveler: number };
}

export interface AccueilTodoItem {
  id: string;
  clientId: string;
  clientName: string;
  label: string;
  priority: number;
  kind: 'kyc_doc' | 'compliance';
}

export interface AccueilResponse {
  stats: AccueilStats;
  kycTodos: AccueilTodoItem[];
  complianceTodos: AccueilTodoItem[];
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

export interface DbAuditLog {
  id: string;
  created_at: string;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  user_role: string | null;
  tenant_id: string | null;
  action: string;
  method: string;
  path: string;
  status_code: number;
  entity_type: string | null;
  entity_id: string | null;
  details: string | null;
}

export interface CreateAuditLogInput {
  created_at?: string;
  user_id?: string | null;
  user_email?: string | null;
  user_name?: string | null;
  user_role?: string | null;
  tenant_id?: string | null;
  action: string;
  method: string;
  path: string;
  status_code: number;
  entity_type?: string | null;
  entity_id?: string | null;
  details?: string | null;
}

export interface PublicAuditLog {
  id: string;
  createdAt: string;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  userRole: string | null;
  tenantId: string | null;
  action: string;
  method: string;
  path: string;
  statusCode: number;
  entityType: string | null;
  entityId: string | null;
  details: string | null;
}

export interface AuditListResult {
  logs: PublicAuditLog[];
  total: number;
  page: number;
  size: number;
}

export interface AuditListParams {
  tenantId?: string;
  userId?: string;
  search?: string;
  page?: number;
  size?: number;
}

export interface DbFccSubmission {
  id: string;
  name: string;
  client_id: string | null;
  submitted_at: string | null;
  form_type: string;
  profil_risque: string | null;
  profil_connaissance: string | null;
  score_connaissance: number | null;
  score_risque: number | null;
  statut: string;
  raw_data: string | null;
  docusign_envelope_id: string | null;
  airtable_record_id: string | null;
}

export interface PublicFccSubmission {
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
}
