import { BASEROW_FIELDS } from '../../../baserow/schema.js';
import { normalizeDateForBaserow, normalizePhoneForBaserow, pickFieldValue, pickNumberValue, pickTextValue } from '../../utils/baserow.js';
import type { BaserowRow, DbClient, PublicClient } from '../../types/domain.js';

const F = BASEROW_FIELDS.clients;

export function mapClientRow(row: BaserowRow): DbClient {
  const clientType = pickFieldValue(row[F.clientType]) || 'PP';
  const statutClient = pickFieldValue(row[F.statutClient]) || pickFieldValue(row[F.status]) || 'Prospect';

  return {
    id: String(row.id),
    name: String(row[F.name] || ''),
    email: String(row[F.email] || ''),
    client_type: clientType,
    kyc_status: pickFieldValue(row[F.kycStatus]) || 'pending',
    status: pickFieldValue(row[F.status]) || 'prospect',
    statut_client: statutClient,
    signataire: pickTextValue(row[F.signataire]),
    gestionnaire: pickTextValue(row[F.gestionnaire]),
    origine: pickTextValue(row[F.origine]),
    date_entree: pickTextValue(row[F.dateEntree]),
    phone: pickTextValue(row[F.phone]),
    phone_mobile: pickTextValue(row[F.phoneMobile]),
    phone_home: pickTextValue(row[F.phoneHome]),
    phone_office: pickTextValue(row[F.phoneOffice]),
    address: pickTextValue(row[F.address]),
    postal_code: pickTextValue(row[F.postalCode]),
    city: pickTextValue(row[F.city]),
    country: pickTextValue(row[F.country]),
    civilite: pickTextValue(row[F.civilite]),
    first_name: pickTextValue(row[F.firstName]),
    last_name: pickTextValue(row[F.lastName]),
    birth_date: pickTextValue(row[F.birthDate]),
    birth_place: pickTextValue(row[F.birthPlace]),
    nationality: pickTextValue(row[F.nationality]),
    marital_status: pickTextValue(row[F.maritalStatus]),
    matrimonial_regime: pickTextValue(row[F.matrimonialRegime]),
    profession: pickTextValue(row[F.profession]),
    pro_status: pickTextValue(row[F.proStatus]),
    sector: pickTextValue(row[F.sector]),
    employer: pickTextValue(row[F.employer]),
    annual_income: pickNumberValue(row[F.annualIncome]),
    current_charges: pickNumberValue(row[F.currentCharges]),
    trade_name: pickTextValue(row[F.tradeName]),
    legal_form: pickTextValue(row[F.legalForm]),
    siren: pickTextValue(row[F.siren]),
    naf_code: pickTextValue(row[F.nafCode]),
    activity: pickTextValue(row[F.activity]),
    legal_rep_name: pickTextValue(row[F.legalRepName]),
    legal_rep_role: pickTextValue(row[F.legalRepRole]),
    revenue: pickTextValue(row[F.revenue]),
    total_balance: pickTextValue(row[F.totalBalance]),
    equity: pickTextValue(row[F.equity]),
    taxation: pickTextValue(row[F.taxation]),
    fiscal_country: pickTextValue(row[F.fiscalCountry]),
    capital: pickTextValue(row[F.capital]),
    patrimoine_immobilier: pickTextValue(row[F.patrimoineImmobilier]),
    patrimoine_epargne: pickTextValue(row[F.patrimoineEpargne]),
    patrimoine_participations: pickTextValue(row[F.patrimoineParticipations]),
    patrimoine_liquidites: pickTextValue(row[F.patrimoineLiquidites]),
    patrimoine_autres: pickTextValue(row[F.patrimoineAutres]),
    fcc_statut: pickFieldValue(row[F.fccStatut]) || 'Non envoyé',
    fcc_date: pickTextValue(row[F.fccDate]),
    der_statut: pickFieldValue(row[F.derStatut]) || 'Non envoyé',
    der_date: pickTextValue(row[F.derDate]),
    der_envoi_timestamp: pickTextValue(row[F.derEnvoiTimestamp]),
    ldm_statut: pickFieldValue(row[F.ldmStatut]) || 'Non envoyé',
    ldm_date: pickTextValue(row[F.ldmDate]),
    notes_internes: pickTextValue(row[F.notesInternes]),
    airtable_record_id: pickTextValue(row[F.airtableRecordId]),
    be1_nom: pickTextValue(row[F.be1Nom]),
    be1_ddn: pickTextValue(row[F.be1Ddn]),
    be1_lieu_naissance: pickTextValue(row[F.be1LieuNaissance]),
    be1_nationalite: pickTextValue(row[F.be1Nationalite]),
    be1_adresse: pickTextValue(row[F.be1Adresse]),
    be1_residence_fiscale: pickTextValue(row[F.be1ResidenceFiscale]),
    be1_detention: pickTextValue(row[F.be1Detention]),
    be2_nom: pickTextValue(row[F.be2Nom]),
    be2_ddn: pickTextValue(row[F.be2Ddn]),
    be2_lieu_naissance: pickTextValue(row[F.be2LieuNaissance]),
    be2_nationalite: pickTextValue(row[F.be2Nationalite]),
    be2_adresse: pickTextValue(row[F.be2Adresse]),
    be2_residence_fiscale: pickTextValue(row[F.be2ResidenceFiscale]),
    be2_detention: pickTextValue(row[F.be2Detention]),
    be3_nom: pickTextValue(row[F.be3Nom]),
    be3_ddn: pickTextValue(row[F.be3Ddn]),
    be3_lieu_naissance: pickTextValue(row[F.be3LieuNaissance]),
    be3_nationalite: pickTextValue(row[F.be3Nationalite]),
    be3_adresse: pickTextValue(row[F.be3Adresse]),
    be3_residence_fiscale: pickTextValue(row[F.be3ResidenceFiscale]),
    be3_detention: pickTextValue(row[F.be3Detention]),
    be4_nom: pickTextValue(row[F.be4Nom]),
    be4_ddn: pickTextValue(row[F.be4Ddn]),
    be4_lieu_naissance: pickTextValue(row[F.be4LieuNaissance]),
    be4_nationalite: pickTextValue(row[F.be4Nationalite]),
    be4_adresse: pickTextValue(row[F.be4Adresse]),
    be4_residence_fiscale: pickTextValue(row[F.be4ResidenceFiscale]),
    be4_detention: pickTextValue(row[F.be4Detention]),
  };
}

