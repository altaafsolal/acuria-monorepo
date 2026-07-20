import { describe, it, expect, beforeEach } from 'vitest';
import supertest from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../../test/helpers/app.js';
import { makeDbUser, makeDbUserRow } from '../../test/helpers/fixtures.js';
import {
  seedTableCaches,
  nockUsersTable,
  nockUserById,
  nockCreateRow,
  TABLE_IDS,
} from '../../test/helpers/nock-baserow.js';
import { authHeader, makeRefreshToken } from '../../test/helpers/auth.js';

const PASSWORD = 'password123';
let passwordHash: string;

beforeEach(async () => {
  seedTableCaches();
  passwordHash = await bcrypt.hash(PASSWORD, 10);
});

describe('POST /api/auth/login', () => {
  it('returns 200 with accessToken and sets refreshToken cookie on valid credentials', async () => {
    const user = makeDbUser({ id: '1', email: 'alice@example.com', password_hash: passwordHash, status: 'active' });
    const row = makeDbUserRow(user);

    nockUsersTable([row]);
    // audit log createRow
    nockCreateRow(TABLE_IDS.auditLogs, { id: 1 });

    const res = await supertest(app)
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(typeof res.body.accessToken).toBe('string');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.id).toBe('1');
    expect(res.body.user.email).toBe('alice@example.com');

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const cookieStr = Array.isArray(cookies) ? cookies.join('; ') : String(cookies);
    expect(cookieStr).toMatch(/acuria_refresh_token=/);
    expect(cookieStr).toMatch(/HttpOnly/i);
  });

  it('returns 401 when password is wrong', async () => {
    const user = makeDbUser({ id: '2', email: 'bob@example.com', password_hash: passwordHash, status: 'active' });
    const row = makeDbUserRow(user);

    nockUsersTable([row]);

    const res = await supertest(app)
      .post('/api/auth/login')
      .send({ email: 'bob@example.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
  });

  it('returns 401 when user does not exist', async () => {
    nockUsersTable([]);

    const res = await supertest(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: PASSWORD });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
  });
});

describe('GET /api/auth/me', () => {
  it('returns 200 with user data when token is valid', async () => {
    const user = makeDbUser({ id: '999', email: 'test@example.com', name: 'Test User', role: 'standard_user' });
    const row = makeDbUserRow(user);

    // authenticate middleware calls findUserById
    nockUserById('999', row);

    const res = await supertest(app)
      .get('/api/auth/me')
      .set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.id).toBe('999');
    expect(res.body.user.email).toBe('test@example.com');
    expect(res.body.user.name).toBe('Test User');
    expect(res.body.user.role).toBe('standard_user');
  });

  it('returns 401 when no token is provided', async () => {
    const res = await supertest(app).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Missing or invalid authorization header');
  });
});

describe('POST /api/auth/refresh', () => {
  it('returns 200 with new accessToken when refresh cookie is valid', async () => {
    const refreshToken = makeRefreshToken({ userId: '999', email: 'test@example.com', name: 'Test User', role: 'standard_user' });

    // refresh re-loads the user from the DB before re-issuing an access token
    nockUserById('999', makeDbUserRow(makeDbUser({ id: '999', email: 'test@example.com', name: 'Test User', role: 'standard_user', status: 'active' })));
    // audit log createRow
    nockCreateRow(TABLE_IDS.auditLogs, { id: 1 });

    const res = await supertest(app)
      .post('/api/auth/refresh')
      .set('Cookie', `acuria_refresh_token=${refreshToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(typeof res.body.accessToken).toBe('string');
  });

  it('returns 401 when no refresh cookie is present', async () => {
    const res = await supertest(app).post('/api/auth/refresh');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Refresh token missing');
  });
});

describe('POST /api/auth/logout', () => {
  it('returns 200 and clears the refresh cookie', async () => {
    // audit log createRow
    nockCreateRow(TABLE_IDS.auditLogs, { id: 1 });

    const res = await supertest(app).post('/api/auth/logout');

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Logged out');

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const cookieStr = Array.isArray(cookies) ? cookies.join('; ') : String(cookies);
    // Cookie should be cleared (expires in the past or max-age=0)
    expect(cookieStr).toMatch(/acuria_refresh_token=/);
  });
});
