/**
 * One-off Airtable → Baserow migration (idempotent on airtable_record_id).
 *
 * Usage (live API):
 *   cd backend && npm run migrate:airtable -- --tenant-slug=nm-prime
 *
 * Usage (offline — Free plan: export CSV from each table view):
 *   1. In each table, add a Formula field named "migration_record_id" with formula: RECORD_ID()
 *   2. For Notes & Tâches: add Lookup "client_record_id" from Client → migration_record_id
 *   3. Grid view → … menu → Download CSV
 *   4. Save files in backend/airtable-export/ (see names below)
 *   npm run migrate:airtable -- --tenant-slug=nm-prime --export-dir=./airtable-export
 *
 * Resume a subset after partial run:
 *   npm run migrate:airtable -- --tenant-slug=nm-prime --only=gestionnaires
 *
 * The gestionnaires step also creates platform users (standard_user) linked via user_id.
 *
 * Required env: AIRTABLE_PAT (API mode), BASEROW_* (same as setup)
 */
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import 'dotenv/config';
import { env, isBaserowConfigured } from '../src/config/env.js';
import * as clientsRepo from '../src/services/baserow/clients.js';
import * as fccSubmissionsRepo from '../src/services/baserow/fcc-submissions.js';
import * as gestionnairesRepo from '../src/services/baserow/gestionnaires.js';
import * as kycDocsRepo from '../src/services/baserow/kyc-documents.js';
import * as notesRepo from '../src/services/baserow/notes.js';
import * as relationsRepo from '../src/services/baserow/relations.js';
import * as tasksRepo from '../src/services/baserow/tasks.js';
import * as tenantsRepo from '../src/services/baserow/tenants.js';
import * as usersRepo from '../src/services/baserow/users.js';
import type { UpdateClientInput } from '../src/types/domain.js';

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
}

type MigrationStep =
  | 'gestionnaires'
  | 'clients'
  | 'relations'
  | 'kyc-docs'
  | 'notes'
  | 'tasks'
  | 'fcc-submissions';

const ALL_STEPS: MigrationStep[] = [
  'gestionnaires',
  'clients',
  'relations',
  'kyc-docs',
  'notes',
  'tasks',
  'fcc-submissions',
];

const EXPORT_FILE_ALIASES: Record<MigrationStep, string[]> = {
  gestionnaires: ['gestionnaires.csv', 'gestionnaires.json', 'Gestionnaires.csv', 'Gestionnaires.json'],
  clients: ['clients.csv', 'clients.json', 'NM - Clients.csv', 'NM - Clients.json', 'nm-clients.json'],
  relations: ['relations.csv', 'relations.json', 'NM - Relation clients.csv', 'NM - Relation clients.json'],
  'kyc-docs': ['kyc-docs.csv', 'kyc-docs.json', 'kyc_documents.json', 'NM - Documents KYC.csv', 'NM - Documents KYC.json'],
  notes: ['notes.csv', 'notes.json', 'Notes.csv', 'Notes.json'],
  tasks: ['tasks.csv', 'tasks.json', 'Taches.csv', 'Taches.json', 'taches.json'],
  'fcc-submissions': ['fcc-submissions.csv', 'fcc-submissions.json', 'FCC_Clients.csv', 'FCC_Clients.json', 'fcc_clients.json'],
};

const RECORD_ID_COLUMNS = [
  'migration_record_id',
  'RECORD_ID',
  'record_id',
  'Record ID',
  'Airtable Record ID',
];

/** Minimal RFC 4180 CSV parser (handles quoted fields). */
function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || (ch === '\r' && next === '\n')) {
      row.push(field);
      field = '';
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
      if (ch === '\r') i++;
    } else if (ch !== '\r') {
      field += ch;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((c) => c.trim() !== '')) rows.push(row);
  }

  if (rows.length === 0) return { headers: [], rows: [] };
  return { headers: rows[0], rows: rows.slice(1) };
}

