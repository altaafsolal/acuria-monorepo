import type { NoteAttachment } from '../types';

export function attachmentDisplayName(file: NoteAttachment): string {
  return file.name.trim() || 'fichier';
}

export function openAttachment(file: NoteAttachment): void {
  window.open(file.url, '_blank', 'noopener,noreferrer');
}
