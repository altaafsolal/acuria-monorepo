import type { DbUser, TenantRecord, DbClient, DbGestionnaire, DbFccClient, DbKycDocument, DbNote, DbTask } from '../../types/domain.js';
import { BASEROW_FIELDS } from '../../../baserow/schema.js';

const F = BASEROW_FIELDS;

let idSeq = 1000;
function nextId(): string { return String(idSeq++); }

export function makeDbUser(overrides: Partial<DbUser> = {}): DbUser {
  const id = overrides.id ?? nextId();
  return {
    id,
    email: `user-${id}@example.com`,
    password_hash: '$2a$10$fakehash',
    name: `User ${id}`,
    role: 'standard_user',
    tenant_id: '1',
    status: 'active',
    reset_token_hash: null,
    reset_token_expires: null,
    otp_hash: null,
    otp_expires: null,
    otp_attempts: null,
    created_on: '2026-01-01T00:00:00Z',
    updated_on: null,
    airtable_record_id: null,
    ...overrides,
  };
}

export function makeDbUserRow(user: DbUser): Record<string, unknown> {
  return {
    id: Number(user.id),
    [F.users.email]: user.email,
    [F.users.passwordHash]: user.password_hash,
    [F.users.name]: user.name,
    [F.users.role]: { id: 1, value: user.role, color: 'blue' },
    [F.users.tenantId]: user.tenant_id ? [{ id: Number(user.tenant_id), value: `Tenant ${user.tenant_id}` }] : [],
    [F.users.status]: { id: 1, value: user.status, color: 'green' },
    [F.users.resetTokenHash]: user.reset_token_hash ?? '',
    [F.users.resetTokenExpires]: user.reset_token_expires ?? '',
    [F.users.otpHash]: user.otp_hash ?? '',
    [F.users.otpExpires]: user.otp_expires ?? '',
    [F.users.otpAttempts]: user.otp_attempts ?? 0,
    [F.users.createdOn]: user.created_on,
    [F.users.updatedOn]: user.updated_on,
    [F.users.airtableRecordId]: user.airtable_record_id ?? '',
  };
}

export function makeTenantRecord(overrides: Partial<TenantRecord> = {}): TenantRecord {
  const id = overrides.id ?? nextId();
  return {
    id,
    name: `Tenant ${id}`,
    slug: `tenant-${id}`,
    status: 'active',
    workspace_id: '100',
    database_id: '200',
    database_token: 'test-tenant-token',
    branding_name: null,
    branding_orias: null,
    branding_accent: null,
    branding_logo: [],
    email: null,
    backoffice_email: null,
    created_on: '2026-01-01T00:00:00Z',
    updated_on: null,
    sharepoint_connected: false,
    sharepoint_access_token: null,
    sharepoint_refresh_token: null,
    sharepoint_token_expires_at: null,
    sharepoint_ms_tenant_id: null,
    sharepoint_site_id: null,
    sharepoint_drive_id: null,
    sharepoint_site_display_name: null,
    sharepoint_connected_at: null,
    sharepoint_connected_by: null,
    email_provider: null,
    email_access_token: null,
    email_refresh_token: null,
    email_token_expires_at: null,
    email_ms_tenant_id: null,
    email_sender_address: null,
    email_scopes_granted: null,
    email_connected_at: null,
    email_connected_by: null,
    ...overrides,
  };
}

