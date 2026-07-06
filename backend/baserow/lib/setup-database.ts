import path from 'path';
import { fileURLToPath } from 'url';
import { runScriptsFromDir } from './run-scripts.js';
import { provisionAllTenants } from './provision-all-tenants.js';
import { cleanupAllRows } from './cleanup-all-rows.js';
import { printEnvHints } from './print-env-hints.js';

const baserowDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const STEPS = [
  {
    title: 'Main database schema',
    detail: 'tenants, users, audit_logs',
    run: () => runScriptsFromDir(path.join(baserowDir, 'migrations'), 'migration'),
  },
  {
    title: 'Bootstrap data',
    detail: 'super admin + NM Prime tenant',
    run: () => runScriptsFromDir(path.join(baserowDir, 'seeds'), 'seed'),
  },
  {
    title: 'Tenant database tables',
    detail: 'clients, gestionnaires, kyc_documents, notes, relations, tasks, audit_logs',
    run: () => provisionAllTenants(),
  },
  {
    title: 'Remove blank placeholder rows',
    detail: 'Baserow auto-created empty rows only',
    run: () => cleanupAllRows(),
  },
];

export async function setupDatabase() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║       Acuria — full database setup       ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('\nIdempotent: safe to re-run on an empty or partially provisioned workspace.\n');

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
