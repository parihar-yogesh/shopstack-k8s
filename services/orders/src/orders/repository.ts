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

interface OrderItemRow {
  order_id: string;
  product_id: string;
  sku: string;
  name: string;
  unit_price_cents: number;
  quantity: number;
}

function toItem(row: OrderItemRow): OrderItem {
  return {
    productId: row.product_id,
    sku: row.sku,
    name: row.name,
    unitPriceCents: row.unit_price_cents,
    quantity: row.quantity,
    lineTotalCents: row.unit_price_cents * row.quantity,
  };
}

function withLineTotals(items: NewOrderItem[]): OrderItem[] {
  return items.map((item) => ({
    ...item,
    lineTotalCents: item.unitPriceCents * item.quantity,
  }));
}

export class OrderRepository {
  constructor(private readonly pool: Pool) {}

  private async itemsByOrder(orderIds: string[]): Promise<Map<string, OrderItem[]>> {
    const grouped = new Map<string, OrderItem[]>(orderIds.map((id) => [id, []]));
    if (orderIds.length === 0) {
      return grouped;
    }

    const result = await this.pool.query<OrderItemRow>(
      `SELECT order_id, product_id, sku, name, unit_price_cents, quantity
       FROM order_items
       WHERE order_id = ANY($1::uuid[])
       ORDER BY id`,
      [orderIds],
    );

    for (const row of result.rows) {
      grouped.get(row.order_id)?.push(toItem(row));
    }
    return grouped;
  }

  async findByUser(userId: string, limit: number, offset: number): Promise<Order[]> {
    const result = await this.pool.query<OrderRow>(
      `SELECT id, status, total_cents, currency, created_at
       FROM orders
       WHERE user_id = $1
       ORDER BY created_at DESC, id DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    );

    const items = await this.itemsByOrder(result.rows.map((row) => row.id));

    return result.rows.map((row) => ({
      id: row.id,
      status: row.status,
      totalCents: row.total_cents,
      currency: row.currency,
      createdAt: row.created_at,
      items: items.get(row.id) ?? [],
    }));
  }

  async countByUser(userId: string): Promise<number> {
    const result = await this.pool.query<{ count: string }>(
      'SELECT count(*) AS count FROM orders WHERE user_id = $1',
      [userId],
    );
    return Number(result.rows[0]?.count ?? 0);
  }

  async findByIdForUser(orderId: string, userId: string): Promise<Order | null> {
    const result = await this.pool.query<OrderRow>(
      `SELECT id, status, total_cents, currency, created_at
       FROM orders
       WHERE id = $1 AND user_id = $2`,
      [orderId, userId],
    );
    const row = result.rows[0];
    if (!row) {
      return null;
    }

    const items = await this.itemsByOrder([row.id]);

    return {
      id: row.id,
      status: row.status,
      totalCents: row.total_cents,
      currency: row.currency,
      createdAt: row.created_at,
      items: items.get(row.id) ?? [],
    };
  }

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