/** Fallback ID columns per step, used when no RECORD_ID_COLUMNS column exists. */
const STEP_FALLBACK_ID_COLUMNS: Partial<Record<MigrationStep, string[]>> = {
  notes: ['ID Note', 'id_note'],
};

function syntheticRecordId(cells: string[], rowIndex: number): string {
  const hash = createHash('sha1').update(cells.join('|')).digest('hex').slice(0, 12);
  return `synthetic:${hash}:${rowIndex}`;
}

function csvToRecords(csvText: string, step?: MigrationStep): AirtableRecord[] {
  const bom = csvText.charCodeAt(0) === 0xfeff ? 1 : 0;
  const { headers, rows } = parseCsv(bom ? csvText.slice(1) : csvText);
  if (!headers.length) return [];

  const fallbackCols = (step && STEP_FALLBACK_ID_COLUMNS[step]) || [];
  let idCol = headers.find((h) => RECORD_ID_COLUMNS.includes(h.trim()));
  let synthetic = false;
  if (!idCol) {
    idCol = headers.find((h) => fallbackCols.includes(h.trim()));
    if (idCol || fallbackCols.length) {
      synthetic = true;
      console.warn(
        `  ! CSV for "${step}" has no migration_record_id column — falling back to `
        + `${idCol ? `"${idCol}"` : 'synthetic row IDs'}. Re-export with a Formula field `
        + `"migration_record_id" = RECORD_ID() for idempotent re-runs.`,
      );
    } else {
      throw new Error(
        `CSV is missing a record ID column. Add a Formula field "migration_record_id" = RECORD_ID() before exporting. `
        + `Found columns: ${headers.slice(0, 8).join(', ')}…`,
      );
    }
  }

  return rows.map((cells, rowIndex) => {
    const fields: Record<string, unknown> = {};
    headers.forEach((header, i) => {
      const value = (cells[i] ?? '').trim();
      if (header === idCol || value === '') return;
      fields[header] = value;
    });
    const id = idCol ? (cells[headers.indexOf(idCol)] ?? '').trim() : '';
    if (!id) {
      if (synthetic) return { id: syntheticRecordId(cells, rowIndex), fields };
      throw new Error('CSV row missing migration_record_id — re-export with the formula column filled.');
    }
    return { id, fields };
  });
}

function parseArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const arg = process.argv.find((a) => a.startsWith(prefix));
  return arg?.slice(prefix.length);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function airtableErrorHelp(status: number, body: string): string {
  if (status === 429) {
    if (body.includes('PUBLIC_API_BILLING_LIMIT_EXCEEDED')) {
      return [
        'Airtable monthly API quota is exhausted (billing limit).',
        'Options:',
        '  1. Wait until your workspace usage resets (Airtable → Settings → Usage).',
        '  2. Upgrade the Airtable plan for higher API limits.',
        '  3. Export tables as CSV (Free plan) or JSON, then re-run with:',
        '       npm run migrate:airtable -- --tenant-slug=nm-prime --export-dir=./airtable-export',
        '     Free plan: add Formula field migration_record_id = RECORD_ID(), then Download CSV per table.',
      ].join('\n');
    }
    return 'Airtable rate limit (429). The script will retry automatically; if it keeps failing, wait a minute and try again.';
  }
  if (status === 401 || status === 403) {
    return 'Invalid or unauthorized AIRTABLE_PAT. Check backend/.env.';
  }
  return body;
}

