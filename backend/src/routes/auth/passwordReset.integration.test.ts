import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import supertest from 'supertest';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { app } from '../../test/helpers/app.js';
import { makeDbUser, makeDbUserRow, makeTenantRecord, makeTenantRow } from '../../test/helpers/fixtures.js';
import {
  seedTableCaches,
  nockUsersTable,
  nockUserById,
  nockUpdateRow,
  nockCreateRow,
  nockTenantById,
  TABLE_IDS,
} from '../../test/helpers/nock-baserow.js';
import { stubFetch, restoreFetch } from '../../test/helpers/nock-make.js';

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

beforeEach(() => {
  seedTableCaches();
});

afterEach(() => {
  restoreFetch();
});

describe('POST /api/auth/forgot-password', () => {
  it('returns 200 and triggers OTP generation for existing user', async () => {
    const user = makeDbUser({ id: '10', email: 'alice@example.com', status: 'active', tenant_id: '1' });
    const row = makeDbUserRow(user);
    const tenant = makeTenantRecord({ id: '1' });
    const tenantRow = makeTenantRow(tenant);

    // findUserByEmail lists all users
    nockUsersTable([row]);
    // requestPasswordResetOtp looks up tenant
    nockTenantById('1', tenantRow);
    // issueOtp calls updateUser (stores otp_hash + otp_expires)
    nockUpdateRow(TABLE_IDS.users, '10', { ...row, id: 10 });

    // Make webhook for OTP will be skipped (no env var), but stub fetch to be safe
    const fetchCalls = stubFetch();

    const res = await supertest(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'alice@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('If an account exists for this email, an OTP has been sent');
  });

  it('returns 200 even when user does not exist (no information leak)', async () => {
    nockUsersTable([]);

    const res = await supertest(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nobody@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('If an account exists for this email, an OTP has been sent');
  });

  it('returns 400 when email is missing', async () => {
    const res = await supertest(app)
      .post('/api/auth/forgot-password')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Email is required');
  });
});

describe('POST /api/auth/verify-otp', () => {
  it('returns uid and token when OTP is valid', async () => {
    const otpCode = '123456';
    const otpHash = sha256(otpCode);
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const user = makeDbUser({
      id: '10',
      email: 'alice@example.com',
      otp_hash: otpHash,
      otp_expires: otpExpires,
    });
    const row = makeDbUserRow(user);

    // verifyOtp calls findUserByEmail (lists all users)
    nockUsersTable([row]);
    // verifyOtp calls updateUser (stores reset_token_hash, clears otp)
    nockUpdateRow(TABLE_IDS.users, '10', { ...row, id: 10 });

    const res = await supertest(app)
      .post('/api/auth/verify-otp')
      .send({ email: 'alice@example.com', otp: otpCode });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('uid', '10');
    expect(res.body).toHaveProperty('token');
    expect(typeof res.body.token).toBe('string');
    expect(res.body.token.length).toBeGreaterThan(0);
  });

  it('returns 400 when OTP is invalid', async () => {
    const otpHash = sha256('123456');
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const user = makeDbUser({
      id: '10',
      email: 'alice@example.com',
      otp_hash: otpHash,
      otp_expires: otpExpires,
    });
    const row = makeDbUserRow(user);

    nockUsersTable([row]);

    const res = await supertest(app)
      .post('/api/auth/verify-otp')
      .send({ email: 'alice@example.com', otp: '999999' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid or expired OTP');
  });

  it('returns 400 when email and otp are missing', async () => {
    const res = await supertest(app)
      .post('/api/auth/verify-otp')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Email and OTP are required');
  });
});

describe('POST /api/auth/set-password', () => {
  it('returns 200 when token is valid and passwords match', async () => {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = sha256(rawToken);
    const tokenExpires = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

    const user = makeDbUser({
      id: '10',
      email: 'alice@example.com',
      reset_token_hash: tokenHash,
      reset_token_expires: tokenExpires,
    });
    const row = makeDbUserRow(user);

    // verifySetPasswordToken calls findUserById
    nockUserById('10', row);
    // finalizeNewPassword calls updateUser
    nockUpdateRow(TABLE_IDS.users, '10', { ...row, id: 10 });
    // audit log createRow
    nockCreateRow(TABLE_IDS.auditLogs, { id: 1 });

    const res = await supertest(app)
      .post('/api/auth/set-password')
      .send({ uid: '10', token: rawToken, password: 'newSecurePass1', passwordConfirm: 'newSecurePass1' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Password set successfully');
  });

  it('returns 400 when token is invalid', async () => {
    const tokenHash = sha256('realtoken');
    const tokenExpires = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

    const user = makeDbUser({
      id: '10',
      email: 'alice@example.com',
      reset_token_hash: tokenHash,
      reset_token_expires: tokenExpires,
    });
    const row = makeDbUserRow(user);

    nockUserById('10', row);

    const res = await supertest(app)
      .post('/api/auth/set-password')
      .send({ uid: '10', token: 'wrongtoken', password: 'newSecurePass1', passwordConfirm: 'newSecurePass1' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid or expired token');
  });

  it('returns 400 when passwords do not match', async () => {
    const res = await supertest(app)
      .post('/api/auth/set-password')
      .send({ uid: '10', token: 'sometoken', password: 'password1', passwordConfirm: 'password2' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Passwords do not match');
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await supertest(app)
      .post('/api/auth/set-password')
      .send({ uid: '10' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('All fields are required');
  });
});
