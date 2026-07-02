import { useMemo, useState } from "react";
import {
  FiAlertCircle,
  FiBarChart2,
  FiBookOpen,
  FiCalendar,
  FiEdit3,
  FiFileText,
  FiMail,
  FiMessageSquare,
  FiMoreHorizontal,
  FiPaperclip,
  FiPhone,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiUser,
} from "react-icons/fi";
import type { ClientNote, Gestionnaire, NoteAttachment } from "../../types";
import {
  attachmentDisplayName,
  downloadAttachment,
} from "../../utils/attachments";
import { filterBySearch } from "../../utils";
import { formatDateTimeFr } from "../../utils/kyc";
import "./ClientNotesTab.css";
import Select from "../ui/Select";
import AddNoteModal, { type AddNoteInput } from "./AddNoteModal";

export const NOTE_TYPE_OPTIONS = [
  "RDV",
  "Appel",
  "Email",
  "Document",
  "Reporting",
  "Formation",
  "Réclamation",
  "Note interne",
  "Autre",
] as const;

export type NoteTypeOption = (typeof NOTE_TYPE_OPTIONS)[number];

type NoteTypeConfig = {
  icon: typeof FiCalendar;
  variant: string;
};

const NOTE_TYPE_CONFIG: Record<string, NoteTypeConfig> = {
  RDV: { icon: FiCalendar, variant: "rdv" },
  Appel: { icon: FiPhone, variant: "appel" },
  Email: { icon: FiMail, variant: "email" },
  Document: { icon: FiFileText, variant: "document" },
  Reporting: { icon: FiBarChart2, variant: "reporting" },
  Formation: { icon: FiBookOpen, variant: "formation" },
  Réclamation: { icon: FiAlertCircle, variant: "reclamation" },
  "Note interne": { icon: FiEdit3, variant: "interne" },
  Autre: { icon: FiMoreHorizontal, variant: "autre" },
};

const DEFAULT_NOTE_CONFIG: NoteTypeConfig = {
  icon: FiMessageSquare,
  variant: "autre",
};

function noteConfig(type: string): NoteTypeConfig {
  return NOTE_TYPE_CONFIG[type] ?? DEFAULT_NOTE_CONFIG;
}

function noteTimestamp(note: ClientNote): number {
  if (!note.date) return 0;
  const parsed = Date.parse(note.date);
  return Number.isNaN(parsed) ? 0 : parsed;
}

interface ClientNotesTabProps {
  notes: ClientNote[];
  gestionnaires: Gestionnaire[];
  isAdding: boolean;
  onAddNote: (input: AddNoteInput, onSuccess?: () => void) => void;
  onDeleteNote: (id: string) => void;
}

export default function ClientNotesTab({
  notes,
  gestionnaires,
  isAdding,
  onAddNote,
  onDeleteNote,
}: ClientNotesTabProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const filteredNotes = useMemo(() => {
    let list = [...notes].sort((a, b) => noteTimestamp(b) - noteTimestamp(a));

    if (typeFilter) {
      list = list.filter((note) => note.noteType === typeFilter);
    }

    return filterBySearch(list, search, (note) => [
      note.contenu ?? "",
      note.auteur ?? "",
      note.noteType,
      ...(note.piecesJointes ?? []).map((file) => attachmentDisplayName(file)),
    ]);
  }, [notes, search, typeFilter]);

  const clearFilters = () => {
    setSearch("");
    setTypeFilter("");
  };

  const handleDownload = async (fileKey: string, file: NoteAttachment) => {
    setDownloadingKey(fileKey);
    setDownloadError(null);
    try {
      await downloadAttachment(file);
    } catch {
      setDownloadError(
        "Le téléchargement a échoué. Réessayez dans un instant.",
      );
    } finally {
      setDownloadingKey(null);
    }
  };

  const handleSubmit = (input: AddNoteInput) => {
    onAddNote(input, () => setModalOpen(false));
  };

  return (
    <div className="cp-notes">
      <div className="cp-notes-toolbar">
        <div className="cp-notes-list-header">
          {notes.length > 0 && (
            <div className="cp-notes-filters">
              <label className="cp-notes-search">
                <FiSearch aria-hidden="true" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher dans les notes…"
                  aria-label="Rechercher dans les notes"
                />
              </label>
              <div className="cp-notes-type-filter">
                <Select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  aria-label="Filtrer par type de note"
                >
                  <option value="">Tous les types</option>
                  {NOTE_TYPE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          )}
        </div>
        <button
          type="button"
          className="btn-bronze btn-sm"
          onClick={() => setModalOpen(true)}
        >
          <FiPlus aria-hidden="true" />
          Nouvelle note
        </button>
      </div>

      {downloadError && (
        <p className="cp-notes-download-error" role="alert">
          {downloadError}
        </p>
      )}

      {notes.length === 0 ? (
        <div className="cp-notes-empty">
          <FiMessageSquare aria-hidden="true" />
          <p>Aucune note pour ce client.</p>
          <span>Ajoutez la première note pour démarrer le suivi.</span>
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="cp-notes-empty">
          <FiSearch aria-hidden="true" />
          <p>Aucune note ne correspond à votre recherche.</p>
          <span>
            Modifiez les filtres ou réinitialisez pour afficher toutes les
            notes.
          </span>
          <button
            type="button"
            className="btn-secondary btn-secondary--sm"
            onClick={clearFilters}
          >
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <ul className="cp-notes-list">
          {filteredNotes.map((note) => {
            const config = noteConfig(note.noteType);
            const Icon = config.icon;
            const attachments = note.piecesJointes ?? [];
            return (
              <li
                key={note.id}
                className={`cp-note-card cp-note-card--${config.variant}`}
              >
                <div className="cp-note-card__accent" aria-hidden="true" />
                <div className="cp-note-card__body">
                  <div className="cp-note-card__header">
                    <span
                      className={`cp-note-badge cp-note-badge--${config.variant}`}
                    >
                      <Icon aria-hidden="true" />
                      {note.noteType}
                    </span>
                    <div className="cp-note-card__meta">
                      {note.date && (
                        <time
                          className="cp-note-card__date"
                          dateTime={note.date}
                        >
                          {formatDateTimeFr(note.date)}
                        </time>
                      )}
                      {note.auteur && (
                        <span className="cp-note-card__author">
                          <FiUser aria-hidden="true" />
                          {note.auteur}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="cp-note-card__delete"
                      onClick={() => onDeleteNote(note.id)}
                      aria-label="Supprimer la note"
                    >
                      <FiTrash2 aria-hidden="true" />
                    </button>
                  </div>
                  {note.contenu && (
                    <p className="cp-note-card__content">{note.contenu}</p>
                  )}
                  {attachments.length > 0 && (
                    <div className="cp-note-files">
                      {attachments.map((file, fileIndex) => {
                        const displayName = attachmentDisplayName(file);
                        const fileKey = `${note.id}-${fileIndex}-${file.name}`;
                        return (
                          <button
                            key={fileKey}
                            type="button"
                            className="cp-note-file-chip"
                            title={displayName}
                            disabled={downloadingKey === fileKey}
                            onClick={() => handleDownload(fileKey, file)}
                          >
                            <FiPaperclip aria-hidden="true" />
                            {downloadingKey === fileKey
                              ? "Téléchargement…"
                              : displayName}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <AddNoteModal
        open={modalOpen}
        gestionnaires={gestionnaires}
        isSaving={isAdding}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