async function atGetAll(table: string): Promise<AirtableRecord[]> {
  if (!env.airtable.pat) {
    throw new Error('AIRTABLE_PAT is required for live API migration (or use --export-dir=...)');
  }

  const records: AirtableRecord[] = [];
  let offset: string | undefined;
  let page = 0;

  do {
    if (page > 0) await sleep(250);
    const params = new URLSearchParams({ pageSize: '100' });
    if (offset) params.set('offset', offset);
    const url = `https://api.airtable.com/v0/${env.airtable.baseId}/${encodeURIComponent(table)}?${params}`;

    let res: Response | null = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      res = await fetch(url, {
        headers: { Authorization: `Bearer ${env.airtable.pat}` },
      });
      if (res.status !== 429) break;
      const body = await res.text();
      if (body.includes('PUBLIC_API_BILLING_LIMIT_EXCEEDED')) {
        throw new Error(airtableErrorHelp(429, body));
      }
      const waitMs = 1000 * (attempt + 1);
      console.warn(`  Rate limited on ${table}, retrying in ${waitMs}ms…`);
      await sleep(waitMs);
    }

    if (!res!.ok) {
      const body = await res!.text();
      const help = airtableErrorHelp(res!.status, body);
      throw new Error(`Airtable ${table} error ${res!.status}:\n${help}`);
    }

    const data = await res!.json() as { records?: AirtableRecord[]; offset?: string };
    records.push(...(data.records || []));
    offset = data.offset;
    page++;
  } while (offset);

  return records;
}

async function loadExportFile(exportDir: string, step: MigrationStep): Promise<AirtableRecord[]> {
  const dir = resolve(exportDir);
  const files = await readdir(dir);
  const aliases = EXPORT_FILE_ALIASES[step];
  const match = aliases.find((name) => files.includes(name));
  if (!match) {
    throw new Error(
      `Missing export file for "${step}" in ${dir}. Expected one of: ${aliases.join(', ')}`,
    );
  }

  const raw = await readFile(join(dir, match), 'utf8');
  if (match.toLowerCase().endsWith('.csv')) {
    return csvToRecords(raw, step);
  }
  const parsed = JSON.parse(raw) as { records?: AirtableRecord[] } | AirtableRecord[];
  if (Array.isArray(parsed)) return parsed;
  return parsed.records || [];
}

async function loadRecords(
  step: MigrationStep,
  exportDir: string | undefined,
  tableName: string,
): Promise<AirtableRecord[]> {
  if (exportDir) {
    console.log(`  Loading ${step} from ${exportDir}…`);
    return loadExportFile(exportDir, step);
  }
  console.log(`  Fetching ${tableName} from Airtable API…`);
  return atGetAll(tableName);
}

