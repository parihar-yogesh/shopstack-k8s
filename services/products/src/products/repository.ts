import type { Pool } from 'pg';

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  priceCents: number;
  currency: string;
  imageUrl: string;
  stock: number;
}

interface ProductRow {
  id: string;
  sku: string;
  name: string;
  description: string;
  price_cents: number;
  currency: string;
  image_url: string;
  stock: number;
}

const COLUMNS = 'id, sku, name, description, price_cents, currency, image_url, stock';

function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    description: row.description,
    priceCents: row.price_cents,
    currency: row.currency,
    imageUrl: row.image_url,
    stock: row.stock,
  };
}

export class ProductRepository {
  constructor(private readonly pool: Pool) {}

  async findAll(limit: number, offset: number): Promise<Product[]> {
    const result = await this.pool.query<ProductRow>(
      `SELECT ${COLUMNS} FROM products ORDER BY id LIMIT $1 OFFSET $2`,
      [limit, offset],
    );
    return result.rows.map(toProduct);
  }

  async countAll(): Promise<number> {
    const result = await this.pool.query<{ count: string }>('SELECT count(*) AS count FROM products');
    return Number(result.rows[0]?.count ?? 0);
  }

  async findById(id: string): Promise<Product | null> {
    const result = await this.pool.query<ProductRow>(
      `SELECT ${COLUMNS} FROM products WHERE id = $1`,
      [id],
    );
    const row = result.rows[0];
    return row ? toProduct(row) : null;
  }
}