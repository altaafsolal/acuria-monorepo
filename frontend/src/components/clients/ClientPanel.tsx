import { useEffect, useMemo, useState, type FormEvent } from 'react';
import './ClientPanel.css';
import {
  useClient,
  useClients,
  useCreateClientNote,
  useCreateClientRelation,
  useCreateClientTask,
  useClientKycDocuments,
  useClientNotes,
  useClientRelations,
  useClientTasks,
  useClientTimeline,
  useDeleteClientNote,
  useDeleteClientRelation,
  useDeleteClientTask,
  useGestionnaires,
  useKycSignataires,
  useUpdateClient,
  useUpdateClientTask,
} from '../../hooks';
import LoadingPopup from '../ui/LoadingPopup';
import PageLoading from '../ui/PageLoading';
import Select from '../ui/Select';
import ClientNotesTab from './ClientNotesTab';
import type { AddNoteInput } from './AddNoteModal';
import ClientRelationsTab, { type AddRelationInput } from './ClientRelationsTab';
import ClientTasksTab, { type TaskStatusOption } from './ClientTasksTab';
import type { AddTaskInput } from './AddTaskModal';
import ClientDocumentsTab from './ClientDocumentsTab';
import ClientPmIdentitySections from './ClientPmIdentitySections';
import { useConfirm } from '../../context/ConfirmContext';
import type { BeneficiaryFields, Client, ClientInputFields } from '../../types';
import {
  formatDateFr,
  isPersonneMorale,
  statutClientBadgeClass,
} from '../../utils/kyc';

type PanelTab = 'identite' | 'societe' | 'documents' | 'relations' | 'notes' | 'taches' | 'timeline';

const TABS: { id: PanelTab; label: string; showPmOnly?: boolean }[] = [
  { id: 'identite', label: 'Identité' },
  { id: 'societe', label: 'Société', showPmOnly: true },
  { id: 'documents', label: 'Documents' },
  { id: 'relations', label: 'Relations' },
  { id: 'notes', label: 'Notes' },
  { id: 'taches', label: 'Tâches' },
  { id: 'timeline', label: 'Timeline' },
];

interface ClientPanelProps {
  clientId: string;
  onClose: () => void;
}

function clientToForm(client: Client): ClientInputFields {
  return {
    name: client.name,
    email: client.email ?? '',
    clientType: client.clientType,
    kycStatus: client.kycStatus,
    status: client.status,
    statutClient: client.statutClient,
    signataire: client.signataire ?? '',
    gestionnaire: client.gestionnaire ?? '',
    origine: client.origine ?? '',
    dateEntree: client.dateEntree ?? '',
    phone: client.phone ?? '',
    phoneMobile: client.phoneMobile ?? '',
    phoneHome: client.phoneHome ?? '',
    phoneOffice: client.phoneOffice ?? '',
    address: client.address ?? '',
    postalCode: client.postalCode ?? '',
    city: client.city ?? '',
    country: client.country ?? 'France',
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
    fiscalCountry: client.fiscalCountry ?? client.country ?? 'France',
    capital: client.capital ?? '',
    patrimoineImmobilier: client.patrimoineImmobilier ?? '',
    patrimoineEpargne: client.patrimoineEpargne ?? '',
    patrimoineParticipations: client.patrimoineParticipations ?? '',
    patrimoineLiquidites: client.patrimoineLiquidites ?? '',
    patrimoineAutres: client.patrimoineAutres ?? '',
    fccStatut: client.fccStatut,
    derStatut: client.derStatut,
    ldmStatut: client.ldmStatut,
    be1: client.be1,
    be2: client.be2,
    be3: client.be3,
    be4: client.be4,
  };
}