function str(v: unknown): string {
  return v != null ? String(v).trim() : '';
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function pickGestionnaireEmail(fields: Record<string, unknown>): string {
  const candidates = [
    fields['Email NM Prime'],
    fields['Email NM prime'],
    fields.Email,
    fields.email,
  ];
  for (const candidate of candidates) {
    const value = str(candidate).toLowerCase();
    if (value && isValidEmail(value)) return value;
  }
  return '';
}

function pickGestionnaireName(fields: Record<string, unknown>): string {
  const nomComplet = str(fields['Nom complet']);
  if (nomComplet) return nomComplet;
  const prenom = str(fields['Prénom'] || fields.Prenom);
  const nom = str(fields.Nom);
  return [prenom, nom].filter(Boolean).join(' ');
}

function mapAirtableGestionnaire(rec: AirtableRecord) {
  const f = rec.fields;
  const firstName = str(f['Prénom'] || f.Prenom) || null;
  const lastName = str(f.Nom) || null;
  const email = pickGestionnaireEmail(f);
  const name = pickGestionnaireName(f) || email || rec.id;

  return {
    name,
    firstName,
    lastName,
    email,
    phone: str(f['Téléphone'] || f.Telephone) || null,
    role: str(f['Rôle'] || f.Role) || null,
    peutSignerDocusign: Boolean(f['Peut signer Docusign']),
    status: str(f.Statut) || 'Actif',
    initiales: str(f.Initiales) || null,
    couleur: str(f.Couleur) || null,
    airtableRecordId: rec.id,
  };
}

function num(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function mapStatutToStatus(statut: string): string {
  if (statut === 'Client actif') return 'active';
  if (statut === 'Inactif') return 'inactive';
  if (statut === 'Archivé') return 'archived';
  return 'prospect';
}

function resolveLinkedName(
  value: unknown,
  idToName: Map<string, string>,
): string | null {
  if (value == null || value === '') return null;
  if (Array.isArray(value)) {
    const id = value[0];
    return id ? idToName.get(String(id)) || str(id) : null;
  }
  const s = str(value);
  if (s.startsWith('rec')) return idToName.get(s) || null;
  return s;
}

function clientDisplayNames(f: Record<string, unknown>): string[] {
  const isPP = f.type_client !== 'Personne morale';
  const names: string[] = [];
  if (isPP) {
    names.push([f.pp_civilite, f.pp_prenom, str(f.pp_nom).toUpperCase()].filter(Boolean).join(' '));
    if (f.pp_email) names.push(str(f.pp_email));
  } else {
    if (f.pm_denomination) names.push(str(f.pm_denomination).toUpperCase());
    if (f.pm_nom_commercial) names.push(str(f.pm_nom_commercial));
    if (f.pm_email) names.push(str(f.pm_email));
  }
  return names.filter(Boolean);
}

function buildClientDisplayMap(records: AirtableRecord[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const rec of records) {
    for (const label of clientDisplayNames(rec.fields)) {
      map.set(label.toLowerCase(), rec.id);
    }
  }
  return map;
}

function resolveClientAirtableId(
  f: Record<string, unknown>,
  clientDisplayMap: Map<string, string>,
): string | undefined {
  const explicit = str(f.client_record_id) || str(f['Client record id']);
  if (explicit) return explicit;

  const client = f.Client;
  if (Array.isArray(client) && client[0]) return String(client[0]);

  const asText = str(client);
  if (asText.startsWith('rec')) return asText;
  if (asText) return clientDisplayMap.get(asText.toLowerCase());

  return undefined;
}

function mapAirtableClient(
  f: Record<string, unknown>,
  gestionnaireNames: Map<string, string>,
): UpdateClientInput & { name: string } {
  const isPP = f.type_client !== 'Personne morale';
  const gestionnaire = resolveLinkedName(f.gestionnaire, gestionnaireNames);
  const signataire = resolveLinkedName(f.signataire, gestionnaireNames);
  const statutClient = str(f.statut_client) || 'Prospect';

  const name = isPP
    ? [f.pp_civilite, f.pp_prenom, str(f.pp_nom).toUpperCase()].filter(Boolean).join(' ')
    : str(f.pm_denomination).toUpperCase() || str(f.pm_nom_commercial);

  return {
    name,
    email: isPP ? str(f.pp_email) : str(f.pm_email),
    clientType: isPP ? 'PP' : 'PM',
    statutClient,
    signataire,
    gestionnaire,
    origine: str(f.origine) || null,
    dateEntree: str(f.date_entree) || null,
    notesInternes: str(f.notes_internes) || null,
    phone: isPP ? str(f.pp_tel_mobile) : str(f.pm_tel),
    phoneMobile: str(f.pp_tel_mobile) || null,
    phoneHome: str(f.pp_tel_maison) || null,
    phoneOffice: str(f.pp_tel_bureau) || null,
    address: isPP ? str(f.pp_adresse) : str(f.pm_adresse),
    postalCode: isPP ? str(f.pp_cp) : str(f.pm_cp),
    city: isPP ? str(f.pp_ville) : str(f.pm_ville),
    country: isPP ? str(f.pp_pays) || 'France' : null,
    fiscalCountry: str(f.pm_pays_fiscal) || null,
    civilite: str(f.pp_civilite) || null,
    firstName: str(f.pp_prenom) || null,
    lastName: str(f.pp_nom) || null,
    birthDate: str(f.pp_ddn) || null,
    birthPlace: str(f.pp_lieu_naissance) || null,
    nationality: str(f.pp_nationalite) || null,
    maritalStatus: str(f.pp_situation) || null,
    matrimonialRegime: str(f.pp_regime) || null,
    profession: str(f.pp_profession) || null,
    proStatus: str(f.pp_statut_pro) || null,
    sector: str(f.pp_secteur) || null,
    employer: str(f.pp_societe_employeur) || null,
    annualIncome: num(f.pp_revenus),
    currentCharges: num(f.pp_charges),
    tradeName: str(f.pm_denomination) || str(f.pm_nom_commercial) || null,
    legalForm: str(f.pm_forme_juridique) || null,
    siren: str(f.pm_siren) || null,
    nafCode: str(f.pm_naf) || null,
    activity: str(f.pm_activite) || null,
    legalRepName: str(f.pm_representant_nom) || null,
    legalRepRole: str(f.pm_representant_fonction) || null,
    revenue: str(f.pm_ca) || null,
    totalBalance: str(f.pm_bilan) || null,
    equity: str(f.pm_fonds_propres) || null,
    taxation: str(f.pm_fiscalite) || null,
    capital: str(f.pm_fonds_propres) || null,
    patrimoineImmobilier: str(isPP ? f.pp_pat_immo : f.pm_pat_immo) || null,
    patrimoineEpargne: str(isPP ? f.pp_pat_epargne : f.pm_pat_epargne) || null,
    patrimoineParticipations: str(isPP ? f.pp_pat_partici : f.pm_pat_partici) || null,
    patrimoineLiquidites: str(isPP ? f.pp_pat_liqui : f.pm_pat_liqui) || null,
    patrimoineAutres: str(isPP ? f.pp_pat_autres : f.pm_pat_autres) || null,
    fccStatut: str(f.fcc_statut) || 'Non envoyé',
    fccDate: str(f.fcc_date) || null,
    derStatut: str(f.der_statut) || 'Non envoyé',
    derDate: str(f.der_date) || null,
    derEnvoiTimestamp: str(f.der_envoi_timestamp) || null,
    ldmStatut: str(f.ldm_statut) || 'Non envoyé',
    ldmDate: str(f.ldm_date) || null,
    be1: {
      nom: str(f.be1_nom) || null,
      ddn: str(f.be1_ddn) || null,
      lieuNaissance: str(f.be1_lieu_naissance) || null,
      nationalite: str(f.be1_nationalite) || null,
      adresse: str(f.be1_adresse) || null,
      residenceFiscale: str(f.be1_residence_fiscale) || null,
      detention: str(f.be1_detention) || null,
    },
    be2: {
      nom: str(f.be2_nom) || null,
      ddn: str(f.be2_ddn) || null,
      lieuNaissance: str(f.be2_lieu_naissance) || null,
      nationalite: str(f.be2_nationalite) || null,
      adresse: str(f.be2_adresse) || null,
      residenceFiscale: str(f.be2_residence_fiscale) || null,
      detention: str(f.be2_detention) || null,
    },
    be3: {
      nom: str(f.be3_nom) || null,
      ddn: str(f.be3_ddn) || null,
      lieuNaissance: str(f.be3_lieu_naissance) || null,
      nationalite: str(f.be3_nationalite) || null,
      adresse: str(f.be3_adresse) || null,
      residenceFiscale: str(f.be3_residence_fiscale) || null,
      detention: str(f.be3_detention) || null,
    },
    be4: {
      nom: str(f.be4_nom) || null,
      ddn: str(f.be4_ddn) || null,
      lieuNaissance: str(f.be4_lieu_naissance) || null,
      nationalite: str(f.be4_nationalite) || null,
      adresse: str(f.be4_adresse) || null,
      residenceFiscale: str(f.be4_residence_fiscale) || null,
      detention: str(f.be4_detention) || null,
    },
  };
}

async function buildClientIdMap(tenantId: string): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const clients = await clientsRepo.listClientsByTenantId(tenantId);
  for (const c of clients) {
    if (c.airtable_record_id) map.set(c.airtable_record_id, c.id);
  }
  return map;
}

async function main() {
  const tenantSlug = parseArg('tenant-slug') || 'nm-prime';
  const exportDir = parseArg('export-dir');
  const onlyArg = parseArg('only');
  const steps: MigrationStep[] = onlyArg
    ? onlyArg.split(',').map((s) => s.trim()) as MigrationStep[]
    : ALL_STEPS;

  for (const step of steps) {
    if (!ALL_STEPS.includes(step)) {
      throw new Error(`Unknown step "${step}". Valid: ${ALL_STEPS.join(', ')}`);
    }
  }

  if (!isBaserowConfigured()) {
    throw new Error('Baserow is not configured');
  }

  const tenant = await tenantsRepo.findTenantBySlug(tenantSlug);
  if (!tenant?.database_id || !tenant?.database_token) {
    throw new Error(
      `Tenant "${tenantSlug}" not found or missing workspace provisioning. `
      + 'Run: npm run provision:tenant-workspace -- --slug=' + tenantSlug,
    );
  }

  const tenantId = tenant.id;
  const mode = exportDir ? `export dir ${exportDir}` : 'Airtable API';
  console.log(`Migrating → Baserow for tenant ${tenant.name} (${tenantId}) via ${mode}`);
  if (steps.length < ALL_STEPS.length) {
    console.log(`Steps: ${steps.join(', ')}`);
  }

  const gestionnaireNames = new Map<string, string>();
  let clientIdMap = await buildClientIdMap(tenantId);
  let clientDisplayMap = new Map<string, string>();

  if (steps.includes('gestionnaires')) {
    const gestionnaireRecords = await loadRecords(
      'gestionnaires',
      exportDir,
      env.airtable.tableGestionnaires,
    );
    let usersLinked = 0;
    for (const rec of gestionnaireRecords) {
      const mapped = mapAirtableGestionnaire(rec);
      gestionnaireNames.set(rec.id, mapped.name);

      let userId: string | null = null;
      const user = await usersRepo.upsertStandardUserFromGestionnaire({
        email: mapped.email || null,
        name: mapped.name,
        tenantId,
        status: mapped.status,
        airtableRecordId: rec.id,
      });
      userId = user.id;
      usersLinked += 1;
      if (!mapped.email) {
        console.log(`  · Gestionnaire ${rec.id} (${mapped.name}): no email — user created without login email`);
      }

      await gestionnairesRepo.upsertGestionnaire(tenantId, {
        ...mapped,
        email: mapped.email || null,
        userId,
      });
    }
    console.log(`✓ Gestionnaires: ${gestionnaireRecords.length}`);
    console.log(`✓ Users linked (standard_user): ${usersLinked}`);
  } else {
    const existing = await gestionnairesRepo.listGestionnaireAirtableNameMap(tenantId);
    for (const [id, name] of existing) gestionnaireNames.set(id, name);
  }

  if (steps.includes('clients')) {
    const clientRecords = await loadRecords('clients', exportDir, env.airtable.tableClients);
    clientDisplayMap = buildClientDisplayMap(clientRecords);
    for (const rec of clientRecords) {
      const mapped = mapAirtableClient(rec.fields, gestionnaireNames);
      try {
        const saved = await clientsRepo.upsertClientFromAirtable(tenantId, rec.id, mapped);
        clientIdMap.set(rec.id, saved.id);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(`Client ${rec.id} (${mapped.name}): ${msg}`);
      }
    }
    console.log(`✓ Clients: ${clientRecords.length}`);
  } else {
    clientIdMap = await buildClientIdMap(tenantId);
  }

  if (steps.includes('relations')) {
    const relationRecords = await loadRecords('relations', exportDir, env.airtable.tableRelations);
    let imported = 0;
    for (const rec of relationRecords) {
      const f = rec.fields;
      const clientAId = clientIdMap.get(str(f.client_a_id));
      const clientBId = clientIdMap.get(str(f.client_b_id));
      if (!clientAId || !clientBId) continue;
      await relationsRepo.upsertRelationFromAirtable(tenantId, {
        clientAId,
        clientBId,
        typeRelation: str(f.type_relation) || 'Relation',
        pctDetention: num(f.pct_detention),
        note: str(f.note) || null,
        airtableRecordId: rec.id,
      });
      imported++;
    }
    console.log(`✓ Relations: ${imported}/${relationRecords.length}`);
  }

  if (steps.includes('kyc-docs')) {
    const kycDocRecords = await loadRecords('kyc-docs', exportDir, env.airtable.tableKycDocs);
    let imported = 0;
    let orphans = 0;
    for (const rec of kycDocRecords) {
      const f = rec.fields;
      const atClientId = str(f.client_id) || resolveClientAirtableId(f, clientDisplayMap) || '';
      const clientId = atClientId ? clientIdMap.get(atClientId) : undefined;
      if (!clientId) orphans++;
      await kycDocsRepo.upsertKycDocumentFromAirtable(tenantId, {
        clientId: clientId ?? null,
        clientIdOld: !clientId && atClientId ? atClientId : null,
        clientNom: !clientId ? str(f.client_nom) || null : null,
        docType: str(f.doc_type) || str(f.doc_code) || 'Document',
        recu: Boolean(f.recu),
        dateReception: str(f.date_reception) || null,
        dateValidite: str(f.date_validite) || null,
        urlDocument: str(f.url_document) || null,
        airtableRecordId: rec.id,
      });
      imported++;
    }
    console.log(`✓ KYC documents: ${imported}/${kycDocRecords.length}${orphans ? ` (${orphans} without resolved client)` : ''}`);
  }

  if (steps.includes('notes')) {
    const noteRecords = await loadRecords('notes', exportDir, env.airtable.tableNotes);
    let imported = 0;
    let orphans = 0;
    for (const rec of noteRecords) {
      const f = rec.fields;
      const atClientId = resolveClientAirtableId(f, clientDisplayMap);
      const clientId = atClientId ? clientIdMap.get(atClientId) : undefined;
      if (!clientId) orphans++;
      const auteur = resolveLinkedName(f.Auteur, gestionnaireNames) || '';
      await notesRepo.upsertNoteFromAirtable(tenantId, {
        clientId: clientId ?? null,
        date: str(f.Date) || undefined,
        noteType: str(f.Type) || 'Note interne',
        auteur,
        contenu: str(f.Contenu),
        airtableRecordId: rec.id,
      });
      imported++;
    }
    console.log(`✓ Notes: ${imported}/${noteRecords.length}${orphans ? ` (${orphans} without resolved client)` : ''}`);
  }

  if (steps.includes('tasks')) {
    const taskRecords = await loadRecords('tasks', exportDir, env.airtable.tableTasks);
    let imported = 0;
    for (const rec of taskRecords) {
      const f = rec.fields;
      const atClientId = resolveClientAirtableId(f, clientDisplayMap);
      if (!atClientId) continue;
      const clientId = clientIdMap.get(atClientId);
      if (!clientId) continue;
      const assigneA = resolveLinkedName(f['Assigné à'], gestionnaireNames) || '';
      await tasksRepo.upsertTaskFromAirtable(tenantId, {
        clientId,
        title: str(f.Titre) || 'Tâche',
        description: str(f.Description) || undefined,
        status: str(f.Statut) || 'À faire',
        priorite: str(f['Priorité']) || 'Normale',
        assigneA,
        dueDate: str(f['Date d\'échéance']) || undefined,
        airtableRecordId: rec.id,
      });
      imported++;
    }
    console.log(`✓ Tasks: ${imported}/${taskRecords.length}`);
  }

  if (steps.includes('fcc-submissions')) {
    const fccRecords = await loadRecords('fcc-submissions', exportDir, env.airtable.tableFccClients);
    let imported = 0;
    let orphans = 0;
    for (const rec of fccRecords) {
      const f = rec.fields;
      const atClientId = resolveClientAirtableId(f, clientDisplayMap);
      const clientId = atClientId ? clientIdMap.get(atClientId) : undefined;
      if (!clientId) orphans++;
      await fccSubmissionsRepo.upsertSubmissionFromAirtable(tenantId, {
        clientId: clientId ?? null,
        submittedAt: str(f.Date_Soumission) || str(f.date_soumission) || str(f['Date soumission']) || str(f.created_time) || null,
        formType: str(f.Type_Formulaire) || str(f.type_client) || str(f.form_type) || str(f['Type']) || 'PP',
        profilRisque: str(f.Profil_Risque) || str(f.profil_risque) || str(f['Profil risque']) || null,
        profilConnaissance: str(f.Profil_Connaissance) || str(f.profil_connaissance) || str(f['Profil connaissance']) || null,
        scoreConnaissance: num(f.Score_Connaissance) ?? num(f.score_connaissance) ?? num(f['Score connaissance']),
        scoreRisque: num(f.Score_Risque) ?? num(f.score_risque) ?? num(f['Score risque']),
        statut: str(f.statut) || str(f.Statut) || 'Soumis',
        airtableRecordId: rec.id,
        typeFormulaire: str(f.Type_Formulaire) || str(f.form_type) || null,
        idFormulaire: str(f.ID_Formulaire) || str(f.form_id) || null,
        dateSoumission: str(f.Date_Soumission) || str(f.date_soumission) || null,
        statutDossier: str(f.Statut_Dossier) || str(f.statut_dossier) || null,
        client: str(f.Client) || str(f.client_nom_complet) || null,
        email: str(f.Email) || str(f.client_email) || null,
        telephone: str(f.Telephone) || str(f.client_tel) || null,
        ville: str(f.Ville) || str(f.client_ville) || null,
        profession: str(f.Profession) || str(f.client_profession) || null,
        scoreTotal: num(f.Score_Total) ?? num(f.score_total),
        sharepointFileUrl: str(f.SharePoint_File_URL) || null,
        sharepointFileId: str(f.SharePoint_File_ID) || null,
        ipClient: str(f.IP_Client) || str(f.user_agent) || null,
        pdfFilename: str(f.pdf_filename) || null,
        prefillToken: str(f.prefill_token) || null,
        boAgent: str(f.bo_agent) || null,
        be1Nom: str(f.be1_nom) || null,
        be1Ddn: str(f.be1_ddn) || null,
        be1LieuNaissance: str(f.be1_lieu_naissance) || null,
        be1Nationalite: str(f.be1_nationalite) || null,
        be1ResidenceFiscale: str(f.be1_residence_fiscale) || null,
        be1Adresse: str(f.be1_adresse) || null,
        be1Detention: str(f.be1_detention) || null,
        be2Nom: str(f.be2_nom) || null,
        be2Ddn: str(f.be2_ddn) || null,
        be2LieuNaissance: str(f.be2_lieu_naissance) || null,
        be2Nationalite: str(f.be2_nationalite) || null,
        be2ResidenceFiscale: str(f.be2_residence_fiscale) || null,
        be2Adresse: str(f.be2_adresse) || null,
        be2Detention: str(f.be2_detention) || null,
        be3Nom: str(f.be3_nom) || null,
        be3Ddn: str(f.be3_ddn) || null,
        be3Nationalite: str(f.be3_nationalite) || null,
        be3Detention: str(f.be3_detention) || null,
        be4Nom: str(f.be4_nom) || null,
        be4Ddn: str(f.be4_ddn) || null,
        be4Nationalite: str(f.be4_nationalite) || null,
        be4Detention: str(f.be4_detention) || null,
        clientDenomination: str(f.client_denomination) || null,
        clientRepresentantNom: str(f.client_representant_nom) || null,
        clientRepresentantFonction: str(f.client_representant_fonction) || null,
        clientSiren: str(f.client_siren) || null,
        clientNaf: str(f.client_naf) || null,
        clientActivite: str(f.client_activite) || null,
        clientFormeJuridique: str(f.client_forme_juridique) || null,
        clientCa: str(f.client_ca) || null,
        clientBilan: str(f.client_bilan) || null,
        clientFondsPropres: str(f.client_fonds_propres) || null,
        clientFiscalite: str(f.client_fiscalite) || null,
        docusignEnvelopeId: str(f.DocuSign_Envelope_ID) || str(f.docusign_envelope_id) || null,
      });
      imported++;
    }
    console.log(`✓ FCC submissions: ${imported}/${fccRecords.length}${orphans ? ` (${orphans} without resolved client)` : ''}`);
  }

  console.log('\nMigration complete.');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
