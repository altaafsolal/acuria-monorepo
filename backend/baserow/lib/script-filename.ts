const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

const TIMESTAMP_PREFIX_RE = /^(\d{2})_(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)_(\d{4})-(\d{2})_(\d{2})_/;

export function parseScriptFilename(filename: string): { sortKey: number; filename: string } {
  const match = filename.match(TIMESTAMP_PREFIX_RE);
  if (match) {
    const [, day, month, year, hour, minute] = match;
    const monthIdx = MONTHS.indexOf(month as typeof MONTHS[number]);
    const sortKey = (
      Number(year) * 1e10
      + (monthIdx + 1) * 1e8
      + Number(day) * 1e6
      + Number(hour) * 1e4
      + Number(minute) * 1e2
    );
    return { sortKey, filename };
  }

  const legacy = filename.match(/^(\d+)-/);
  if (legacy) {
    return { sortKey: Number(legacy[1]), filename };
  }

  return { sortKey: Number.MAX_SAFE_INTEGER, filename };
}

/** Sort migration/seed files oldest-first (by timestamp prefix, then name). */
export function sortScriptFiles(files: string[]): string[] {
  return [...files].sort((a, b) => {
    const pa = parseScriptFilename(a);
    const pb = parseScriptFilename(b);
    if (pa.sortKey !== pb.sortKey) return pa.sortKey - pb.sortKey;
    return a.localeCompare(b);
  });
}
