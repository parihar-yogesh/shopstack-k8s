import type { FastifyInstance } from 'fastify';
import type { ProductRepository } from './repository.js';

const listQuerystring = {
  type: 'object',
  additionalProperties: false,
  properties: {
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    offset: { type: 'integer', minimum: 0, default: 0 },
  },
} as const;

const idParams = {
  type: 'object',
  required: ['id'],
  additionalProperties: false,
  properties: {
    id: { type: 'string', pattern: '^[0-9]+$' },
  },
} as const;

interface ListQuery {
  limit: number;
  offset: number;
}

interface IdParams {
  id: string;
}

export function registerProductRoutes(app: FastifyInstance, repository: ProductRepository): void {
  app.get<{ Querystring: ListQuery }>(
    '/products',
    { schema: { querystring: listQuerystring } },
    async (request) => {
      const { limit, offset } = request.query;
      const [items, total] = await Promise.all([
        repository.findAll(limit, offset),
        repository.countAll(),
      ]);
      return { items, total, limit, offset };
    },
  );

  app.get<{ Params: IdParams }>(
    '/products/:id',
    { schema: { params: idParams } },
    async (request, reply) => {
      const product = await repository.findById(request.params.id);
      if (!product) {
        return reply.code(404).send({ error: 'Not Found', message: 'Product does not exist' });
      }
      return product;
    },
  );
}