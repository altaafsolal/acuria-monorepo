import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';
import type { Application, Router } from 'express';
import { Router as createRouter } from 'express';

const VERB_PREFIXES = ['delete', 'patch', 'post', 'put', 'get'] as const;

const VERB_FILE_RE = /^(get|post|put|patch|delete)(\.ts$|[A-Z].*\.ts$)/;

async function walkDirs(dir: string): Promise<string[]> {
  const dirs: string[] = [dir];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      dirs.push(...await walkDirs(path.join(dir, entry.name)));
    }
  }
  return dirs;
}

function folderToMountPath(routesDir: string, folder: string): string {
  const relative = path.relative(routesDir, folder).split(path.sep).join('/');
  const segments = relative.split('/').map((seg) => {
    if (seg.startsWith('[') && seg.endsWith(']')) {
      return `:${seg.slice(1, -1)}`;
    }
    return seg;
  });
  return `/api/${segments.join('/')}`;
}

async function getVerbFilesInDir(folder: string): Promise<string[]> {
  const entries = await fs.readdir(folder, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile() && VERB_FILE_RE.test(e.name))
    .map((e) => e.name)
    .sort((a, b) => {
      // Sort by verb prefix order first, then alphabetically
      const aVerb = VERB_PREFIXES.find((v) => a.toLowerCase().startsWith(v)) ?? '';
      const bVerb = VERB_PREFIXES.find((v) => b.toLowerCase().startsWith(v)) ?? '';
      const verbOrder = VERB_PREFIXES.indexOf(aVerb as typeof VERB_PREFIXES[number]) -
        VERB_PREFIXES.indexOf(bVerb as typeof VERB_PREFIXES[number]);
      return verbOrder !== 0 ? verbOrder : a.localeCompare(b);
    });
  return files.map((f) => path.join(folder, f));
}

export async function loadRoutes(app: Application, routesDir: string): Promise<void> {
  const allDirs = await walkDirs(routesDir);
  const groups: { folder: string; mountPath: string }[] = [];

  for (const folder of allDirs) {
    const verbFiles = await getVerbFilesInDir(folder);
    if (verbFiles.length > 0) {
      groups.push({ folder, mountPath: folderToMountPath(routesDir, folder) });
    }
  }

  groups.sort((a, b) => b.mountPath.length - a.mountPath.length);

  for (const { folder, mountPath } of groups) {
    const router = createRouter({ mergeParams: true });
    const verbFiles = await getVerbFilesInDir(folder);

    for (const filePath of verbFiles) {
      try {
        const mod = await import(pathToFileURL(filePath).href) as { default?: Router };
        if (mod.default) {
          router.use(mod.default);
        }
      } catch {
        // file not loadable
      }
    }

    app.use(mountPath, router);
  }
}
