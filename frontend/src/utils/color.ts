/** Lighten a #RRGGBB hex color by mixing toward white (amount 0–1). */
export function lightenHex(hex: string, amount = 0.25): string {
  const normalized = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return hex;
  }

  const mix = (channel: number) => Math.round(channel + (255 - channel) * amount);
  const r = mix(parseInt(normalized.slice(0, 2), 16));
  const g = mix(parseInt(normalized.slice(2, 4), 16));
  const b = mix(parseInt(normalized.slice(4, 6), 16));

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function normalizeHexColor(value: string): string | null {
  const trimmed = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }
  if (/^[0-9a-fA-F]{6}$/.test(trimmed)) {
    return `#${trimmed.toUpperCase()}`;
  }
  return null;
}
