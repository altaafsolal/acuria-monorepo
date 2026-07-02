import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';
import type { Application, Router } from 'express';
import { Router as createRouter } from 'express';

const VERB_FILES = ['get', 'post', 'put', 'patch', 'delete'] as const;

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

async function hasVerbFile(folder: string): Promise<boolean> {
  for (const verb of VERB_FILES) {
    try {
      await fs.access(path.join(folder, `${verb}.ts`));
      return true;
    } catch {
      // not present
    }
  }
  return false;
}

async function loadVerbRouter(folder: string, verb: string): Promise<Router | null> {
  const verbPath = path.join(folder, `${verb}.ts`);
  try {
    await fs.access(verbPath);
    const mod = await import(pathToFileURL(verbPath).href) as { default?: Router };
    return mod.default ?? null;
  } catch {
    return null;
  }
}

export async function loadRoutes(app: Application, routesDir: string): Promise<void> {
  const allDirs = await walkDirs(routesDir);
  const groups: { folder: string; mountPath: string }[] = [];

  for (const folder of allDirs) {
    if (await hasVerbFile(folder)) {
      groups.push({ folder, mountPath: folderToMountPath(routesDir, folder) });
    }
  }

  groups.sort((a, b) => b.mountPath.length - a.mountPath.length);

  for (const { folder, mountPath } of groups) {
    const router = createRouter({ mergeParams: true });

    for (const verb of VERB_FILES) {
      const verbRouter = await loadVerbRouter(folder, verb);
      if (verbRouter) {
        router.use(verbRouter);
      }
    }

    app.use(mountPath, router);
  }
}
