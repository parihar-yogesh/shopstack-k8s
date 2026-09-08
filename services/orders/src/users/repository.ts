import type { Pool } from 'pg';

export interface User {
  id: string;
  email: string;
  createdAt: Date;
}

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  created_at: Date;
}

export class EmailAlreadyRegisteredError extends Error {
  constructor() {
    super('Email is already registered');
    this.name = 'EmailAlreadyRegisteredError';
  }
}

const UNIQUE_VIOLATION = '23505';

function toUser(row: UserRow): User {
  return { id: row.id, email: row.email, createdAt: row.created_at };
}

export class UserRepository {
  constructor(private readonly pool: Pool) {}

  async create(email: string, passwordHash: string): Promise<User> {
    try {
      const result = await this.pool.query<UserRow>(
        `INSERT INTO users (email, password_hash) VALUES ($1, $2)
         RETURNING id, email, password_hash, created_at`,
        [email, passwordHash],
      );
      return toUser(result.rows[0]!);
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === UNIQUE_VIOLATION) {
        throw new EmailAlreadyRegisteredError();
      }
      throw error;
    }
  }

  async findByEmail(email: string): Promise<{ user: User; passwordHash: string } | null> {
    const result = await this.pool.query<UserRow>(
      'SELECT id, email, password_hash, created_at FROM users WHERE email = $1',
      [email],
    );
    const row = result.rows[0];
    return row ? { user: toUser(row), passwordHash: row.password_hash } : null;
  }

  async findById(id: string): Promise<User | null> {
    const result = await this.pool.query<UserRow>(
      'SELECT id, email, password_hash, created_at FROM users WHERE id = $1',
      [id],
    );
    const row = result.rows[0];
    return row ? toUser(row) : null;
  }
}