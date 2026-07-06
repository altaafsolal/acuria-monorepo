import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiX } from 'react-icons/fi';
import { useGestionnaires } from '../../hooks';
import type { ClientType, CreateClientInput } from '../../types';
import Select from "../ui/Select";
import {
  CLIENT_CIVILITE_OPTIONS,
  CLIENT_INITIAL_STATUT_OPTIONS,
  CLIENT_LEGAL_FORM_OPTIONS,
  CLIENT_ORIGINE_OPTIONS,
} from './clientFormOptions';

export interface AddClientModalProps {
  open: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (input: CreateClientInput) => void;
}

function todayIsoDate(): string {
  return new Date().toISOString().split('T')[0];
}

function buildClientName(
  clientType: ClientType,
  fields: {
    civilite: string;
    firstName: string;
    lastName: string;
    tradeName: string;
  },
): string {
  if (clientType === 'PM') {
    return fields.tradeName.trim().toUpperCase();
  }
  return [fields.civilite, fields.firstName.trim(), fields.lastName.trim().toUpperCase()]
    .filter(Boolean)
    .join(' ')
    .trim();
}

const EMPTY_PP = {
  civilite: '',
  lastName: '',
  firstName: '',
  email: '',
  phone: '',
};

const EMPTY_PM = {
  tradeName: '',
  siren: '',
  legalForm: '',
  email: '',
  phone: '',
  legalRepName: '',
  legalRepRole: '',
};

