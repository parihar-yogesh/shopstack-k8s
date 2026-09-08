import type { Pool } from 'pg';
import { createPool } from '../db.js';

export function createTestPool(): Pool {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error('TEST_DATABASE_URL is not set. Tests must never run against the development database.');
  }
  return createPool(url);
}

export async function resetUsers(pool: Pool): Promise<void> {
  await pool.query('TRUNCATE users CASCADE');
}