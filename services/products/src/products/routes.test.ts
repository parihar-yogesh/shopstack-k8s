import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { buildApp } from '../app.js';
import { createTestPool, resetProducts, type FixtureProduct } from '../testing/database.js';

const fixtures: FixtureProduct[] = [
  { sku: 'test-001', name: 'First Product', priceCents: 1000, stock: 5 },
  { sku: 'test-002', name: 'Second Product', priceCents: 2500, stock: 0 },
  { sku: 'test-003', name: 'Third Product', priceCents: 999, stock: 12 },
];

let pool: Pool;
let app: FastifyInstance;

before(async () => {
  pool = createTestPool();
  app = buildApp('silent', pool);
  await app.ready();
});

after(async () => {
  await app.close();
  await pool.end();
});

beforeEach(async () => {
  await resetProducts(pool, fixtures);
});

describe('GET /products', () => {
  it('returns every product with a total count', async () => {
    const response = await app.inject({ method: 'GET', url: '/products' });

    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.total, 3);
    assert.equal(body.items.length, 3);
    assert.equal(body.items[0].name, 'First Product');
  });

  it('paginates with limit and offset', async () => {
    const response = await app.inject({ method: 'GET', url: '/products?limit=1&offset=1' });

    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.items.length, 1);
    assert.equal(body.items[0].sku, 'test-002');
    assert.equal(body.total, 3, 'total reflects the whole table, not the page');
  });

  it('rejects a limit above the maximum', async () => {
    const response = await app.inject({ method: 'GET', url: '/products?limit=999' });

    assert.equal(response.statusCode, 400);
  });

  it('reports stock so the frontend can show sold-out items', async () => {
    const response = await app.inject({ method: 'GET', url: '/products' });

    const soldOut = response.json().items.find((item: { sku: string }) => item.sku === 'test-002');
    assert.equal(soldOut.stock, 0);
  });
});

describe('GET /products/:id', () => {
  it('returns a single product', async () => {
    const response = await app.inject({ method: 'GET', url: '/products/1' });

    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.sku, 'test-001');
    assert.equal(body.priceCents, 1000);
  });

  it('returns 404 for an id that does not exist', async () => {
    const response = await app.inject({ method: 'GET', url: '/products/999999' });

    assert.equal(response.statusCode, 404);
  });

  it('returns 400 for a non-numeric id without touching the database', async () => {
    const response = await app.inject({ method: 'GET', url: '/products/abc' });

    assert.equal(response.statusCode, 400);
  });
});

describe('probes', () => {
  it('reports liveness', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { status: 'ok' });
  });

  it('reports readiness when the database answers', async () => {
    const response = await app.inject({ method: 'GET', url: '/ready' });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { status: 'ready' });
  });
});