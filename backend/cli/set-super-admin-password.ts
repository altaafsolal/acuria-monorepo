#!/usr/bin/env node
/**
 * Sync the super-admin password from SUPER_ADMIN_PASSWORD (and optionally name
 * from SUPER_ADMIN_NAME) for the account identified by SUPER_ADMIN_EMAIL.
 *
 * First-time creation still happens in `npm run setup` (seed). That seed skips
 * existing users, so password rotation after a leak is done here:
 *
 *   1. Set SUPER_ADMIN_PASSWORD (and SUPER_ADMIN_EMAIL if needed) in backend/.env
 *      or in the host env (Vercel).
 *   2. npm run set-super-admin-password --workspace=backend
 *
 * Never logs the plaintext password.
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { env, isBaserowConfigured } from '../src/config/env.js';
import { formatCliError } from '../baserow/lib/run-scripts.js';
import { testConnection } from '../src/services/baserow/api.js';
import * as usersRepo from '../src/services/baserow/users.js';

const BCRYPT_ROUNDS = 10;
const WEAK_PASSWORD = 'admin123';

async function main() {
  const email = env.superAdmin.email;
  const password = env.superAdmin.password;
  const name = env.superAdmin.name;

  if (!email) {
    throw new Error('SUPER_ADMIN_EMAIL is empty');
  }
  if (!password) {
    throw new Error('SUPER_ADMIN_PASSWORD is empty');
  }
  if (password === WEAK_PASSWORD && env.isProduction) {
    throw new Error(
      'Refusing to set SUPER_ADMIN_PASSWORD to the weak default "admin123" in production. '
      + 'Choose a strong password in the environment, then re-run.',
    );
  }

  if (!isBaserowConfigured()) {
    throw new Error('Baserow is not configured. Set BASEROW_* in backend/.env');
  }

  const status = await testConnection();
  if (!status.connected) {
    throw new Error(`Baserow connection failed: ${status.message}`);
  }

  const user = await usersRepo.findUserByEmail(email);
  if (!user) {
    throw new Error(
      `No user found for SUPER_ADMIN_EMAIL (${email}). `
      + 'Run `npm run setup` first to create the super admin.',
    );
  }
  if (!usersRepo.isSuperAdmin(user)) {
    throw new Error(
      `User ${email} exists but role is "${user.role}", not super_admin. Refusing to change password.`,
    );
  }

  const alreadyMatches = user.password_hash
    ? await bcrypt.compare(password, user.password_hash)
    : false;

  if (alreadyMatches && user.name === name && user.status === 'active') {
    console.log(`✓ Super admin ${email} already matches SUPER_ADMIN_* — nothing to do`);
    return;
  }

  const password_hash = alreadyMatches
    ? user.password_hash
    : await bcrypt.hash(password, BCRYPT_ROUNDS);

  await usersRepo.updateUser(user.id, {
    password_hash,
    name,
    status: 'active',
    // Invalidate any pending password-reset / OTP after a forced rotation.
    reset_token_hash: '',
    reset_token_expires: '',
    otp_hash: '',
    otp_expires: '',
    otp_attempts: 0,
  });

  if (alreadyMatches) {
    console.log(`✓ Super admin ${email} metadata synced (name/status); password unchanged`);
  } else {
    console.log(`✓ Super admin ${email} password updated from SUPER_ADMIN_PASSWORD`);
  }
}

main().catch((error) => {
  console.error('\nset-super-admin-password failed:', formatCliError(error));
  process.exit(1);
});
