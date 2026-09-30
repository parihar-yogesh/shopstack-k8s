import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { buildApp } from '../app.js';
import { CatalogUnavailableError } from '../catalog/client.js';
import { StubCatalog } from '../testing/catalog.js';
import { countOrders, createTestPool, resetUsers } from '../testing/database.js';

const EMAIL = 'buyer@example.com';
const PASSWORD = 'a-sufficiently-long-password';

const HEADPHONES = {
  id: '1',
  sku: 'aur-hp-01',
  name: 'Aurora Wireless Headphones',
  priceCents: 12900,
  currency: 'EUR',
  stock: 24,
};

const LAMP = {
  id: '2',
  sku: 'mer-lmp-01',
  name: 'Meridian Desk Lamp',
  priceCents: 6400,
  currency: 'EUR',
  stock: 2,
};

let pool: Pool;
let app: FastifyInstance;
const catalog = new StubCatalog();

before(async () => {
  pool = createTestPool();
  app = await buildApp({
    logLevel: 'silent',
    pool,
    jwtSecret: 'test-secret',
    cookieSecure: false,
    catalog,
  });
  await app.ready();
});

after(async () => {
  await app.close();
  await pool.end();
});

async function csrf(): Promise<{ token: string; cookie: string }> {
  const response = await app.inject({ method: 'GET', url: '/auth/csrf-token' });
  const secret = response.cookies.find((c) => c.name === 'csrf-secret');
  assert.ok(secret);
  return { token: response.json().csrfToken, cookie: `csrf-secret=${secret.value}` };
}

let session = '';

beforeEach(async () => {
  await resetUsers(pool);
  catalog.reset();
  catalog.add(HEADPHONES).add(LAMP);

  const { token, cookie } = await csrf();
  const registered = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: { email: EMAIL, password: PASSWORD },
    headers: { cookie, 'x-csrf-token': token },
  });
  const sessionCookie = registered.cookies.find((c) => c.name === 'session');
  assert.ok(sessionCookie);
  session = `session=${sessionCookie.value}`;
});

async function placeOrder(items: unknown, authenticated = true) {
  const { token, cookie } = await csrf();
  const cookies = authenticated ? `${session}; ${cookie}` : cookie;
  return app.inject({
    method: 'POST',
    url: '/orders',
    payload: { items },
    headers: { cookie: cookies, 'x-csrf-token': token },
  });
}

describe('POST /orders', () => {
  it('places an order and returns it', async () => {
    const response = await placeOrder([{ productId: '1', quantity: 2 }]);

    assert.equal(response.statusCode, 201);
    const { order } = response.json();
    assert.equal(order.totalCents, 25800);
    assert.equal(order.currency, 'EUR');
    assert.equal(order.status, 'placed');
    assert.equal(order.items.length, 1);
    assert.equal(order.items[0].unitPriceCents, 12900);
    assert.equal(order.items[0].lineTotalCents, 25800);
  });

  it('ignores a price sent by the client and charges the catalogue price', async () => {
    const { token, cookie } = await csrf();
    const response = await app.inject({
      method: 'POST',
      url: '/orders',
      payload: { items: [{ productId: '1', quantity: 1, unitPriceCents: 1 }] },
      headers: { cookie: `${session}; ${cookie}`, 'x-csrf-token': token },
    });

    assert.equal(response.statusCode, 201);
    const { order } = response.json();
    assert.equal(order.totalCents, 12900, 'the client-supplied price must be ignored');
    assert.equal(order.items[0].unitPriceCents, 12900);
  });

  it('totals several items correctly', async () => {
    const response = await placeOrder([
      { productId: '1', quantity: 1 },
      { productId: '2', quantity: 2 },
    ]);

    assert.equal(response.statusCode, 201);
    assert.equal(response.json().order.totalCents, 12900 + 6400 * 2);
  });

  it('rejects an order from a signed-out visitor', async () => {
    const response = await placeOrder([{ productId: '1', quantity: 1 }], false);

    assert.equal(response.statusCode, 401);
    assert.equal(await countOrders(pool), 0);
  });

  it('rejects an order with no CSRF token', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/orders',
      payload: { items: [{ productId: '1', quantity: 1 }] },
      headers: { cookie: session },
    });

    assert.equal(response.statusCode, 403);
  });

  it('rejects a product that does not exist', async () => {
    const response = await placeOrder([{ productId: '999', quantity: 1 }]);

    assert.equal(response.statusCode, 400);
    assert.equal(await countOrders(pool), 0);
  });

  it('refuses to oversell and reports what is available', async () => {
    const response = await placeOrder([{ productId: '2', quantity: 5 }]);

    assert.equal(response.statusCode, 409);
    assert.deepEqual(response.json().items, [{ productId: '2', requested: 5, available: 2 }]);
    assert.equal(await countOrders(pool), 0);
  });

  it('rejects the same product listed twice', async () => {
    const response = await placeOrder([
      { productId: '1', quantity: 1 },
      { productId: '1', quantity: 1 },
    ]);

    assert.equal(response.statusCode, 400);
    assert.equal(await countOrders(pool), 0);
  });

  it('rejects an empty basket', async () => {
    const response = await placeOrder([]);

    assert.equal(response.statusCode, 400);
  });

  it('rejects a quantity of zero', async () => {
    const response = await placeOrder([{ productId: '1', quantity: 0 }]);

    assert.equal(response.statusCode, 400);
  });

  it('returns 503 when the catalogue cannot be reached', async () => {
    catalog.failWith(new CatalogUnavailableError('connection refused'));
    const response = await placeOrder([{ productId: '1', quantity: 1 }]);

    assert.equal(response.statusCode, 503);
    assert.equal(await countOrders(pool), 0);
  });
});