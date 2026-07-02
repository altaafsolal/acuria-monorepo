import api from '../api';
import { getAccessToken } from '../lib/http';
import type { NoteAttachment } from '../types';

function stripBaserowHash(value: string): string {
  return value.replace(/^[a-f0-9-]{8,}[_-]/i, '').trim();
}

export function attachmentDisplayName(file: NoteAttachment): string {
  if (file.visibleName?.trim()) {
    return file.visibleName.trim();
  }

  const fromName = stripBaserowHash(file.name.trim());
  if (fromName) return fromName;

  try {
    const segment = decodeURIComponent(new URL(file.url).pathname.split('/').pop() ?? '');
    const fromUrl = stripBaserowHash(segment);
    if (fromUrl) return fromUrl;
  } catch {
    // ignore invalid URLs
  }

  return file.name.trim() || 'fichier';
}

export async function downloadAttachment(file: NoteAttachment): Promise<void> {
  const filename = attachmentDisplayName(file);
  const downloadUrl = api.fileDownload(file.url, filename);
  const token = getAccessToken();

  const response = await fetch(downloadUrl, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Le téléchargement a échoué');
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}
