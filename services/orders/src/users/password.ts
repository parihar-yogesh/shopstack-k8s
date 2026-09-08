import { randomBytes } from 'node:crypto';
import argon2, { type HashOptions } from 'argon2';

const OPTIONS: HashOptions = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

export function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, OPTIONS);
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}

// A real hash of a value nobody knows. Login verifies against this when the
// email is unknown, so the response time does not reveal whether an account
// exists.
const decoyHash = hashPassword(randomBytes(32).toString('hex'));

export function decoy(): Promise<string> {
  return decoyHash;
}