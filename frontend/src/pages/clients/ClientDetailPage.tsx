import { Children, isValidElement, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import { useClient, useCreateClient, useUpdateClient } from '../../hooks';
import { useConfirm } from '../../context/ConfirmContext';
import LoadingPopup from '../../components/ui/LoadingPopup';
import PageLoading from '../../components/ui/PageLoading';
import Select from '../../components/ui/Select';
import type { Client, ClientInputFields, ClientType } from '../../types';

const EMPTY_FORM: ClientInputFields = {
  name: '',
  email: '',
  clientType: 'PP',
  kycStatus: 'pending',
  status: 'prospect',
  signataire: '',
  gestionnaire: '',
  origine: '',
  dateEntree: '',
  phone: '',
  address: '',
  postalCode: '',
  city: '',
  country: 'France',
  civilite: '',
  firstName: '',
  lastName: '',
  birthDate: '',
  birthPlace: '',
  nationality: '',
  maritalStatus: '',
  matrimonialRegime: '',
  profession: '',
  proStatus: '',
  sector: '',
  employer: '',
  annualIncome: null,
  currentCharges: null,
  tradeName: '',
  legalForm: '',
  siren: '',
  nafCode: '',
  activity: '',
  legalRepName: '',
  legalRepRole: '',
  revenue: '',
  totalBalance: '',
  equity: '',
  taxation: '',
  patrimoineImmobilier: '',
  patrimoineEpargne: '',
  patrimoineParticipations: '',
  patrimoineLiquidites: '',
  patrimoineAutres: '',
};

function clientToForm(client: Client): ClientInputFields {
  return {
    name: client.name,
    email: client.email ?? '',
    clientType: client.clientType,
    kycStatus: client.kycStatus,
    status: client.status,
    signataire: client.signataire ?? '',
    gestionnaire: client.gestionnaire ?? '',
    origine: client.origine ?? '',
    dateEntree: client.dateEntree ?? '',
    phone: client.phone ?? '',
    address: client.address ?? '',
    postalCode: client.postalCode ?? '',
    city: client.city ?? '',
    country: client.country ?? '',
    civilite: client.civilite ?? '',
    firstName: client.firstName ?? '',
    lastName: client.lastName ?? '',
    birthDate: client.birthDate ?? '',
    birthPlace: client.birthPlace ?? '',
    nationality: client.nationality ?? '',
    maritalStatus: client.maritalStatus ?? '',
    matrimonialRegime: client.matrimonialRegime ?? '',
    profession: client.profession ?? '',
    proStatus: client.proStatus ?? '',
    sector: client.sector ?? '',
    employer: client.employer ?? '',
    annualIncome: client.annualIncome,
    currentCharges: client.currentCharges,
    tradeName: client.tradeName ?? '',
    legalForm: client.legalForm ?? '',
    siren: client.siren ?? '',
    nafCode: client.nafCode ?? '',
    activity: client.activity ?? '',
    legalRepName: client.legalRepName ?? '',
    legalRepRole: client.legalRepRole ?? '',
    revenue: client.revenue ?? '',
    totalBalance: client.totalBalance ?? '',
    equity: client.equity ?? '',
    taxation: client.taxation ?? '',
    patrimoineImmobilier: client.patrimoineImmobilier ?? '',
    patrimoineEpargne: client.patrimoineEpargne ?? '',
    patrimoineParticipations: client.patrimoineParticipations ?? '',
    patrimoineLiquidites: client.patrimoineLiquidites ?? '',
    patrimoineAutres: client.patrimoineAutres ?? '',
  };
}

function resolveDisplayName(form: ClientInputFields): string {
  if (form.name.trim()) return form.name.trim();
  if (form.clientType === 'PM') {
    return form.tradeName?.trim() || form.name.trim();
  }
  const parts = [form.lastName?.trim(), form.firstName?.trim()].filter(Boolean);
  return parts.join(' ');
}

function toPayload(form: ClientInputFields): ClientInputFields {
  const emptyToNull = (value: string | null | undefined) => (value === '' ? null : value ?? null);

  return {
    ...form,
    name: resolveDisplayName(form),
    email: form.email?.trim() ?? '',
    signataire: emptyToNull(form.signataire ?? ''),
    gestionnaire: emptyToNull(form.gestionnaire ?? ''),
    origine: emptyToNull(form.origine ?? ''),
    dateEntree: emptyToNull(form.dateEntree ?? ''),
    phone: emptyToNull(form.phone ?? ''),
    address: emptyToNull(form.address ?? ''),
    postalCode: emptyToNull(form.postalCode ?? ''),
    city: emptyToNull(form.city ?? ''),
    country: emptyToNull(form.country ?? ''),
    civilite: emptyToNull(form.civilite ?? ''),
    firstName: emptyToNull(form.firstName ?? ''),
    lastName: emptyToNull(form.lastName ?? ''),
    birthDate: emptyToNull(form.birthDate ?? ''),
    birthPlace: emptyToNull(form.birthPlace ?? ''),
    nationality: emptyToNull(form.nationality ?? ''),
    maritalStatus: emptyToNull(form.maritalStatus ?? ''),
    matrimonialRegime: emptyToNull(form.matrimonialRegime ?? ''),
    profession: emptyToNull(form.profession ?? ''),
    proStatus: emptyToNull(form.proStatus ?? ''),
    sector: emptyToNull(form.sector ?? ''),
    employer: emptyToNull(form.employer ?? ''),
    tradeName: emptyToNull(form.tradeName ?? ''),
    legalForm: emptyToNull(form.legalForm ?? ''),
    siren: emptyToNull(form.siren ?? ''),
    nafCode: emptyToNull(form.nafCode ?? ''),
    activity: emptyToNull(form.activity ?? ''),
    legalRepName: emptyToNull(form.legalRepName ?? ''),
    legalRepRole: emptyToNull(form.legalRepRole ?? ''),
    revenue: emptyToNull(form.revenue ?? ''),
    totalBalance: emptyToNull(form.totalBalance ?? ''),
    equity: emptyToNull(form.equity ?? ''),
    taxation: emptyToNull(form.taxation ?? ''),
    patrimoineImmobilier: emptyToNull(form.patrimoineImmobilier ?? ''),
    patrimoineEpargne: emptyToNull(form.patrimoineEpargne ?? ''),
    patrimoineParticipations: emptyToNull(form.patrimoineParticipations ?? ''),
    patrimoineLiquidites: emptyToNull(form.patrimoineLiquidites ?? ''),
    patrimoineAutres: emptyToNull(form.patrimoineAutres ?? ''),
  };
}

interface FieldProps {
  label: string;
  children: ReactNode;
  full?: boolean;
}

function FormField({ label, children, full }: FieldProps) {
  const child = Children.count(children) === 1 ? Children.only(children) : null;
  const usesCustomSelect = isValidElement(child) && child.type === Select;

  return (
    <label className={`field${full ? ' field--full' : ''}`}>
      <span>{label}</span>
      {usesCustomSelect ? children : <div className="field-input">{children}</div>}
    </label>
  );
}

export default function ClientDetailPage() {
  const { clientId } = useParams();
  const isNew = !clientId;
  const navigate = useNavigate();
  const clientQuery = useClient(isNew ? undefined : clientId);
  const createMutation = useCreateClient();
  const updateMutation = useUpdateClient();
  const confirm = useConfirm();
  const [form, setForm] = useState<ClientInputFields>(EMPTY_FORM);

  useEffect(() => {
    if (clientQuery.data) {
      setForm(clientToForm(clientQuery.data));
    }
  }, [clientQuery.data]);

  const setField = <K extends keyof ClientInputFields>(key: K, value: ClientInputFields[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const mutationError = createMutation.error || updateMutation.error;
  const isPP = form.clientType === 'PP';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = toPayload(form);
    if (!payload.name) return;

    const confirmed = await confirm(
      isNew
        ? {
            title: 'Créer le client',
            message: `Créer le client « ${payload.name} » ?`,
            confirmLabel: 'Créer',
          }
        : {
            title: 'Enregistrer les modifications',
            message: `Confirmer la mise à jour de « ${payload.name} » ?`,
            confirmLabel: 'Enregistrer',
          },
    );
    if (!confirmed) return;

    if (isNew) {
      createMutation.mutate(payload, {
        onSuccess: (data) => navigate(`/dashboard/clients/${data.client.id}`),
      });
      return;
    }

    updateMutation.mutate(
      { id: clientId!, ...payload },
      { onSuccess: () => navigate('/dashboard/clients') },
    );
  };

  if (!isNew && clientQuery.isLoading) {
    return (
      <div className="dashboard-content">
        <PageLoading message="Chargement du client…" />
      </div>
    );
  }

  if (!isNew && clientQuery.isError) {
    return (
      <div className="dashboard-content">
        <p className="form-error">{clientQuery.error.message}</p>
      </div>
    );
  }

  if (!isNew && !clientQuery.data) {
    return (
      <div className="dashboard-content">
        <p className="form-error">Client introuvable.</p>
        <Link to="/dashboard/clients" className="breadcrumb-link">Retour aux clients</Link>
      </div>
    );
  }

  return (
    <div className="dashboard-content">
      <LoadingPopup
        show={isPending}
        title={isNew ? 'Création du client' : 'Modification du client'}
        message="Nous enregistrons les informations et actualisons le portefeuille."
      />

      <header className="dashboard-header">
        <Link to="/dashboard/clients" className="breadcrumb-link">
          <FiArrowLeft />
          Retour aux clients
        </Link>
        <h1>{isNew ? 'Nouveau client' : `Modifier — ${clientQuery.data?.name}`}</h1>
      </header>

      <section className="data-panel tenant-form-panel">
      <form className="tenant-form" onSubmit={handleSubmit}>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <button
            type="button"
            className={`btn-secondary btn-secondary--sm${isPP ? ' active' : ''}`}
            onClick={() => setField('clientType', 'PP' as ClientType)}
          >
            Personne physique (PP)
          </button>
          <button
            type="button"
            className={`btn-secondary btn-secondary--sm${!isPP ? ' active' : ''}`}
            onClick={() => setField('clientType', 'PM' as ClientType)}
          >
            Personne morale (PM)
          </button>
        </div>

        <h2 className="tenant-form__title">Informations générales</h2>
        <div className="tenant-form__fields">
          <FormField label="Nom du dossier">
            <input
              type="text"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              placeholder={isPP ? 'Nom Prénom' : 'Dénomination sociale'}
            />
          </FormField>
          <FormField label="E-mail">
            <input
              type="email"
              value={form.email ?? ''}
              onChange={(e) => setField('email', e.target.value)}
            />
          </FormField>
          <FormField label="Statut">
            <Select value={form.status ?? 'prospect'} onChange={(e) => setField('status', e.target.value)}>
              <option value="prospect">Prospect</option>
              <option value="active">Client actif</option>
              <option value="inactive">Inactif</option>
              <option value="archived">Archivé</option>
            </Select>
          </FormField>
          <FormField label="Statut KYC">
            <Select value={form.kycStatus ?? 'pending'} onChange={(e) => setField('kycStatus', e.target.value)}>
              <option value="pending">En attente</option>
              <option value="in_progress">En cours</option>
              <option value="complete">Complet</option>
              <option value="rejected">Rejeté</option>
            </Select>
          </FormField>
          <FormField label="Origine">
            <Select value={form.origine ?? ''} onChange={(e) => setField('origine', e.target.value)}>
              <option value="">—</option>
              <option value="Recommandation">Recommandation</option>
              <option value="Réseau">Réseau</option>
              <option value="Évènement">Évènement</option>
              <option value="Site web">Site web</option>
              <option value="Autre">Autre</option>
            </Select>
          </FormField>
          <FormField label="Date d'entrée en relation">
            <input
              type="date"
              value={form.dateEntree ?? ''}
              onChange={(e) => setField('dateEntree', e.target.value)}
            />
          </FormField>
          <FormField label="Téléphone">
            <input type="tel" value={form.phone ?? ''} onChange={(e) => setField('phone', e.target.value)} />
          </FormField>
          <FormField label="Signataire DocuSign">
            <input
              type="text"
              value={form.signataire ?? ''}
              onChange={(e) => setField('signataire', e.target.value)}
            />
          </FormField>
          <FormField label="Gestionnaire">
            <input
              type="text"
              value={form.gestionnaire ?? ''}
              onChange={(e) => setField('gestionnaire', e.target.value)}
            />
          </FormField>
        </div>

        {isPP ? (
          <>
            <h2 className="tenant-form__title">Identité — Personne physique</h2>
            <div className="tenant-form__fields">
              <FormField label="Civilité">
                <Select value={form.civilite ?? ''} onChange={(e) => setField('civilite', e.target.value)}>
                  <option value="">—</option>
                  <option value="M.">M.</option>
                  <option value="Mme">Mme</option>
                </Select>
              </FormField>
              <FormField label="Nom">
                <input
                  type="text"
                  value={form.lastName ?? ''}
                  onChange={(e) => setField('lastName', e.target.value)}
                  style={{ textTransform: 'uppercase' }}
                />
              </FormField>
              <FormField label="Prénom">
                <input
                  type="text"
                  value={form.firstName ?? ''}
                  onChange={(e) => setField('firstName', e.target.value)}
                />
              </FormField>
              <FormField label="Date de naissance">
                <input
                  type="date"
                  value={form.birthDate ?? ''}
                  onChange={(e) => setField('birthDate', e.target.value)}
                />
              </FormField>
              <FormField label="Lieu de naissance">
                <input
                  type="text"
                  value={form.birthPlace ?? ''}
                  onChange={(e) => setField('birthPlace', e.target.value)}
                />
              </FormField>
              <FormField label="Nationalité">
                <input
                  type="text"
                  value={form.nationality ?? ''}
                  onChange={(e) => setField('nationality', e.target.value)}
                />
              </FormField>
              <FormField label="Adresse" full>
                <input
                  type="text"
                  value={form.address ?? ''}
                  onChange={(e) => setField('address', e.target.value)}
                />
              </FormField>
              <FormField label="Code postal">
                <input
                  type="text"
                  value={form.postalCode ?? ''}
                  onChange={(e) => setField('postalCode', e.target.value)}
                />
              </FormField>
              <FormField label="Ville">
                <input type="text" value={form.city ?? ''} onChange={(e) => setField('city', e.target.value)} />
              </FormField>
              <FormField label="Pays">
                <input
                  type="text"
                  value={form.country ?? ''}
                  onChange={(e) => setField('country', e.target.value)}
                />
              </FormField>
              <FormField label="Situation matrimoniale">
                <Select
                  value={form.maritalStatus ?? ''}
                  onChange={(e) => setField('maritalStatus', e.target.value)}
                >
                  <option value="">—</option>
                  <option value="Marié(e)">Marié(e)</option>
                  <option value="Pacsé(e)">Pacsé(e)</option>
                  <option value="Concubinage">Concubinage</option>
                  <option value="Divorcé(e)">Divorcé(e)</option>
                  <option value="Veuf(ve)">Veuf(ve)</option>
                  <option value="Célibataire">Célibataire</option>
                </Select>
              </FormField>
              <FormField label="Régime matrimonial">
                <Select
                  value={form.matrimonialRegime ?? ''}
                  onChange={(e) => setField('matrimonialRegime', e.target.value)}
                >
                  <option value="">—</option>
                  <option value="Communauté réduite aux acquêts">Communauté réduite aux acquêts</option>
                  <option value="Communauté universelle">Communauté universelle</option>
                  <option value="Séparation de biens">Séparation de biens</option>
                  <option value="Participation aux acquêts">Participation aux acquêts</option>
                  <option value="Sans objet">Sans objet</option>
                </Select>
              </FormField>
              <FormField label="Profession">
                <input
                  type="text"
                  value={form.profession ?? ''}
                  onChange={(e) => setField('profession', e.target.value)}
                />
              </FormField>
              <FormField label="Statut professionnel">
                <Select value={form.proStatus ?? ''} onChange={(e) => setField('proStatus', e.target.value)}>
                  <option value="">—</option>
                  <option value="TNS">TNS</option>
                  <option value="Salarié(e)">Salarié(e)</option>
                  <option value="Fonctionnaire">Fonctionnaire</option>
                  <option value="Dirigeant">Dirigeant</option>
                  <option value="Retraité(e)">Retraité(e)</option>
                  <option value="Autre">Autre</option>
                </Select>
              </FormField>
              <FormField label="Secteur">
                <input type="text" value={form.sector ?? ''} onChange={(e) => setField('sector', e.target.value)} />
              </FormField>
              <FormField label="Société employeur">
                <input
                  type="text"
                  value={form.employer ?? ''}
                  onChange={(e) => setField('employer', e.target.value)}
                />
              </FormField>
            </div>

            <h2 className="tenant-form__title">Situation financière</h2>
            <div className="tenant-form__fields">
              <FormField label="Revenus annuels (K€)">
                <input
                  type="number"
                  value={form.annualIncome ?? ''}
                  onChange={(e) => setField('annualIncome', e.target.value ? Number(e.target.value) : null)}
                />
              </FormField>
              <FormField label="Charges courantes (K€)">
                <input
                  type="number"
                  value={form.currentCharges ?? ''}
                  onChange={(e) => setField('currentCharges', e.target.value ? Number(e.target.value) : null)}
                />
              </FormField>
            </div>
          </>
        ) : (
          <>
            <h2 className="tenant-form__title">Identité — Personne morale</h2>
            <div className="tenant-form__fields">
              <FormField label="Dénomination sociale" full>
                <input
                  type="text"
                  value={form.tradeName ?? ''}
                  onChange={(e) => setField('tradeName', e.target.value)}
                  style={{ textTransform: 'uppercase' }}
                />
              </FormField>
              <FormField label="Forme juridique">
                <Select value={form.legalForm ?? ''} onChange={(e) => setField('legalForm', e.target.value)}>
                  <option value="">—</option>
                  <option value="SAS">SAS</option>
                  <option value="SASU">SASU</option>
                  <option value="SARL">SARL</option>
                  <option value="EURL">EURL</option>
                  <option value="SA">SA</option>
                  <option value="SCI">SCI</option>
                  <option value="SNC">SNC</option>
                  <option value="Autre">Autre</option>
                </Select>
              </FormField>
              <FormField label="SIREN">
                <input type="text" value={form.siren ?? ''} onChange={(e) => setField('siren', e.target.value)} />
              </FormField>
              <FormField label="Code NAF">
                <input type="text" value={form.nafCode ?? ''} onChange={(e) => setField('nafCode', e.target.value)} />
              </FormField>
              <FormField label="Activité" full>
                <input type="text" value={form.activity ?? ''} onChange={(e) => setField('activity', e.target.value)} />
              </FormField>
              <FormField label="Adresse siège" full>
                <input
                  type="text"
                  value={form.address ?? ''}
                  onChange={(e) => setField('address', e.target.value)}
                />
              </FormField>
              <FormField label="Code postal">
                <input
                  type="text"
                  value={form.postalCode ?? ''}
                  onChange={(e) => setField('postalCode', e.target.value)}
                />
              </FormField>
              <FormField label="Ville">
                <input type="text" value={form.city ?? ''} onChange={(e) => setField('city', e.target.value)} />
              </FormField>
              <FormField label="Pays fiscal">
                <input
                  type="text"
                  value={form.country ?? ''}
                  onChange={(e) => setField('country', e.target.value)}
                />
              </FormField>
              <FormField label="Représentant légal">
                <input
                  type="text"
                  value={form.legalRepName ?? ''}
                  onChange={(e) => setField('legalRepName', e.target.value)}
                />
              </FormField>
              <FormField label="Fonction">
                <input
                  type="text"
                  value={form.legalRepRole ?? ''}
                  onChange={(e) => setField('legalRepRole', e.target.value)}
                />
              </FormField>
            </div>

            <h2 className="tenant-form__title">Situation financière</h2>
            <div className="tenant-form__fields">
              <FormField label="Chiffre d'affaires (K€)">
                <input type="text" value={form.revenue ?? ''} onChange={(e) => setField('revenue', e.target.value)} />
              </FormField>
              <FormField label="Total bilan (K€)">
                <input
                  type="text"
                  value={form.totalBalance ?? ''}
                  onChange={(e) => setField('totalBalance', e.target.value)}
                />
              </FormField>
              <FormField label="Fonds propres (K€)">
                <input type="text" value={form.equity ?? ''} onChange={(e) => setField('equity', e.target.value)} />
              </FormField>
              <FormField label="Fiscalité">
                <input
                  type="text"
                  value={form.taxation ?? ''}
                  onChange={(e) => setField('taxation', e.target.value)}
                  placeholder="IS, IR…"
                />
              </FormField>
            </div>
          </>
        )}

        <h2 className="tenant-form__title">Patrimoine</h2>
        <div className="tenant-form__fields">
          <FormField label="Immobilier">
            <input
              type="text"
              value={form.patrimoineImmobilier ?? ''}
              onChange={(e) => setField('patrimoineImmobilier', e.target.value)}
              placeholder="K€ ou %"
            />
          </FormField>
          <FormField label="Épargne long terme">
            <input
              type="text"
              value={form.patrimoineEpargne ?? ''}
              onChange={(e) => setField('patrimoineEpargne', e.target.value)}
              placeholder="K€ ou %"
            />
          </FormField>
          <FormField label="Participations">
            <input
              type="text"
              value={form.patrimoineParticipations ?? ''}
              onChange={(e) => setField('patrimoineParticipations', e.target.value)}
              placeholder="K€ ou %"
            />
          </FormField>
          <FormField label="Liquidités">
            <input
              type="text"
              value={form.patrimoineLiquidites ?? ''}
              onChange={(e) => setField('patrimoineLiquidites', e.target.value)}
              placeholder="K€ ou %"
            />
          </FormField>
          <FormField label="Autres" full>
            <input
              type="text"
              value={form.patrimoineAutres ?? ''}
              onChange={(e) => setField('patrimoineAutres', e.target.value)}
              placeholder="K€ ou %"
            />
          </FormField>
        </div>

        {mutationError && <p className="form-error">{mutationError.message}</p>}

        <div className="tenant-form__actions">
          <Link to="/dashboard/clients" className="btn-secondary">Annuler</Link>
          <button type="submit" className="btn-primary btn-primary--inline" disabled={isPending}>
            {isPending ? 'Enregistrement…' : isNew ? 'Créer le client' : 'Enregistrer'}
          </button>
        </div>
      </form>
      </section>
    </div>
  );
}