export function makeTenantRow(tenant: TenantRecord): Record<string, unknown> {
  return {
    id: Number(tenant.id),
    [F.tenants.name]: tenant.name,
    [F.tenants.slug]: tenant.slug,
    [F.tenants.status]: { id: 1, value: tenant.status, color: 'green' },
    [F.tenants.workspaceId]: tenant.workspace_id ?? '',
    [F.tenants.databaseId]: tenant.database_id ?? '',
    [F.tenants.databaseToken]: tenant.database_token ?? '',
    [F.tenants.brandingName]: tenant.branding_name ?? '',
    [F.tenants.brandingOrias]: tenant.branding_orias ?? '',
    [F.tenants.brandingAccent]: tenant.branding_accent ?? '',
    [F.tenants.brandingLogo]: tenant.branding_logo,
    [F.tenants.email]: tenant.email ?? '',
    [F.tenants.backofficeEmail]: tenant.backoffice_email ?? '',
    [F.tenants.createdOn]: tenant.created_on,
    [F.tenants.updatedOn]: tenant.updated_on,
    [F.tenants.sharepointConnected]: tenant.sharepoint_connected,
    [F.tenants.sharepointAccessToken]: tenant.sharepoint_access_token ?? '',
    [F.tenants.sharepointRefreshToken]: tenant.sharepoint_refresh_token ?? '',
    [F.tenants.sharepointTokenExpiresAt]: tenant.sharepoint_token_expires_at ?? '',
    [F.tenants.sharepointMsTenantId]: tenant.sharepoint_ms_tenant_id ?? '',
    [F.tenants.sharepointSiteId]: tenant.sharepoint_site_id ?? '',
    [F.tenants.sharepointDriveId]: tenant.sharepoint_drive_id ?? '',
    [F.tenants.sharepointSiteDisplayName]: tenant.sharepoint_site_display_name ?? '',
    [F.tenants.sharepointConnectedAt]: tenant.sharepoint_connected_at ?? '',
    [F.tenants.sharepointConnectedBy]: tenant.sharepoint_connected_by ?? '',
    [F.tenants.emailProvider]: tenant.email_provider ?? '',
    [F.tenants.emailAccessToken]: tenant.email_access_token ?? '',
    [F.tenants.emailRefreshToken]: tenant.email_refresh_token ?? '',
    [F.tenants.emailTokenExpiresAt]: tenant.email_token_expires_at ?? '',
    [F.tenants.emailMsTenantId]: tenant.email_ms_tenant_id ?? '',
    [F.tenants.emailSenderAddress]: tenant.email_sender_address ?? '',
    [F.tenants.emailScopesGranted]: tenant.email_scopes_granted ?? '',
    [F.tenants.emailConnectedAt]: tenant.email_connected_at ?? '',
    [F.tenants.emailConnectedBy]: tenant.email_connected_by ?? '',
  };
}

export function makeDbClient(overrides: Partial<DbClient> = {}): DbClient {
  const id = overrides.id ?? nextId();
  return {
    id,
    name: `Client ${id}`,
    email: `client-${id}@example.com`,
    client_type: 'PP',
    kyc_status: 'Complet',
    status: 'Actif',
    statut_client: 'Actif',
    signataire: null,
    gestionnaire: null,
    origine: null,
    date_entree: null,
    phone: null,
    phone_mobile: null,
    phone_home: null,
    phone_office: null,
    address: null,
    postal_code: null,
    city: null,
    country: null,
    civilite: null,
    first_name: null,
    last_name: null,
    birth_date: null,
    birth_place: null,
    nationality: null,
    marital_status: null,
    matrimonial_regime: null,
    profession: null,
    pro_status: null,
    sector: null,
    employer: null,
    annual_income: null,
    current_charges: null,
    trade_name: null,
    legal_form: null,
    siren: null,
    naf_code: null,
    activity: null,
    legal_rep_name: null,
    legal_rep_role: null,
    revenue: null,
    total_balance: null,
    equity: null,
    taxation: null,
    fiscal_country: null,
    capital: null,
    patrimoine_immobilier: null,
    patrimoine_epargne: null,
    patrimoine_participations: null,
    patrimoine_liquidites: null,
    patrimoine_autres: null,
    fcc_statut: 'À envoyer',
    fcc_date: null,
    der_statut: 'À envoyer',
    der_date: null,
    der_envoi_timestamp: null,
    ldm_statut: 'À envoyer',
    ldm_date: null,
    notes_internes: null,
    airtable_record_id: null,
    be1_nom: null, be1_ddn: null, be1_lieu_naissance: null, be1_nationalite: null, be1_adresse: null, be1_residence_fiscale: null, be1_detention: null,
    be2_nom: null, be2_ddn: null, be2_lieu_naissance: null, be2_nationalite: null, be2_adresse: null, be2_residence_fiscale: null, be2_detention: null,
    be3_nom: null, be3_ddn: null, be3_lieu_naissance: null, be3_nationalite: null, be3_adresse: null, be3_residence_fiscale: null, be3_detention: null,
    be4_nom: null, be4_ddn: null, be4_lieu_naissance: null, be4_nationalite: null, be4_adresse: null, be4_residence_fiscale: null, be4_detention: null,
    ...overrides,
  };
}