export default function ClientPanel({ clientId, onClose }: ClientPanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>('identite');
  const [form, setForm] = useState<ClientInputFields | null>(null);

  const { data: client, isLoading } = useClient(clientId ?? undefined);
  const updateClient = useUpdateClient();
  const { data: gestionnaires = [] } = useGestionnaires();
  const { data: signataires = [] } = useKycSignataires();
  const { data: notes = [] } = useClientNotes(clientId ?? undefined);
  const { data: relations = [] } = useClientRelations(clientId ?? undefined);
  const { data: tasks = [] } = useClientTasks(clientId ?? undefined);
  const { data: kycDocs = [] } = useClientKycDocuments(clientId ?? undefined);
  const { data: timeline = [] } = useClientTimeline(clientId ?? undefined);
  const { data: allClients = [] } = useClients();
  const createNote = useCreateClientNote(clientId ?? '');
  const deleteNote = useDeleteClientNote(clientId ?? '');
  const createRelation = useCreateClientRelation(clientId ?? '');
  const deleteRelation = useDeleteClientRelation(clientId ?? '');
  const createTask = useCreateClientTask(clientId ?? '');
  const updateTask = useUpdateClientTask(clientId ?? '');
  const deleteTask = useDeleteClientTask(clientId ?? '');
  const confirm = useConfirm();

  const isPm = isPersonneMorale(form?.clientType ?? client?.clientType ?? 'PP');

  useEffect(() => {
    if (client) setForm(clientToForm(client));
  }, [client]);

  const visibleTabs = useMemo(
    () => TABS.filter((t) => !t.showPmOnly || isPm),
    [isPm],
  );

  if (!clientId) return null;

  const setField = <K extends keyof ClientInputFields>(key: K, value: ClientInputFields[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const setBeField = (index: 1 | 2 | 3 | 4, key: keyof BeneficiaryFields, value: string) => {
    const beKey = `be${index}` as 'be1' | 'be2' | 'be3' | 'be4';
    setForm((prev) => {
      if (!prev) return prev;
      const current = prev[beKey] ?? {
        nom: null,
        ddn: null,
        lieuNaissance: null,
        nationalite: null,
        adresse: null,
        residenceFiscale: null,
        detention: null,
      };
      return {
        ...prev,
        [beKey]: { ...current, [key]: value || null },
      };
    });
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!form || !clientId) return;
    const confirmed = await confirm({
      title: 'Enregistrer les modifications',
      message: `Confirmer la mise à jour de « ${form.name} » ?`,
      confirmLabel: 'Enregistrer',
    });
    if (!confirmed) return;
    updateClient.mutate({ id: clientId, ...form });
  };

  const handleDeleteNote = async (id: string) => {
    const confirmed = await confirm({
      title: 'Supprimer la note',
      message: 'Cette note sera définitivement supprimée. Continuer ?',
      confirmLabel: 'Supprimer',
      variant: 'danger',
    });
    if (!confirmed) return;
    deleteNote.mutate(id);
  };

  const handleDeleteRelation = async (id: string) => {
    const confirmed = await confirm({
      title: 'Supprimer la relation',
      message: 'Cette relation sera définitivement supprimée. Continuer ?',
      confirmLabel: 'Supprimer',
      variant: 'danger',
    });
    if (!confirmed) return;
    deleteRelation.mutate(id);
  };

  const handleDeleteTask = async (id: string) => {
    const confirmed = await confirm({
      title: 'Supprimer la tâche',
      message: 'Cette tâche sera définitivement supprimée. Continuer ?',
      confirmLabel: 'Supprimer',
      variant: 'danger',
    });
    if (!confirmed) return;
    deleteTask.mutate(id);
  };

  const handleAddNote = (input: AddNoteInput, onSuccess?: () => void) => {
    createNote.mutate({
      date: input.date,
      noteType: input.noteType,
      auteur: input.auteur,
      contenu: input.contenu,
      files: input.files,
    }, { onSuccess });
  };

  const handleAddTask = (input: AddTaskInput, onSuccess?: () => void) => {
    createTask.mutate({
      title: input.title,
      description: input.description || undefined,
      status: input.status,
      priorite: input.priorite,
      dueDate: input.dueDate || undefined,
      assigneA: input.assigneA || undefined,
    }, { onSuccess });
  };

  const handleUpdateTaskStatus = (id: string, status: TaskStatusOption) => {
    updateTask.mutate({ id, status });
  };

  const handleAddRelation = (input: AddRelationInput, onSuccess?: () => void) => {
    createRelation.mutate({
      clientBId: input.clientBId,
      typeRelation: input.roles.join(' / '),
      pctDetention: input.pctDetention,
      note: input.note,
    }, { onSuccess });
  };

  return (
    <>
      <LoadingPopup
        show={updateClient.isPending}
        title="Modification du client"
        message="Nous enregistrons les informations et actualisons le portefeuille."
      />
      <div className="client-panel-overlay open" onClick={onClose} aria-hidden />
      <aside className={`client-panel open${isLoading ? ' client-panel--loading' : ''}`}>
        <header className="client-panel-header">
          <div>
            <div className="client-panel-title">{client?.name || 'Fiche client'}</div>
            <div className="client-panel-subtitle">
              {client?.email || ''}
              {client?.statutClient && (
                <span className={`crm-badge ${statutClientBadgeClass(client.statutClient)}`}>
                  {client.statutClient}
                </span>
              )}
            </div>
          </div>
          <button type="button" className="detail-close" onClick={onClose} aria-label="Fermer">✕</button>
        </header>

        <nav className="cp-tabs">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`cp-tab${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              {tab.id === 'notes' && notes.length > 0 && (
                <span className="cp-tab-count">{notes.length}</span>
              )}
              {tab.id === 'taches' && tasks.length > 0 && (
                <span className="cp-tab-count">{tasks.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="client-panel-body">
          {isLoading || !form ? (
            <PageLoading compact />
          ) : (
            <>
              {(activeTab === 'identite' || activeTab === 'societe') && (
                <form id="client-panel-save-form" onSubmit={handleSave}>
                  {activeTab === 'identite' && (
                <div className="cp-tab-content active">
                  <section className="cp-section">
                    <h3 className="cp-section-title">Informations générales</h3>
                    <div className="cp-form-grid">
                      <label className="cp-field">
                        <span>Type client</span>
                        <Select
                          value={form.clientType}
                          onChange={(e) => setField('clientType', e.target.value)}
                        >
                          <option value="PP">Personne physique</option>
                          <option value="PM">Personne morale</option>
                        </Select>
                      </label>
                      <label className="cp-field">
                        <span>Statut</span>
                        <Select
                          value={form.statutClient || ''}
                          onChange={(e) => setField('statutClient', e.target.value)}
                        >
                          <option value="Prospect">Prospect</option>
                          <option value="Client actif">Client actif</option>
                          <option value="Inactif">Inactif</option>
                          <option value="Archivé">Archivé</option>
                        </Select>
                      </label>
                      <label className="cp-field">
                        <span>Signataire DocuSign</span>
                        <Select
                          value={form.signataire || ''}
                          onChange={(e) => setField('signataire', e.target.value)}
                        >
                          <option value="">—</option>
                          {signataires.map((s) => (
                            <option key={s.email} value={s.name}>{s.name}</option>
                          ))}
                        </Select>
                      </label>
                      <label className="cp-field">
                        <span>Gestionnaire (front)</span>
                        <Select
                          value={form.gestionnaire || ''}
                          onChange={(e) => setField('gestionnaire', e.target.value)}
                        >
                          <option value="">—</option>
                          {gestionnaires.map((g) => (
                            <option key={g.id} value={g.name}>{g.name}</option>
                          ))}
                        </Select>
                      </label>
                      <label className="cp-field">
                        <span>Origine</span>
                        <Select
                          value={form.origine || ''}
                          onChange={(e) => setField('origine', e.target.value)}
                        >
                          <option value="">—</option>
                          <option value="Recommandation">Recommandation</option>
                          <option value="Réseau">Réseau</option>
                          <option value="Évènement">Évènement</option>
                          <option value="Site web">Site web</option>
                          <option value="Autre">Autre</option>
                        </Select>
                      </label>
                      <label className="cp-field">
                        <span>Date d&apos;entrée en relation</span>
                        <input
                          type="date"
                          value={form.dateEntree || ''}
                          onChange={(e) => setField('dateEntree', e.target.value)}
                        />
                      </label>
                    </div>
                  </section>

                  {!isPm && (
                    <>
                    <section className="cp-section">
                      <h3 className="cp-section-title">Identité — Personne physique</h3>
                      <div className="cp-form-grid">
                        <label className="cp-field">
                          <span>Civilité</span>
                          <Select
                            value={form.civilite || ''}
                            onChange={(e) => setField('civilite', e.target.value)}
                          >
                            <option value="">—</option>
                            <option value="M.">M.</option>
                            <option value="Mme">Mme</option>
                          </Select>
                        </label>
                        <label className="cp-field">
                          <span>Nom</span>
                          <input value={form.lastName || ''} onChange={(e) => setField('lastName', e.target.value)} />
                        </label>
                        <label className="cp-field">
                          <span>Prénom</span>
                          <input value={form.firstName || ''} onChange={(e) => setField('firstName', e.target.value)} />
                        </label>
                        <label className="cp-field">
                          <span>Date de naissance</span>
                          <input
                            type="date"
                            value={form.birthDate || ''}
                            onChange={(e) => setField('birthDate', e.target.value)}
                          />
                        </label>
                        <label className="cp-field">
                          <span>Lieu de naissance</span>
                          <input value={form.birthPlace || ''} onChange={(e) => setField('birthPlace', e.target.value)} />
                        </label>
                        <label className="cp-field">
                          <span>Nationalité</span>
                          <input value={form.nationality || ''} onChange={(e) => setField('nationality', e.target.value)} />
                        </label>
                        <label className="cp-field">
                          <span>Email</span>
                          <input type="email" value={form.email || ''} onChange={(e) => setField('email', e.target.value)} />
                        </label>
                        <label className="cp-field">
                          <span>Tél. mobile</span>
                          <input value={form.phoneMobile || ''} onChange={(e) => setField('phoneMobile', e.target.value)} />
                        </label>
                        <label className="cp-field">
                          <span>Tél. maison</span>
                          <input value={form.phoneHome || ''} onChange={(e) => setField('phoneHome', e.target.value)} />
                        </label>
                        <label className="cp-field">
                          <span>Tél. bureau</span>
                          <input value={form.phoneOffice || ''} onChange={(e) => setField('phoneOffice', e.target.value)} />
                        </label>
                        <label className="cp-field cp-field-full">
                          <span>Adresse</span>
                          <input value={form.address || ''} onChange={(e) => setField('address', e.target.value)} />
                        </label>
                        <label className="cp-field">
                          <span>Code postal</span>
                          <input value={form.postalCode || ''} onChange={(e) => setField('postalCode', e.target.value)} />
                        </label>
                        <label className="cp-field">
                          <span>Ville</span>
                          <input value={form.city || ''} onChange={(e) => setField('city', e.target.value)} />
                        </label>
                        <label className="cp-field">
                          <span>Pays</span>
                          <input value={form.country || ''} onChange={(e) => setField('country', e.target.value)} />
                        </label>
                        <label className="cp-field">
                          <span>Situation matrimoniale</span>
                          <Select
                            value={form.maritalStatus || ''}
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
                        </label>
                        <label className="cp-field">
                          <span>Régime matrimonial</span>
                          <Select
                            value={form.matrimonialRegime || ''}
                            onChange={(e) => setField('matrimonialRegime', e.target.value)}
                          >
                            <option value="">—</option>
                            <option value="Communauté réduite aux acquêts">Communauté réduite aux acquêts</option>
                            <option value="Communauté universelle">Communauté universelle</option>
                            <option value="Séparation de biens">Séparation de biens</option>
                            <option value="Participation aux acquêts">Participation aux acquêts</option>
                            <option value="Sans objet">Sans objet</option>
                          </Select>
                        </label>
                        <label className="cp-field">
                          <span>Profession</span>
                          <input value={form.profession || ''} onChange={(e) => setField('profession', e.target.value)} />
                        </label>
                        <label className="cp-field">
                          <span>Statut professionnel</span>
                          <Select
                            value={form.proStatus || ''}
                            onChange={(e) => setField('proStatus', e.target.value)}
                          >
                            <option value="">—</option>
                            <option value="TNS">TNS</option>
                            <option value="Salarié(e)">Salarié(e)</option>
                            <option value="Fonctionnaire">Fonctionnaire</option>
                            <option value="Dirigeant">Dirigeant</option>
                            <option value="Retraité(e)">Retraité(e)</option>
                            <option value="Autre">Autre</option>
                          </Select>
                        </label>
                        <label className="cp-field">
                          <span>Secteur</span>
                          <input value={form.sector || ''} onChange={(e) => setField('sector', e.target.value)} />
                        </label>
                        <label className="cp-field">
                          <span>Société employeur</span>
                          <input value={form.employer || ''} onChange={(e) => setField('employer', e.target.value)} />
                        </label>
                      </div>
                    </section>

                    <section className="cp-section">
                      <h3 className="cp-section-title">Situation financière &amp; Patrimoine</h3>
                      <div className="cp-form-grid">
                        <label className="cp-field">
                          <span>Revenus annuels (K€)</span>
                          <input
                            type="number"
                            value={form.annualIncome ?? ''}
                            onChange={(e) => setField('annualIncome', e.target.value ? Number(e.target.value) : null)}
                          />
                        </label>
                        <label className="cp-field">
                          <span>Charges courantes (K€)</span>
                          <input
                            type="number"
                            value={form.currentCharges ?? ''}
                            onChange={(e) => setField('currentCharges', e.target.value ? Number(e.target.value) : null)}
                          />
                        </label>
                        <label className="cp-field">
                          <span>Immobilier</span>
                          <input
                            value={form.patrimoineImmobilier || ''}
                            onChange={(e) => setField('patrimoineImmobilier', e.target.value)}
                            placeholder="%"
                          />
                        </label>
                        <label className="cp-field">
                          <span>Épargne long terme</span>
                          <input
                            value={form.patrimoineEpargne || ''}
                            onChange={(e) => setField('patrimoineEpargne', e.target.value)}
                            placeholder="%"
                          />
                        </label>
                        <label className="cp-field">
                          <span>Participations</span>
                          <input
                            value={form.patrimoineParticipations || ''}
                            onChange={(e) => setField('patrimoineParticipations', e.target.value)}
                            placeholder="%"
                          />
                        </label>
                        <label className="cp-field">
                          <span>Liquidités</span>
                          <input
                            value={form.patrimoineLiquidites || ''}
                            onChange={(e) => setField('patrimoineLiquidites', e.target.value)}
                            placeholder="%"
                          />
                        </label>
                        <label className="cp-field cp-field-full">
                          <span>Autres (œuvres d&apos;art…)</span>
                          <input
                            value={form.patrimoineAutres || ''}
                            onChange={(e) => setField('patrimoineAutres', e.target.value)}
                            placeholder="%"
                          />
                        </label>
                      </div>
                    </section>
                    </>
                  )}

                  {isPm && form && (
                    <ClientPmIdentitySections
                      form={form}
                      setField={setField}
                      variant="identite"
                    />
                  )}

                </div>
              )}

              {activeTab === 'societe' && isPm && form && (
                <div className="cp-tab-content active">
                  <ClientPmIdentitySections
                    form={form}
                    setField={setField}
                    setBeField={setBeField}
                    variant="societe"
                  />
                </div>
              )}

                </form>
              )}

              {activeTab === 'documents' && (
                <div className="cp-tab-content active">
                  <ClientDocumentsTab
                    clientId={clientId ?? ''}
                    documents={kycDocs}
                    client={client}
                  />
                </div>
              )}

              {activeTab === 'relations' && (
                <div className="cp-tab-content active">
                  <ClientRelationsTab
                    clientId={clientId}
                    relations={relations}
                    allClients={allClients}
                    isAdding={createRelation.isPending}
                    onAddRelation={handleAddRelation}
                    onDeleteRelation={handleDeleteRelation}
                  />
                </div>
              )}

              {activeTab === 'notes' && (
                <div className="cp-tab-content active">
                  <ClientNotesTab
                    notes={notes}
                    gestionnaires={gestionnaires}
                    isAdding={createNote.isPending}
                    onAddNote={handleAddNote}
                    onDeleteNote={handleDeleteNote}
                  />
                </div>
              )}

              {activeTab === 'taches' && (
                <div className="cp-tab-content active">
                  <ClientTasksTab
                    tasks={tasks}
                    gestionnaires={gestionnaires}
                    isAdding={createTask.isPending}
                    isUpdating={updateTask.isPending}
                    onAddTask={handleAddTask}
                    onUpdateTaskStatus={handleUpdateTaskStatus}
                    onDeleteTask={handleDeleteTask}
                  />
                </div>
              )}

              {activeTab === 'timeline' && (
                <div className="cp-tab-content active">
                  {timeline.length === 0 ? (
                    <p className="text-muted">Aucun événement.</p>
                  ) : (
                    <ul className="timeline-list">
                      {timeline.map((event, i) => (
                        <li key={`${event.date}-${event.type}-${i}`} className={`timeline-item timeline-item--${event.type}`}>
                          <time>{formatDateFr(event.date)}</time>
                          <strong>{event.label}</strong>
                          {event.detail && <p>{event.detail}</p>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

            </>
          )}
        </div>

        {!isLoading && form && (
          <footer className="client-panel-footer">
            {(activeTab === 'identite' || activeTab === 'societe') && (
              <button
                type="submit"
                form="client-panel-save-form"
                className="btn-primary"
                disabled={updateClient.isPending}
              >
                {updateClient.isPending ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            )}
            <button type="button" className="btn-secondary" onClick={onClose}>Fermer</button>
          </footer>
        )}
      </aside>
    </>
  );
}
