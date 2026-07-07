import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiX } from 'react-icons/fi';
import type { Client } from '../../types';
import Select from '../ui/Select';

export const RELATION_ROLE_OPTIONS = [
  { value: 'Associé', label: 'Associé' },
  { value: 'Dirigeant', label: 'Dirigeant' },
  { value: 'Bénéficiaire effectif', label: 'Bénéficiaire effectif' },
  { value: 'Conjoint', label: 'Conjoint / Partenaire' },
  { value: 'Parent/Enfant', label: 'Parent / Enfant' },
  { value: 'Autre', label: 'Autre' },
] as const;

export type RelationRoleValue = (typeof RELATION_ROLE_OPTIONS)[number]['value'];

export interface AddRelationInput {
  clientBId: string;
  roles: RelationRoleValue[];
  pctDetention?: number;
  note?: string;
}

interface AddRelationModalProps {
  open: boolean;
  allClients: Client[];
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (input: AddRelationInput) => void;
}

export default function AddRelationModal({
  open,
  allClients,
  isSaving,
  onClose,
  onSubmit,
}: AddRelationModalProps) {
  const [relationClientId, setRelationClientId] = useState('');
  const [relationRoles, setRelationRoles] = useState<RelationRoleValue[]>([]);
  const [relationPct, setRelationPct] = useState('');
  const [relationNote, setRelationNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const selectedClient = allClients.find((client) => client.id === relationClientId);

  useEffect(() => {
    if (!open) return;
    setRelationClientId('');
    setRelationRoles([]);
    setRelationPct('');
    setRelationNote('');
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

  const toggleRole = (role: RelationRoleValue) => {
    setRelationRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
    setError(null);
  };

  const handleSubmit = () => {
    if (!relationClientId) {
      setError('Sélectionnez un client lié.');
      return;
    }
    if (relationRoles.length === 0) {
      setError('Cochez au moins un rôle dans la relation.');
      return;
    }
    const pct = relationPct.trim() ? Number(relationPct) : undefined;
    setError(null);
    onSubmit({
      clientBId: relationClientId,
      roles: relationRoles,
      pctDetention: pct != null && Number.isFinite(pct) ? pct : undefined,
      note: relationNote.trim() || undefined,
    });
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card modal-card--form modal-card--shell max-w-[520px]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-relation-modal-title"
      >
        <header className="modal-card__header">
          <h2 id="add-relation-modal-title" className="modal-card__title">
            Nouvelle relation
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
          <p className="m-0 text-[0.84rem] text-[var(--color-muted)] leading-[1.45]">
            Liez ce client à un autre client du cabinet (conjoint, associé,
            bénéficiaire effectif…).
          </p>

          <div className="flex flex-col gap-[var(--form-fields-gap)]">
            <label className="cp-field cp-field-full">
              <span>
                Client lié <span className="field-required">*</span>
              </span>
              <Select
                value={relationClientId}
                searchPlaceholder="Rechercher par nom, e-mail…"
                onChange={(e) => {
                  setRelationClientId(e.target.value);
                  setError(null);
                }}
              >
                <option value="">Choisir un client…</option>
                {allClients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name} ({client.clientType})
                    {client.email ? ` — ${client.email}` : ""}
                  </option>
                ))}
              </Select>
              {selectedClient && (
                <p className="m-0 mt-[0.45rem] text-[0.82rem] text-[var(--color-muted)]">
                  Sélectionné : <strong>{selectedClient.name}</strong>
                </p>
              )}
            </label>

            <fieldset className="cp-role-fieldset">
              <legend className="cp-role-fieldset__legend">
                Rôle(s) dans la relation
                <span className="cp-role-fieldset__hint">
                  (plusieurs possibles)
                </span>
              </legend>
              <div className="cp-role-grid">
                {RELATION_ROLE_OPTIONS.map((role) => {
                  const checked = relationRoles.includes(role.value);
                  return (
                    <label
                      key={role.value}
                      className={`cp-role-checkbox${checked ? " cp-role-checkbox--checked" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleRole(role.value)}
                      />
                      <span>{role.label}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="grid grid-cols-2 gap-[var(--form-fields-gap)] max-[720px]:grid-cols-1">
              <label className="cp-field">
                <span>% de détention</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={relationPct}
                  onChange={(e) => setRelationPct(e.target.value)}
                  placeholder="Ex. 35"
                />
              </label>

              <label className="cp-field">
                <span>Note</span>
                <input
                  type="text"
                  value={relationNote}
                  onChange={(e) => setRelationNote(e.target.value)}
                  placeholder="Précision libre…"
                />
              </label>
            </div>
          </div>

          {error && (
            <p
              className="m-0 py-[0.55rem] px-[0.7rem] rounded-lg bg-[#fef2f2] text-[#b91c1c] text-[0.84rem]"
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
              {isSaving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
