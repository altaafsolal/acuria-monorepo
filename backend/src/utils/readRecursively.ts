import path from 'path';
import fs from 'fs/promises';

/** List all files under a directory (recursive). */
export default async function readRecursively(dir: string): Promise<string[]> {
  const files: string[] = [];

  async function walk(currentDir: string): Promise<void> {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(absolute);
      } else {
        files.push(absolute);
      }
    }
  }

  await walk(dir);
  return files;
}
