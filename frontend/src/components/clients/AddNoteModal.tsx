import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiPaperclip, FiX } from 'react-icons/fi';
import { useApp } from '../../context/AppContext';
import type { Gestionnaire } from '../../types';
import { NOTE_TYPE_OPTIONS, type NoteTypeOption } from './ClientNotesTab';
import Select from '../ui/Select';
import '../ui/Modal.css';
import './AddNoteModal.css';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg';

export interface AddNoteInput {
  date: string;
  noteType: NoteTypeOption;
  auteur: string;
  contenu: string;
  files: File[];
}

interface AddNoteModalProps {
  open: boolean;
  gestionnaires: Gestionnaire[];
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (input: AddNoteInput) => void;
}

function defaultDateTimeLocal(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export default function AddNoteModal({
  open,
  gestionnaires,
  isSaving,
  onClose,
  onSubmit,
}: AddNoteModalProps) {
  const { user } = useApp();
  const [date, setDate] = useState(defaultDateTimeLocal);
  const [noteType, setNoteType] = useState<NoteTypeOption>('Note interne');
  const [auteur, setAuteur] = useState('');
  const [contenu, setContenu] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const defaultAuteur = useMemo(() => {
    if (!user?.name) return '';
    const match = gestionnaires.find((g) => g.name === user.name);
    return match?.name ?? '';
  }, [gestionnaires, user?.name]);

  useEffect(() => {
    if (!open) return;
    setDate(defaultDateTimeLocal());
    setNoteType('Note interne');
    setAuteur(defaultAuteur);
    setContenu('');
    setFiles([]);
    setError(null);
  }, [open, defaultAuteur]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    const oversized = selected.find((file) => file.size > MAX_FILE_SIZE);
    if (oversized) {
      setError(`Fichier trop volumineux : ${oversized.name} (max 5 Mo)`);
      event.target.value = '';
      return;
    }
    setError(null);
    setFiles((prev) => [...prev, ...selected]);
    event.target.value = '';
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    const missing: string[] = [];
    if (!date.trim()) missing.push('Date');
    if (!noteType.trim()) missing.push('Type');
    if (!auteur.trim()) missing.push('Auteur');
    if (!contenu.trim()) missing.push('Contenu');
    if (missing.length > 0) {
      setError(`Champs obligatoires : ${missing.join(', ')}`);
      return;
    }
    setError(null);
    onSubmit({
      date: new Date(date).toISOString(),
      noteType,
      auteur: auteur.trim(),
      contenu: contenu.trim(),
      files,
    });
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card modal-card--wide modal-card--form modal-card--shell add-note-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-note-modal-title"
      >
        <header className="modal-card__header">
          <h2 id="add-note-modal-title" className="modal-card__title">Nouvelle note</h2>
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
          <div className="add-note-modal__grid">
            <label className="cp-field">
              <span>Date <span className="field-required">*</span></span>
              <input
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </label>

            <label className="cp-field">
              <span>Type <span className="field-required">*</span></span>
              <Select
                value={noteType}
                onChange={(e) => setNoteType(e.target.value as NoteTypeOption)}
                required
              >
                {NOTE_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </Select>
            </label>

            <label className="cp-field cp-field-full">
              <span>Auteur <span className="field-required">*</span></span>
              <Select
                value={auteur}
                onChange={(e) => setAuteur(e.target.value)}
                required
              >
                <option value="">—</option>
                {gestionnaires.map((g) => (
                  <option key={g.id} value={g.name}>{g.name}</option>
                ))}
              </Select>
            </label>

            <label className="cp-field cp-field-full">
              <span>Contenu <span className="field-required">*</span></span>
              <textarea
                className="add-note-modal__textarea"
                value={contenu}
                onChange={(e) => setContenu(e.target.value)}
                placeholder="Compte-rendu, points évoqués, décisions, suites à donner…"
                rows={6}
                required
              />
            </label>

            <div className="cp-field cp-field-full">
              <span>Pièces jointes</span>
              <input
                type="file"
                multiple
                accept={ACCEPTED_EXTENSIONS}
                onChange={handleFileChange}
                className="add-note-modal__file-input"
              />
              <p className="add-note-modal__file-hint">
                PDF, Word, Excel, images. Max 5 Mo par fichier.
              </p>
              {files.length > 0 && (
                <ul className="add-note-modal__file-preview">
                  {files.map((file, index) => (
                    <li key={`${file.name}-${index}`} className="add-note-modal__file-chip">
                      <FiPaperclip aria-hidden="true" />
                      <span title={file.name}>{file.name}</span>
                      <small>{formatFileSize(file.size)}</small>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        aria-label={`Retirer ${file.name}`}
                      >
                        <FiX aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {error && (
            <p className="add-note-modal__error" role="alert">{error}</p>
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
