import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { buildApp } from '../app.js';
import { createTestPool, resetUsers } from '../testing/database.js';

const EMAIL = 'buyer@example.com';
const PASSWORD = 'a-sufficiently-long-password';

let pool: Pool;
let app: FastifyInstance;

before(async () => {
  pool = createTestPool();
  app = await buildApp({
    logLevel: 'silent',
    pool,
    jwtSecret: 'test-secret',
    cookieSecure: false,
  });
  await app.ready();
});

after(async () => {
  await app.close();
  await pool.end();
});

beforeEach(async () => {
  await resetUsers(pool);
});

interface Csrf {
  token: string;
  cookie: string;
}

async function csrf(): Promise<Csrf> {
  const response = await app.inject({ method: 'GET', url: '/auth/csrf-token' });
  const secret = response.cookies.find((c) => c.name === 'csrf-secret');
  assert.ok(secret, 'expected a csrf secret cookie');
  return { token: response.json().csrfToken, cookie: `csrf-secret=${secret.value}` };
}

async function register(email = EMAIL, password = PASSWORD) {
  const { token, cookie } = await csrf();
  return app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: { email, password },
    headers: { cookie, 'x-csrf-token': token },
  });
}

async function login(email = EMAIL, password = PASSWORD) {
  const { token, cookie } = await csrf();
  return app.inject({
    method: 'POST',
    url: '/auth/login',
    payload: { email, password },
    headers: { cookie, 'x-csrf-token': token },
  });
}

function sessionCookie(response: Awaited<ReturnType<typeof app.inject>>): string {
  const cookie = response.cookies.find((c) => c.name === 'session');
  assert.ok(cookie, 'expected a session cookie');
  return `session=${cookie.value}`;
}

describe('POST /auth/register', () => {
  it('creates an account and starts a session', async () => {
    const response = await register();

    assert.equal(response.statusCode, 201);
    assert.equal(response.json().user.email, EMAIL);
    const cookie = response.cookies.find((c) => c.name === 'session');
    assert.ok(cookie);
    assert.equal(cookie.httpOnly, true, 'session cookie must not be readable by JavaScript');
    assert.equal(cookie.sameSite, 'Strict');
  });

  it('never returns the password hash', async () => {
    const response = await register();

    assert.ok(!response.body.includes('argon2'), 'response body leaked a password hash');
    assert.equal('passwordHash' in response.json().user, false);
  });

  it('rejects a duplicate email', async () => {
    await register();
    const response = await register();

    assert.equal(response.statusCode, 409);
  });

  it('treats email as case insensitive', async () => {
    await register('Buyer@Example.COM');
    const response = await login();

    assert.equal(response.statusCode, 200);
  });

  it('rejects a password shorter than ten characters', async () => {
    const response = await register(EMAIL, 'short');

    assert.equal(response.statusCode, 400);
  });

  it('rejects a malformed email', async () => {
    const response = await register('not-an-email');

    assert.equal(response.statusCode, 400);
  });
});

describe('POST /auth/login', () => {
  beforeEach(async () => {
    await register();
  });

  it('accepts correct credentials', async () => {
    const response = await login();

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().user.email, EMAIL);
  });

  it('rejects a wrong password', async () => {
    const response = await login(EMAIL, 'wrong-but-long-enough');

    assert.equal(response.statusCode, 401);
  });

  it('gives an unknown email the same response as a wrong password', async () => {
    const unknown = await login('nobody@example.com', PASSWORD);
    const wrongPassword = await login(EMAIL, 'wrong-but-long-enough');

    assert.equal(unknown.statusCode, wrongPassword.statusCode);
    assert.deepEqual(unknown.json(), wrongPassword.json());
  });
});

describe('GET /auth/me', () => {
  it('returns the signed-in user', async () => {
    const registered = await register();
    const response = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { cookie: sessionCookie(registered) },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().user.email, EMAIL);
  });

  it('rejects a request with no session', async () => {
    const response = await app.inject({ method: 'GET', url: '/auth/me' });

    assert.equal(response.statusCode, 401);
  });

  it('rejects a forged token', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { cookie: 'session=not.a.real.token' },
    });

    assert.equal(response.statusCode, 401);
  });
});

describe('POST /auth/logout', () => {
  it('clears the session cookie', async () => {
    const registered = await register();
    const { token, cookie } = await csrf();
    const response = await app.inject({
      method: 'POST',
      url: '/auth/logout',
      headers: { cookie: `${sessionCookie(registered)}; ${cookie}`, 'x-csrf-token': token },
    });

    assert.equal(response.statusCode, 204);
    const cleared = response.cookies.find((c) => c.name === 'session');
    assert.equal(cleared?.value, '');
  });
});

describe('CSRF protection', () => {
  it('rejects a state-changing request with no token', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: EMAIL, password: PASSWORD },
    });

    assert.equal(response.statusCode, 403);
  });

  it('rejects a token that does not match the secret cookie', async () => {
    const { cookie } = await csrf();
    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: EMAIL, password: PASSWORD },
      headers: { cookie, 'x-csrf-token': 'forged-token' },
    });

    assert.equal(response.statusCode, 403);
  });
});