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

describe('GET /orders', () => {
  async function get(url: string, cookie = session) {
    return app.inject({ method: 'GET', url, headers: { cookie } });
  }

  it('returns only the signed-in user\'s orders, newest first', async () => {
    await placeOrder([{ productId: '1', quantity: 1 }]);
    await placeOrder([{ productId: '2', quantity: 1 }]);

    const response = await get('/orders');

    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.total, 2);
    assert.equal(body.items.length, 2);
    assert.equal(body.items[0].items[0].sku, 'mer-lmp-01', 'most recent order comes first');
  });

  it('includes the items of every order in the page', async () => {
    await placeOrder([
      { productId: '1', quantity: 2 },
      { productId: '2', quantity: 1 },
    ]);

    const body = (await get('/orders')).json();

    assert.equal(body.items[0].items.length, 2);
    assert.equal(body.items[0].totalCents, 12900 * 2 + 6400);
  });

  it('returns an empty list for a user with no orders', async () => {
    const body = (await get('/orders')).json();

    assert.deepEqual(body.items, []);
    assert.equal(body.total, 0);
  });

  it('paginates', async () => {
    await placeOrder([{ productId: '1', quantity: 1 }]);
    await placeOrder([{ productId: '2', quantity: 1 }]);

    const body = (await get('/orders?limit=1&offset=1')).json();

    assert.equal(body.items.length, 1);
    assert.equal(body.total, 2, 'total counts every order, not the page');
  });

  it('rejects a signed-out visitor', async () => {
    const response = await app.inject({ method: 'GET', url: '/orders' });

    assert.equal(response.statusCode, 401);
  });
});

describe('GET /orders/:id', () => {
  it('returns one order with its items', async () => {
    const placed = (await placeOrder([{ productId: '1', quantity: 3 }])).json().order;

    const response = await app.inject({
      method: 'GET',
      url: `/orders/${placed.id}`,
      headers: { cookie: session },
    });

    assert.equal(response.statusCode, 200);
    const { order } = response.json();
    assert.equal(order.id, placed.id);
    assert.equal(order.items[0].quantity, 3);
    assert.equal(order.totalCents, 38700);
  });

  it('hides another user\'s order behind a 404', async () => {
    const placed = (await placeOrder([{ productId: '1', quantity: 1 }])).json().order;

    const { token, cookie } = await csrf();
    const other = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'someone-else@example.com', password: PASSWORD },
      headers: { cookie, 'x-csrf-token': token },
    });
    const otherSession = other.cookies.find((c) => c.name === 'session');
    assert.ok(otherSession);

    const response = await app.inject({
      method: 'GET',
      url: `/orders/${placed.id}`,
      headers: { cookie: `session=${otherSession.value}` },
    });

    assert.equal(response.statusCode, 404, 'must not reveal that the order exists');
  });

  it('returns 404 for an order that does not exist', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/orders/00000000-0000-0000-0000-000000000000',
      headers: { cookie: session },
    });

    assert.equal(response.statusCode, 404);
  });

  it('rejects an id that is not a uuid', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/orders/not-a-uuid',
      headers: { cookie: session },
    });

    assert.equal(response.statusCode, 400);
  });
});