import type { Pool } from 'pg';
import { createPool } from '../db.js';

export interface FixtureProduct {
  sku: string;
  name: string;
  priceCents: number;
  stock: number;
}

export function createTestPool(): Pool {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error('TEST_DATABASE_URL is not set. Tests must never run against the development database.');
  }
  return createPool(url);
}

export async function resetProducts(pool: Pool, fixtures: FixtureProduct[]): Promise<void> {
  await pool.query('TRUNCATE products RESTART IDENTITY');
  for (const fixture of fixtures) {
    await pool.query(
      `INSERT INTO products (sku, name, description, price_cents, image_url, stock)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [fixture.sku, fixture.name, `${fixture.name} description`, fixture.priceCents, `/images/${fixture.sku}.jpg`, fixture.stock],
    );
  }
}