function mapBe(client: DbClient, n: 1 | 2 | 3 | 4) {
  const prefix = `be${n}` as const;
  return {
    nom: client[`${prefix}_nom` as keyof DbClient] as string | null,
    ddn: client[`${prefix}_ddn` as keyof DbClient] as string | null,
    lieuNaissance: client[`${prefix}_lieu_naissance` as keyof DbClient] as string | null,
    nationalite: client[`${prefix}_nationalite` as keyof DbClient] as string | null,
    adresse: client[`${prefix}_adresse` as keyof DbClient] as string | null,
    residenceFiscale: client[`${prefix}_residence_fiscale` as keyof DbClient] as string | null,
    detention: client[`${prefix}_detention` as keyof DbClient] as string | null,
  };
}

export function toPublicClient(client: DbClient): PublicClient {
  return {
    id: client.id,
    name: client.name,
    email: client.email,
    clientType: client.client_type,
    kycStatus: client.kyc_status,
    status: client.status,
    statutClient: client.statut_client,
    signataire: client.signataire,
    gestionnaire: client.gestionnaire,
    origine: client.origine,
    dateEntree: client.date_entree,
    phone: client.phone,
    phoneMobile: client.phone_mobile,
    phoneHome: client.phone_home,
    phoneOffice: client.phone_office,
    address: client.address,
    postalCode: client.postal_code,
    city: client.city,
    country: client.country,
    civilite: client.civilite,
    firstName: client.first_name,
    lastName: client.last_name,
    birthDate: client.birth_date,
    birthPlace: client.birth_place,
    nationality: client.nationality,
    maritalStatus: client.marital_status,
    matrimonialRegime: client.matrimonial_regime,
    profession: client.profession,
    proStatus: client.pro_status,
    sector: client.sector,
    employer: client.employer,
    annualIncome: client.annual_income,
    currentCharges: client.current_charges,
    tradeName: client.trade_name,
    legalForm: client.legal_form,
    siren: client.siren,
    nafCode: client.naf_code,
    activity: client.activity,
    legalRepName: client.legal_rep_name,
    legalRepRole: client.legal_rep_role,
    revenue: client.revenue,
    totalBalance: client.total_balance,
    equity: client.equity,
    taxation: client.taxation,
    fiscalCountry: client.fiscal_country,
    capital: client.capital,
    patrimoineImmobilier: client.patrimoine_immobilier,
    patrimoineEpargne: client.patrimoine_epargne,
    patrimoineParticipations: client.patrimoine_participations,
    patrimoineLiquidites: client.patrimoine_liquidites,
    patrimoineAutres: client.patrimoine_autres,
    fccStatut: client.fcc_statut,
    fccDate: client.fcc_date,
    derStatut: client.der_statut,
    derDate: client.der_date,
    derEnvoiTimestamp: client.der_envoi_timestamp,
    ldmStatut: client.ldm_statut,
    ldmDate: client.ldm_date,
    notesInternes: client.notes_internes,
    airtableRecordId: client.airtable_record_id,
    be1: mapBe(client, 1),
    be2: mapBe(client, 2),
    be3: mapBe(client, 3),
    be4: mapBe(client, 4),
    createdAt: null,
  };
}