export function makeDbGestionnaire(overrides: Partial<DbGestionnaire> = {}): DbGestionnaire {
  const id = overrides.id ?? nextId();
  return {
    id,
    name: `Gestionnaire ${id}`,
    first_name: 'Jean',
    last_name: 'Dupont',
    email: `gest-${id}@example.com`,
    phone: null,
    role: 'Gestionnaire',
    peut_signer_docusign: true,
    status: 'Actif',
    initiales: 'JD',
    couleur: '#3B82F6',
    user_id: null,
    airtable_record_id: null,
    ...overrides,
  };
}

export function makeDbFccClient(overrides: Partial<DbFccClient> = {}): DbFccClient {
  const id = overrides.id ?? nextId();
  return {
    id,
    name: `FCC-${id}`,
    client_id: null,
    profil_risque: 'Prudent',
    profil_connaissance: 'Débutant',
    score_connaissance: 10,
    score_risque: 5,
    docusign_envelope_id: null,
    docusign_sent_at: null,
    notes_nm: null,
    migration_record_id: null,
    type_formulaire: 'PP',
    id_formulaire: null,
    date_soumission: '2026-07-01',
    statut_dossier: 'En attente',
    client: null,
    email: null,
    telephone: null,
    ville: null,
    profession: null,
    score_total: 15,
    sharepoint_file_url: null,
    sharepoint_file_id: null,
    ip_client: null,
    pdf_filename: null,
    prefill_token: null,
    bo_agent: null,
    be1_nom: null, be1_ddn: null, be1_lieu_naissance: null, be1_nationalite: null, be1_residence_fiscale: null, be1_adresse: null, be1_detention: null,
    be2_nom: null, be2_ddn: null, be2_lieu_naissance: null, be2_nationalite: null, be2_residence_fiscale: null, be2_adresse: null, be2_detention: null,
    be3_nom: null, be3_ddn: null, be3_nationalite: null, be3_detention: null,
    be4_nom: null, be4_ddn: null, be4_nationalite: null, be4_detention: null,
    client_denomination: null,
    client_representant_nom: null,
    client_representant_fonction: null,
    client_siren: null,
    client_naf: null,
    client_activite: null,
    client_forme_juridique: null,
    client_ca: null,
    client_bilan: null,
    client_fonds_propres: null,
    client_fiscalite: null,
    ...overrides,
  };
}

export function makeDbKycDocument(overrides: Partial<DbKycDocument> = {}): DbKycDocument {
  const id = overrides.id ?? nextId();
  return {
    id,
    name: `Doc ${id}`,
    client_id: null,
    client_id_old: null,
    client_nom: null,
    doc_type: 'CNI',
    recu: false,
    date_reception: null,
    date_validite: null,
    url_document: null,
    airtable_record_id: null,
    ...overrides,
  };
}

export function makeDbNote(overrides: Partial<DbNote> = {}): DbNote {
  const id = overrides.id ?? nextId();
  return {
    id,
    name: `Note ${id}`,
    client_id: null,
    date: '2026-07-01',
    note_type: 'Appel',
    auteur: 'Test User',
    contenu: 'Test note content',
    pieces_jointes: [],
    source: null,
    airtable_record_id: null,
    ...overrides,
  };
}

export function makeDbTask(overrides: Partial<DbTask> = {}): DbTask {
  const id = overrides.id ?? nextId();
  return {
    id,
    name: `Task ${id}`,
    title: `Task title ${id}`,
    description: null,
    status: 'À faire',
    priorite: 'Normale',
    assigne_a: null,
    cree_par: null,
    due_date: null,
    client_id: null,
    airtable_record_id: null,
    ...overrides,
  };
}
