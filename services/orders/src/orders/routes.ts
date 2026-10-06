import type { FastifyInstance } from 'fastify';
import { CatalogUnavailableError, type CatalogProduct, type ProductCatalog } from '../catalog/client.js';
import type { NewOrderItem, OrderRepository } from './repository.js';

const placeOrderBody = {
  type: 'object',
  required: ['items'],
  additionalProperties: false,
  properties: {
    items: {
      type: 'array',
      minItems: 1,
      maxItems: 50,
      items: {
        type: 'object',
        required: ['productId', 'quantity'],
        additionalProperties: false,
        properties: {
          productId: { type: 'string', pattern: '^[0-9]+$' },
          quantity: { type: 'integer', minimum: 1, maximum: 99 },
        },
      },
    },
  },
} as const;

const historyQuerystring = {
  type: 'object',
  additionalProperties: false,
  properties: {
    limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
    offset: { type: 'integer', minimum: 0, default: 0 },
  },
} as const;

const orderIdParams = {
  type: 'object',
  required: ['id'],
  additionalProperties: false,
  properties: {
    id: { type: 'string', format: 'uuid' },
  },
} as const;

interface PlaceOrderBody {
  items: { productId: string; quantity: number }[];
}

interface HistoryQuery {
  limit: number;
  offset: number;
}

interface OrderIdParams {
  id: string;
}

interface Line {
  product: CatalogProduct;
  quantity: number;
}

export function registerOrderRoutes(
  app: FastifyInstance,
  repository: OrderRepository,
  catalog: ProductCatalog,
): void {
  app.post<{ Body: PlaceOrderBody }>(
    '/orders',
    {
      schema: { body: placeOrderBody },
      onRequest: [app.csrfProtection, app.authenticate],
    },
    async (request, reply) => {
      const requested = request.body.items;
      const badRequest = (message: string) =>
        reply.code(400).send({ error: 'Bad Request', message });

      const ids = requested.map((item) => item.productId);
      if (new Set(ids).size !== ids.length) {
        return badRequest('Each product may appear only once; use quantity instead');
      }

      let products: (CatalogProduct | null)[];
      try {
        products = await Promise.all(requested.map((item) => catalog.findById(item.productId)));
      } catch (error) {
        if (error instanceof CatalogUnavailableError) {
          app.log.error(error, 'catalog lookup failed');
          return reply.code(503).send({
            error: 'Service Unavailable',
            message: 'Cannot place orders right now, please try again shortly',
          });
        }
        throw error;
      }

      const lines: Line[] = [];
      for (const [index, product] of products.entries()) {
        const item = requested[index]!;
        if (!product) {
          return badRequest(`Product ${item.productId} does not exist`);
        }
        lines.push({ product, quantity: item.quantity });
      }

      const unavailable = lines.filter(({ product, quantity }) => product.stock < quantity);
      if (unavailable.length > 0) {
        return reply.code(409).send({
          error: 'Conflict',
          message: 'Some items are not available in the requested quantity',
          items: unavailable.map(({ product, quantity }) => ({
            productId: product.id,
            requested: quantity,
            available: product.stock,
          })),
        });
      }

      const currencies = new Set(lines.map(({ product }) => product.currency));
      if (currencies.size > 1) {
        return badRequest('All items in an order must share one currency');
      }

      const items: NewOrderItem[] = lines.map(({ product, quantity }) => ({
        productId: product.id,
        sku: product.sku,
        name: product.name,
        unitPriceCents: product.priceCents,
        quantity,
      }));

      const order = await repository.create(request.user.sub, lines[0]!.product.currency, items);

      return reply.code(201).send({ order });
    },
  );

  app.get<{ Querystring: HistoryQuery }>(
    '/orders',
    {
      schema: { querystring: historyQuerystring },
      onRequest: [app.authenticate],
    },
    async (request) => {
      const { limit, offset } = request.query;
      const [items, total] = await Promise.all([
        repository.findByUser(request.user.sub, limit, offset),
        repository.countByUser(request.user.sub),
      ]);
      return { items, total, limit, offset };
    },
  );

  app.get<{ Params: OrderIdParams }>(
    '/orders/:id',
    {
      schema: { params: orderIdParams },
      onRequest: [app.authenticate],
    },
    async (request, reply) => {
      const order = await repository.findByIdForUser(request.params.id, request.user.sub);
      if (!order) {
        return reply.code(404).send({ error: 'Not Found', message: 'Order does not exist' });
      }
      return { order };
    },
  );
}