/**
 * DER/LdM/FCC signature statuses are compliance records — they are proof that a
 * document was sent/signed and must only be written by the server-side send and
 * webhook flows (`patchClientKycFields`), never set directly by a user through
 * POST/PUT /clients. Strip them from any user-supplied client body first.
 */
const WORKFLOW_STATUS_KEYS = [
  'fccStatut', 'fcc_statut', 'fccDate', 'fcc_date',
  'derStatut', 'der_statut', 'derDate', 'der_date',
  'derEnvoiTimestamp', 'der_envoi_timestamp',
  'ldmStatut', 'ldm_statut', 'ldmDate', 'ldm_date',
] as const;

export function stripWorkflowStatusFields<T extends Record<string, unknown>>(input: T): T {
  const out = { ...input };
  for (const key of WORKFLOW_STATUS_KEYS) {
    delete (out as Record<string, unknown>)[key];
  }
  return out;
}

export function clientInputToBaserow(input: Record<string, unknown>): Record<string, unknown> {
  const fields: Record<string, unknown> = {};

  const DATE_FIELDS = new Set<keyof typeof F>([
    'dateEntree', 'birthDate', 'fccDate', 'derDate', 'ldmDate',
    'be1Ddn', 'be2Ddn', 'be3Ddn', 'be4Ddn',
  ]);
  const PHONE_FIELDS = new Set<keyof typeof F>(['phone', 'phoneMobile', 'phoneHome', 'phoneOffice']);

  const set = (key: keyof typeof F, value: unknown) => {
    if (value === undefined) return;

    if (DATE_FIELDS.has(key)) {
      const normalized = normalizeDateForBaserow(value);
      if (normalized) fields[F[key]] = normalized;
      return;
    }

    if (PHONE_FIELDS.has(key)) {
      const normalized = normalizePhoneForBaserow(value);
      if (normalized) fields[F[key]] = normalized;
      return;
    }

    if (key === 'derEnvoiTimestamp') {
      const s = value == null ? '' : String(value).trim();
      if (s) fields[F[key]] = s;
      return;
    }

    if (value === null || value === '') return;
    fields[F[key]] = value;
  };

  set('name', input.name);
  set('email', input.email);
  set('clientType', input.clientType ?? input.client_type);
  set('kycStatus', input.kycStatus ?? input.kyc_status);

  const statutClient = input.statutClient ?? input.statut_client;
  if (statutClient) set('statutClient', statutClient);

  set('signataire', input.signataire);
  set('gestionnaire', input.gestionnaire);
  set('origine', input.origine);
  set('dateEntree', input.dateEntree ?? input.date_entree ?? null);
  set('phone', input.phone);
  set('phoneMobile', input.phoneMobile ?? input.phone_mobile);
  set('phoneHome', input.phoneHome ?? input.phone_home);
  set('phoneOffice', input.phoneOffice ?? input.phone_office);
  set('address', input.address);
  set('postalCode', input.postalCode ?? input.postal_code);
  set('city', input.city);
  set('country', input.country);
  set('civilite', input.civilite);
  set('firstName', input.firstName ?? input.first_name);
  set('lastName', input.lastName ?? input.last_name);
  set('birthDate', input.birthDate ?? input.birth_date ?? null);
  set('birthPlace', input.birthPlace ?? input.birth_place);
  set('nationality', input.nationality);
  set('maritalStatus', input.maritalStatus ?? input.marital_status);
  set('matrimonialRegime', input.matrimonialRegime ?? input.matrimonial_regime);
  set('profession', input.profession);
  set('proStatus', input.proStatus ?? input.pro_status);
  set('sector', input.sector);
  set('employer', input.employer);
  set('annualIncome', input.annualIncome ?? input.annual_income);
  set('currentCharges', input.currentCharges ?? input.current_charges);
  set('tradeName', input.tradeName ?? input.trade_name);
  set('legalForm', input.legalForm ?? input.legal_form);
  set('siren', input.siren);
  set('nafCode', input.nafCode ?? input.naf_code);
  set('activity', input.activity);
  set('legalRepName', input.legalRepName ?? input.legal_rep_name);
  set('legalRepRole', input.legalRepRole ?? input.legal_rep_role);
  set('revenue', input.revenue);
  set('totalBalance', input.totalBalance ?? input.total_balance);
  set('equity', input.equity);
  set('taxation', input.taxation);
  set('fiscalCountry', input.fiscalCountry ?? input.fiscal_country);
  set('capital', input.capital);
  set('patrimoineImmobilier', input.patrimoineImmobilier ?? input.patrimoine_immobilier);
  set('patrimoineEpargne', input.patrimoineEpargne ?? input.patrimoine_epargne);
  set('patrimoineParticipations', input.patrimoineParticipations ?? input.patrimoine_participations);
  set('patrimoineLiquidites', input.patrimoineLiquidites ?? input.patrimoine_liquidites);
  set('patrimoineAutres', input.patrimoineAutres ?? input.patrimoine_autres);
  set('fccStatut', input.fccStatut ?? input.fcc_statut);
  set('fccDate', input.fccDate ?? input.fcc_date ?? null);
  set('derStatut', input.derStatut ?? input.der_statut);
  set('derDate', input.derDate ?? input.der_date ?? null);
  set('derEnvoiTimestamp', input.derEnvoiTimestamp ?? input.der_envoi_timestamp);
  set('ldmStatut', input.ldmStatut ?? input.ldm_statut);
  set('ldmDate', input.ldmDate ?? input.ldm_date ?? null);
  set('notesInternes', input.notesInternes ?? input.notes_internes);
  set('airtableRecordId', input.airtableRecordId ?? input.airtable_record_id);

  const be = (n: 1 | 2 | 3 | 4, prefix: string) => {
    const data = input[prefix] as Record<string, unknown> | undefined;
    if (!data) return;
    set(`be${n}Nom` as keyof typeof F, data.nom);
    set(`be${n}Ddn` as keyof typeof F, data.ddn ?? null);
    set(`be${n}LieuNaissance` as keyof typeof F, data.lieuNaissance);
    set(`be${n}Nationalite` as keyof typeof F, data.nationalite);
    set(`be${n}Adresse` as keyof typeof F, data.adresse);
    set(`be${n}ResidenceFiscale` as keyof typeof F, data.residenceFiscale);
    set(`be${n}Detention` as keyof typeof F, data.detention);
  };
  be(1, 'be1');
  be(2, 'be2');
  be(3, 'be3');
  be(4, 'be4');

  return fields;
}

