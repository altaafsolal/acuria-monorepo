import { readdir } from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';
import { sortScriptFiles } from './script-filename.js';
import type { ScriptModule } from '../types/scripts.js';
import type { AxiosLikeError } from '../types/baserow.js';

/**
 * Runs timestamped scripts from a folder (migrations, seeds).
 * Filenames: `DD_MMM_YYYY-HH_mm_description.ts` (oldest first).
 * Each file must export `up()` or `default.up`.
 */
export async function runScriptsFromDir(scriptsDir: string, label: string): Promise<void> {
  const files = sortScriptFiles(
    (await readdir(scriptsDir)).filter((file) => file.endsWith('.ts')),
  );

  if (files.length === 0) {
    console.log(`No ${label} found in ${scriptsDir}`);
    return;
  }

  for (const file of files) {
    console.log(`\nRunning ${label} ${file}…`);
    const mod = await import(pathToFileURL(path.join(scriptsDir, file)).href) as ScriptModule;
    const up = mod.up ?? mod.default?.up;
    if (!up) throw new Error(`${label} ${file} has no up() export`);
    await up();
  }
}

export function formatCliError(error: unknown): string {
  const err = error as AxiosLikeError;
  return err.response?.data?.detail
    || err.response?.data?.error
    || err.response?.data?.description
    || err.message
    || String(error);
}
