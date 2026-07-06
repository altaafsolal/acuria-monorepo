import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiX } from 'react-icons/fi';
import { useApp } from '../../context/AppContext';
import type { Gestionnaire } from '../../types';
import Select from '../ui/Select';
import {
  TASK_PRIORITE_OPTIONS,
  TASK_STATUS_OPTIONS,
  type TaskPrioriteOption,
  type TaskStatusOption,
} from './ClientTasksTab';

export interface AddTaskInput {
  title: string;
  description: string;
  status: TaskStatusOption;
  priorite: TaskPrioriteOption;
  dueDate: string;
  assigneA: string;
}

interface AddTaskModalProps {
  open: boolean;
  gestionnaires: Gestionnaire[];
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (input: AddTaskInput) => void;
}

export default function AddTaskModal({
  open,
  gestionnaires,
  isSaving,
  onClose,
  onSubmit,
}: AddTaskModalProps) {
  const { user } = useApp();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatusOption>('À faire');
  const [priorite, setPriorite] = useState<TaskPrioriteOption>('Normale');
  const [dueDate, setDueDate] = useState('');
  const [assigneA, setAssigneA] = useState('');
  const [error, setError] = useState<string | null>(null);

  const defaultAssigneA = useMemo(() => {
    if (!user?.name) return '';
    const match = gestionnaires.find((g) => g.name === user.name);
    return match?.name ?? '';
  }, [gestionnaires, user?.name]);

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setDescription('');
    setStatus('À faire');
    setPriorite('Normale');
    setDueDate('');
    setAssigneA(defaultAssigneA);
    setError(null);
  }, [open, defaultAssigneA]);

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
    if (!title.trim()) missing.push('Titre');
    if (!assigneA.trim()) missing.push('Assigné à');
    if (missing.length > 0) {
      setError(`Champs obligatoires : ${missing.join(', ')}`);
      return;
    }
    setError(null);
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      status,
      priorite,
      dueDate,
      assigneA: assigneA.trim(),
    });
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card modal-card--form modal-card--shell max-w-[560px]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-task-modal-title"
      >
        <header className="modal-card__header">
          <h2 id="add-task-modal-title" className="modal-card__title">Nouvelle tâche</h2>
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
          <div className="grid grid-cols-2 gap-[var(--form-fields-gap)] max-[720px]:grid-cols-1">
            <label className="cp-field cp-field-full">
              <span>Titre <span className="field-required">*</span></span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex. Relancer pour signature DER"
                autoFocus
                required
              />
            </label>

            <label className="cp-field">
              <span>Date d&apos;échéance</span>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </label>

            <label className="cp-field">
              <span>Priorité</span>
              <Select
                value={priorite}
                onChange={(e) => setPriorite(e.target.value as TaskPrioriteOption)}
              >
                {TASK_PRIORITE_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </Select>
            </label>

            <label className="cp-field">
              <span>Statut</span>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatusOption)}
              >
                {TASK_STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </Select>
            </label>

            <label className="cp-field">
              <span>Assigné à <span className="field-required">*</span></span>
              <Select
                value={assigneA}
                onChange={(e) => setAssigneA(e.target.value)}
                required
              >
                <option value="">—</option>
                {gestionnaires.map((g) => (
                  <option key={g.id} value={g.name}>{g.name}</option>
                ))}
              </Select>
            </label>

            <label className="cp-field cp-field-full">
              <span>Description</span>
              <textarea
                className="w-full min-h-[96px] py-3 px-[0.85rem] border-[1.5px] border-[var(--color-border)] rounded-[10px] font-[inherit] text-[0.9rem] leading-[1.55] resize-y outline-none focus:border-[var(--color-navy)] focus:shadow-[0_0_0_3px_var(--ring-navy)]"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Détails, contexte ou consignes (optionnel)…"
                rows={4}
              />
            </label>
          </div>

          {error && (
            <p className="m-0 py-[0.55rem] px-[0.7rem] rounded-lg bg-[#fef2f2] text-[#b91c1c] text-[0.84rem]" role="alert">{error}</p>
          )}
        </div>

        <footer className="modal-card__footer">
          <div className="modal-card__actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSaving}>
              Annuler
            </button>
            <button type="button" className="btn-bronze" onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
