import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiX } from 'react-icons/fi';
import type { Gestionnaire } from '../../types';
import Select from '../ui/Select';
import '../ui/Modal.css';
import './AddTaskModal.css';
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
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatusOption>('À faire');
  const [priorite, setPriorite] = useState<TaskPrioriteOption>('Normale');
  const [dueDate, setDueDate] = useState('');
  const [assigneA, setAssigneA] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setDescription('');
    setStatus('À faire');
    setPriorite('Normale');
    setDueDate('');
    setAssigneA('');
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
    if (!title.trim()) {
      setError('Le titre est obligatoire.');
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
        className="modal-card modal-card--wide modal-card--form add-task-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-task-modal-title"
      >
        <div className="add-task-modal__header">
          <h2 id="add-task-modal-title" className="modal-card__title">Nouvelle tâche</h2>
          <button
            type="button"
            className="add-task-modal__close"
            onClick={onClose}
            aria-label="Fermer"
          >
            <FiX aria-hidden="true" />
          </button>
        </div>

        <div className="add-task-modal__body">
          <div className="add-task-modal__grid">
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
              <span>Assigné à</span>
              <Select
                value={assigneA}
                onChange={(e) => setAssigneA(e.target.value)}
              >
                <option value="">Non assigné</option>
                {gestionnaires.map((g) => (
                  <option key={g.id} value={g.name}>{g.name}</option>
                ))}
              </Select>
            </label>

            <label className="cp-field cp-field-full">
              <span>Description</span>
              <textarea
                className="add-task-modal__textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Détails, contexte ou consignes (optionnel)…"
                rows={4}
              />
            </label>
          </div>

          {error && (
            <p className="add-task-modal__error" role="alert">{error}</p>
          )}

          <div className="modal-card__actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSaving}>
              Annuler
            </button>
            <button type="button" className="btn-bronze" onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
