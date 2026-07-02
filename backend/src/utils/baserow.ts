import type { BaserowRow } from '../types/domain.js';

export function pickFieldValue(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value === 'object' && value !== null && 'value' in value) {
    return String((value as { value: unknown }).value);
  }
  if (Array.isArray(value)) {
    const first = value[0];
    if (first && typeof first === 'object' && 'id' in first) {
      return String((first as { id: unknown }).id);
    }
    return first != null ? String(first) : null;
  }
  return String(value);
}

export function pickNumberValue(value: unknown): number | null {
  if (value == null || value === '') return null;
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

export function pickTextValue(value: unknown): string | null {
  const text = pickFieldValue(value);
  return text === '' ? null : text;
}

export function pickLinkRowId(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (Array.isArray(value) && value.length > 0) {
    const first = value[0];
    if (first && typeof first === 'object' && 'id' in first) {
      return String((first as { id: unknown }).id);
    }
    return String(first);
  }
  if (typeof value === 'object' && value !== null && 'id' in value) {
    return String((value as { id: unknown }).id);
  }
  return String(value);
}

function isEmptyFieldValue(value: unknown): boolean {
  if (value == null || value === '') return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (value === false) return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === 'object' && value !== null && 'value' in value) {
    const inner = (value as { value: unknown }).value;
    return inner == null || inner === '';
  }
  return false;
}

/** True only for Baserow auto-created placeholder rows (every field empty). */
export function isBlankRow(row: BaserowRow): boolean {
  const keys = Object.keys(row).filter((key) => key !== 'id' && key !== 'order');
  if (keys.length === 0) return true;
  return keys.every((key) => isEmptyFieldValue(row[key]));
}

export function normalizeDateForBaserow(value: unknown): string | null {
  if (value == null || value === '') return null;
  const s = String(value).trim();
  if (!s) return null;

  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);

  const us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (us) {
    const a = parseInt(us[1], 10);
    const b = parseInt(us[2], 10);
    const year = us[3];
    let month: number;
    let day: number;
    if (a > 12) {
      day = a;
      month = b;
    } else if (b > 12) {
      month = a;
      day = b;
    } else {
      month = a;
      day = b;
    }
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  const eu = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (eu) {
    const [, day, month, year] = eu;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return null;
}

/** Convert input to Baserow ISO datetime (for date fields with time enabled). */
export function normalizeDateTimeForBaserow(value: unknown): string | null {
  if (value == null || value === '') return null;
  const s = String(value).trim();
  if (!s) return null;

  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  return normalizeDateForBaserow(value);
}

export function pickFileValues(value: unknown): Array<{
  name: string;
  url: string;
  visibleName: string | null;
  size: number | null;
}> {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item) => ({
      name: String(item.name ?? ''),
      url: String(item.url ?? ''),
      visibleName: item.visible_name != null
        ? String(item.visible_name)
        : item.visibleName != null
          ? String(item.visibleName)
          : null,
      size: typeof item.size === 'number' ? item.size : null,
    }))
    .filter((item) => item.name && item.url);
}

export function normalizePhoneForBaserow(value: unknown): string | null {
  const s = value == null ? '' : String(value).trim();
  if (!s) return null;
  return s;
}