export function resolveClientDisplayName(
  client: Pick<DbClient, 'name' | 'client_type' | 'first_name' | 'last_name' | 'trade_name' | 'civilite'>,
): string {
  if (client.name?.trim()) return client.name.trim();
  if (client.client_type === 'PM') return client.trade_name?.trim() || '';
  const parts = [client.civilite, client.first_name, client.last_name?.toUpperCase()].filter(Boolean);
  return parts.join(' ').trim();
}

const LEADING_CIVILITY_RE =
  /^\s*(?:M\.?|Mr\.?|Mme\.?|Mlle\.?|Monsieur|Madame|Mademoiselle)\s+/i;

/** Removes a leading civility title (M., Mme, Monsieur, …) from a name string. */
export function stripLeadingCivility(name: string): string {
  return name.replace(LEADING_CIVILITY_RE, '').trim();
}

/**
 * Client name for OUTBOUND Make.com payloads. Always "<First> <Last>" for a
 * physical person (never a "M."/"Mme" prefix), trade name for a legal entity.
 * Distinct from resolveClientDisplayName, which intentionally keeps the civility
 * for in-app display. Keep every Make `client_name` field on this helper.
 */
export function resolveClientNameForMake(
  client: Pick<DbClient, 'client_type' | 'first_name' | 'last_name' | 'trade_name' | 'name'>,
): string {
  if (client.client_type === 'PM') {
    return client.trade_name?.trim() || stripLeadingCivility(client.name?.trim() || '');
  }
  const parts = [client.first_name?.trim(), client.last_name?.trim()?.toUpperCase()].filter(Boolean);
  if (parts.length) return parts.join(' ');
  // No structured name — fall back to the stored name, minus any civility prefix.
  return stripLeadingCivility(client.name?.trim() || '');
}

export function isClientArchived(client: DbClient): boolean {
  return client.statut_client === 'Archivé' || client.status === 'archived';
}

export function excludeArchived(clients: DbClient[]): DbClient[] {
  return clients.filter((c) => !isClientArchived(c));
}
