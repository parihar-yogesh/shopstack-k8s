import type { Pool } from 'pg';

export interface NewOrderItem {
  productId: string;
  sku: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
}

export interface OrderItem extends NewOrderItem {
  lineTotalCents: number;
}

export interface Order {
  id: string;
  status: string;
  totalCents: number;
  currency: string;
  createdAt: Date;
  items: OrderItem[];
}

interface OrderRow {
  id: string;
  status: string;
  total_cents: number;
  currency: string;
  created_at: Date;
}

function withLineTotals(items: NewOrderItem[]): OrderItem[] {
  return items.map((item) => ({
    ...item,
    lineTotalCents: item.unitPriceCents * item.quantity,
  }));
}

export class OrderRepository {
  constructor(private readonly pool: Pool) {}

  async create(userId: string, currency: string, items: NewOrderItem[]): Promise<Order> {
    const totalCents = items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const result = await client.query<OrderRow>(
        `INSERT INTO orders (user_id, total_cents, currency)
         VALUES ($1, $2, $3)
         RETURNING id, status, total_cents, currency, created_at`,
        [userId, totalCents, currency],
      );
      const row = result.rows[0]!;

      for (const item of items) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, sku, name, unit_price_cents, quantity)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [row.id, item.productId, item.sku, item.name, item.unitPriceCents, item.quantity],
        );
      }

      await client.query('COMMIT');

      return {
        id: row.id,
        status: row.status,
        totalCents: row.total_cents,
        currency: row.currency,
        createdAt: row.created_at,
        items: withLineTotals(items),
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}