export default function AddClientModal({
  open,
  isSaving,
  onClose,
  onSubmit,
}: AddClientModalProps) {
  const { data: gestionnaires = [] } = useGestionnaires();

  const [clientType, setClientType] = useState<ClientType>('PP');
  const [statutClient, setStatutClient] = useState<string>('Prospect');
  const [pp, setPp] = useState(EMPTY_PP);
  const [pm, setPm] = useState(EMPTY_PM);
  const [signataire, setSignataire] = useState('');
  const [gestionnaire, setGestionnaire] = useState('');
  const [origine, setOrigine] = useState('');
  const [notesInternes, setNotesInternes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const activeGestionnaires = useMemo(
    () => gestionnaires.filter((g) => g.status === 'Actif'),
    [gestionnaires],
  );

  const docusignSigners = useMemo(
    () => activeGestionnaires.filter((g) => g.peutSignerDocusign),
    [activeGestionnaires],
  );

  const isPm = clientType === 'PM';

  useEffect(() => {
    if (!open) return;
    setClientType('PP');
    setStatutClient('Prospect');
    setPp(EMPTY_PP);
    setPm(EMPTY_PM);
    setSignataire('');
    setGestionnaire('');
    setOrigine('');
    setNotesInternes('');
    setError(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = () => {
    const missing: string[] = [];

    if (isPm) {
      if (!pm.tradeName.trim()) missing.push('Raison sociale');
      if (!pm.siren.trim()) missing.push('SIREN');
      if (!pm.email.trim()) missing.push('Email');
      if (!pm.legalRepName.trim()) missing.push('Représentant légal');
    } else {
      if (!pp.civilite) missing.push('Civilité');
      if (!pp.lastName.trim()) missing.push('Nom');
      if (!pp.firstName.trim()) missing.push('Prénom');
      if (!pp.email.trim()) missing.push('Email');
    }

    if (missing.length > 0) {
      setError(`Champs obligatoires : ${missing.join(', ')}`);
      return;
    }

    const name = buildClientName(clientType, {
      civilite: pp.civilite,
      firstName: pp.firstName,
      lastName: pp.lastName,
      tradeName: pm.tradeName,
    });

    setError(null);

    const base: CreateClientInput = {
      name,
      clientType,
      statutClient,
      status: statutClient === 'Client actif' ? 'active' : 'prospect',
      kycStatus: 'pending',
      signataire: signataire || undefined,
      gestionnaire: gestionnaire || undefined,
      origine: origine || undefined,
      notesInternes: notesInternes.trim() || undefined,
      dateEntree: todayIsoDate(),
      fccStatut: 'Non envoyé',
      derStatut: 'Non envoyé',
      ldmStatut: 'Non envoyé',
    };

    if (isPm) {
      onSubmit({
        ...base,
        email: pm.email.trim(),
        phone: pm.phone.trim() || undefined,
        tradeName: pm.tradeName.trim().toUpperCase(),
        siren: pm.siren.trim(),
        legalForm: pm.legalForm || undefined,
        legalRepName: pm.legalRepName.trim(),
        legalRepRole: pm.legalRepRole.trim() || undefined,
      });
      return;
    }

    onSubmit({
      ...base,
      email: pp.email.trim(),
      phoneMobile: pp.phone.trim() || undefined,
      civilite: pp.civilite,
      firstName: pp.firstName.trim(),
      lastName: pp.lastName.trim().toUpperCase(),
    });
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card modal-card--form modal-card--shell max-w-[860px]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-client-modal-title"
      >
        <header className="modal-card__header">
          <h2 id="add-client-modal-title" className="modal-card__title">
            Nouveau client
          </h2>
          <button
            type="button"
            className="modal-card__close"
            onClick={onClose}
            aria-label="Fermer"
          >
            <FiX aria-hidden="true" />
          </button>
        </header>

        <div className="modal-card__body">
          <div className="grid grid-cols-3 gap-[var(--form-fields-gap)] max-[720px]:grid-cols-1">
            <label className="cp-field">
              <span>
                Type <span className="field-required">*</span>
              </span>
              <Select
                value={clientType}
                onChange={(e) => setClientType(e.target.value as ClientType)}
              >
                <option value="PP">Personne physique</option>
                <option value="PM">Personne morale</option>
              </Select>
            </label>

            <label className="cp-field">
              <span>Statut initial</span>
              <Select
                value={statutClient}
                onChange={(e) => setStatutClient(e.target.value)}
              >
                {CLIENT_INITIAL_STATUT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </label>

            {!isPm ? (
              <>
                <label className="cp-field">
                  <span>
                    Civilité <span className="field-required">*</span>
                  </span>
                  <Select
                    value={pp.civilite}
                    onChange={(e) =>
                      setPp((prev) => ({ ...prev, civilite: e.target.value }))
                    }
                  >
                    <option value="">—</option>
                    {CLIENT_CIVILITE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="cp-field">
                  <span>
                    Nom <span className="field-required">*</span>
                  </span>
                  <input
                    type="text"
                    className="uppercase"
                    value={pp.lastName}
                    onChange={(e) =>
                      setPp((prev) => ({ ...prev, lastName: e.target.value }))
                    }
                    placeholder="NOM DE FAMILLE"
                    autoFocus
                  />
                </label>
                <label className="cp-field">
                  <span>
                    Prénom <span className="field-required">*</span>
                  </span>
                  <input
                    type="text"
                    value={pp.firstName}
                    onChange={(e) =>
                      setPp((prev) => ({ ...prev, firstName: e.target.value }))
                    }
                  />
                </label>
                <label className="cp-field">
                  <span>
                    Email <span className="field-required">*</span>
                  </span>
                  <input
                    type="email"
                    value={pp.email}
                    onChange={(e) =>
                      setPp((prev) => ({ ...prev, email: e.target.value }))
                    }
                  />
                </label>
                <label className="cp-field">
                  <span>Téléphone</span>
                  <input
                    type="tel"
                    value={pp.phone}
                    onChange={(e) =>
                      setPp((prev) => ({ ...prev, phone: e.target.value }))
                    }
                  />
                </label>
              </>
            ) : (
              <>
                <label className="cp-field cp-field-full">
                  <span>
                    Raison sociale <span className="field-required">*</span>
                  </span>
                  <input
                    type="text"
                    className="uppercase"
                    value={pm.tradeName}
                    onChange={(e) =>
                      setPm((prev) => ({ ...prev, tradeName: e.target.value }))
                    }
                    placeholder="DÉNOMINATION SOCIALE"
                    autoFocus
                  />
                </label>
                <label className="cp-field">
                  <span>
                    SIREN <span className="field-required">*</span>
                  </span>
                  <input
                    type="text"
                    value={pm.siren}
                    onChange={(e) =>
                      setPm((prev) => ({ ...prev, siren: e.target.value }))
                    }
                    placeholder="9 chiffres"
                    maxLength={9}
                  />
                </label>
                <label className="cp-field">
                  <span>Forme juridique</span>
                  <Select
                    value={pm.legalForm}
                    onChange={(e) =>
                      setPm((prev) => ({ ...prev, legalForm: e.target.value }))
                    }
                  >
                    <option value="">—</option>
                    {CLIENT_LEGAL_FORM_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="cp-field">
                  <span>
                    Email <span className="field-required">*</span>
                  </span>
                  <input
                    type="email"
                    value={pm.email}
                    onChange={(e) =>
                      setPm((prev) => ({ ...prev, email: e.target.value }))
                    }
                  />
                </label>
                <label className="cp-field">
                  <span>Téléphone</span>
                  <input
                    type="tel"
                    value={pm.phone}
                    onChange={(e) =>
                      setPm((prev) => ({ ...prev, phone: e.target.value }))
                    }
                  />
                </label>
                <label className="cp-field">
                  <span>
                    Représentant légal <span className="field-required">*</span>
                  </span>
                  <input
                    type="text"
                    value={pm.legalRepName}
                    onChange={(e) =>
                      setPm((prev) => ({
                        ...prev,
                        legalRepName: e.target.value,
                      }))
                    }
                    placeholder="Nom Prénom"
                  />
                </label>
                <label className="cp-field">
                  <span>Fonction</span>
                  <input
                    type="text"
                    value={pm.legalRepRole}
                    onChange={(e) =>
                      setPm((prev) => ({
                        ...prev,
                        legalRepRole: e.target.value,
                      }))
                    }
                    placeholder="Président, Gérant…"
                  />
                </label>
              </>
            )}

            <label className="cp-field">
              <span>Signataire DocuSign</span>
              <Select
                value={signataire}
                onChange={(e) => setSignataire(e.target.value)}
              >
                <option value="">—</option>
                {docusignSigners.map((g) => (
                  <option key={g.id} value={g.name}>
                    {g.name}
                  </option>
                ))}
              </Select>
            </label>

            <label className="cp-field">
              <span>Gestionnaire (front)</span>
              <Select
                value={gestionnaire}
                onChange={(e) => setGestionnaire(e.target.value)}
              >
                <option value="">—</option>
                {activeGestionnaires.map((g) => (
                  <option key={g.id} value={g.name}>
                    {g.name}
                  </option>
                ))}
              </Select>
            </label>

            <label className="cp-field">
              <span>Origine</span>
              <Select
                value={origine}
                onChange={(e) => setOrigine(e.target.value)}
              >
                <option value="">—</option>
                {CLIENT_ORIGINE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </label>

            <label className="cp-field cp-field-full">
              <span>Note initiale</span>
              <textarea
                className="w-full min-h-[60px] resize-y"
                value={notesInternes}
                onChange={(e) => setNotesInternes(e.target.value)}
                placeholder="Contexte, premier contact…"
                rows={3}
              />
            </label>
          </div>

          {error && (
            <p
              className="m-0 py-[0.55rem] px-3 rounded-lg bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] text-[0.82rem]"
              role="alert"
            >
              {error}
            </p>
          )}
        </div>

        <footer className="modal-card__footer">
          <div className="modal-card__actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={isSaving}
            >
              Annuler
            </button>
            <button
              type="button"
              className="btn-bronze"
              onClick={handleSubmit}
              disabled={isSaving}
            >
              {isSaving ? "Création…" : "Créer"}
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
