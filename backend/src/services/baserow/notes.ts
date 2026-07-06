import { BASEROW_FIELDS } from '../../../baserow/schema.js';
import {
  normalizeDateTimeForBaserow,
  pickFieldValue,
  pickFileValues,
  pickLinkRowId,
  pickTextValue,
} from '../../utils/baserow.js';
import { createRow, deleteRow, listAllRows, updateRow } from './api.js';
import { resolveTenantDbContext } from './tenant-context.js';
import { resolveTenantTableId } from './tenant-tables.js';
import type { BaserowRow, DbNote, NoteAttachment, PublicNote } from '../../types/domain.js';

const F = BASEROW_FIELDS.notes;

function mapRow(row: BaserowRow): DbNote {
  return {
    id: String(row.id),
    name: String(row[F.name] || ''),
    client_id: pickLinkRowId(row[F.clientId]),
    date: pickTextValue(row[F.date]),
    note_type: pickFieldValue(row[F.noteType]) || 'Note interne',
    auteur: pickTextValue(row[F.auteur]),
    contenu: pickTextValue(row[F.contenu]),
    pieces_jointes: pickFileValues(row[F.piecesJointes]),
    source: pickTextValue(row[F.source]) || 'Manuel',
    airtable_record_id: pickTextValue(row[F.airtableRecordId]),
  };
}

export function toPublicNote(note: DbNote): PublicNote {
  return {
    id: note.id,
    clientId: note.client_id,
    date: note.date,
    noteType: note.note_type,
    auteur: note.auteur,
    contenu: note.contenu,
    piecesJointes: note.pieces_jointes,
    source: note.source,
  };
}

export async function listNotesByClient(tenantId: string, clientId: string): Promise<PublicNote[]> {
  const ctx = await resolveTenantDbContext(tenantId);
  const tableId = await resolveTenantTableId(tenantId, 'notes');
  return (await listAllRows(tableId, {
    filters: { filter_type: 'AND', filters: [{ type: 'link_row_has', field: F.clientId, value: clientId }] },
  }, ctx)).map(mapRow).map(toPublicNote);
}

export async function createNote(
  tenantId: string,
  input: {
    clientId: string;
    date?: string;
    noteType: string;
    auteur: string;
    contenu: string;
    piecesJointes?: Array<{ name: string; visibleName?: string }>;
  },
): Promise<PublicNote> {
  const ctx = await resolveTenantDbContext(tenantId);
  const tableId = await resolveTenantTableId(tenantId, 'notes');
  const payload: Record<string, unknown> = {
    [F.name]: `${input.noteType} — ${input.auteur}`,
    [F.clientId]: [Number(input.clientId)],
    [F.date]: normalizeDateTimeForBaserow(input.date) || new Date().toISOString(),
    [F.noteType]: input.noteType,
    [F.auteur]: input.auteur,
    [F.contenu]: input.contenu,
    [F.source]: 'Manuel',
  };

  if (input.piecesJointes && input.piecesJointes.length > 0) {
    payload[F.piecesJointes] = input.piecesJointes.map((file) => ({
      name: file.name,
      ...(file.visibleName ? { visible_name: file.visibleName } : {}),
    }));
  }

  const row = await createRow(tableId, payload, ctx);
  return toPublicNote(mapRow(row));
}

export async function deleteNote(tenantId: string, noteId: string): Promise<boolean> {
  const ctx = await resolveTenantDbContext(tenantId);
  const tableId = await resolveTenantTableId(tenantId, 'notes');
  await deleteRow(tableId, noteId, ctx);
  return true;
}

export async function upsertNoteFromAirtable(
  tenantId: string,
  data: {
    clientId?: string | null;
    date?: string;
    noteType: string;
    auteur: string;
    contenu: string;
    airtableRecordId: string;
  },
): Promise<DbNote> {
  const ctx = await resolveTenantDbContext(tenantId);
  const tableId = await resolveTenantTableId(tenantId, 'notes');
  const rows = await listAllRows(tableId, {}, ctx);
  const existing = rows.find((r) => pickTextValue(r[F.airtableRecordId]) === data.airtableRecordId);
  const payload = {
    [F.name]: `${data.noteType} — ${data.auteur}`,
    [F.clientId]: data.clientId ? [Number(data.clientId)] : [],
    [F.date]: normalizeDateTimeForBaserow(data.date),
    [F.noteType]: data.noteType,
    [F.auteur]: data.auteur,
    [F.contenu]: data.contenu,
    [F.source]: 'Manuel',
    [F.airtableRecordId]: data.airtableRecordId,
  };
  if (existing) {
    return mapRow(await updateRow(tableId, existing.id, payload, ctx));
  }
  return mapRow(await createRow(tableId, payload, ctx));
}
