#!/usr/bin/env node
import 'dotenv/config';
import { setupDatabase } from '../baserow/lib/setup-database.js';
import { formatCliError } from '../baserow/lib/run-scripts.js';

setupDatabase().catch((error) => {
  console.error('\nSetup failed:', formatCliError(error));
  process.exit(1);
});
