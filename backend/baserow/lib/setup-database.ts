import path from 'path';
import { fileURLToPath } from 'url';
import { runScriptsFromDir } from './run-scripts.js';
import { provisionAllTenants } from './provision-all-tenants.js';
import { cleanupAllRows } from './cleanup-all-rows.js';
import { printEnvHints } from './print-env-hints.js';

const baserowDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const STEPS = [
  {
    title: 'Main database schema (users + tenants tables)',
    detail: 'Creates missing tables/fields only — never drops or changes existing schema',
    run: () => runScriptsFromDir(path.join(baserowDir, 'migrations'), 'migration'),
  },
  {
    title: 'Bootstrap data (super admin + NM Prime)',
    detail: 'Inserts missing rows only — never updates passwords or existing records',
    run: () => runScriptsFromDir(path.join(baserowDir, 'seeds'), 'seed'),
  },
  {
    title: 'Per-tenant database tables (clients, kyc_documents, notes, tasks, audit_logs)',
    detail: 'Creates tables in each tenant\'s dedicated Baserow database — never touches existing rows',
    run: () => provisionAllTenants(),
  },
  {
    title: 'Remove blank placeholder rows',
    detail: 'Deletes only rows where every field is empty — real data is never removed',
    run: () => cleanupAllRows(),
  },
];

export async function setupDatabase() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║       Acuria — full database setup       ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('\nIdempotent: safe to re-run. Existing tables, fields, and data are preserved.\n');

  for (let i = 0; i < STEPS.length; i += 1) {
    const step = STEPS[i];
    console.log(`\n── Step ${i + 1}/${STEPS.length}: ${step.title} ──`);
    console.log(`   ${step.detail}\n`);
    await step.run();
  }

  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║            Setup complete ✓              ║');
  console.log('╚══════════════════════════════════════════╝');

  await printEnvHints();

  console.log('\nYou can now run: npm run dev');
}
