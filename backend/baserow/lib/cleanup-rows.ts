import { removeBlankRows, type BaserowDbContext } from '../../src/services/baserow/api.js';

/** Deletes only Baserow placeholder rows (all fields empty). Never removes real data. */
export async function cleanupBlankRows(
  tableId: string | number,
  label?: string,
  ctx?: BaserowDbContext,
): Promise<number> {
  const count = await removeBlankRows(tableId, ctx);
  if (count > 0) {
    const suffix = label ? ` (${label})` : '';
    console.log(`  · removed ${count} blank row(s)${suffix}`);
  }
  return count;
}
