import Fastify, { type FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { ProductRepository } from './products/repository.js';
import { registerProductRoutes } from './products/routes.js';

export function buildApp(logLevel: string, pool: Pool): FastifyInstance {
  const app = Fastify({ logger: { level: logLevel } });

  app.get('/health', async () => ({ status: 'ok' }));

  app.get('/ready', async (_request, reply) => {
    try {
      await pool.query('SELECT 1');
      return { status: 'ready' };
    } catch (error) {
      app.log.error(error, 'readiness check failed');
      return reply.code(503).send({ status: 'not ready' });
    }
  });

  registerProductRoutes(app, new ProductRepository(pool));

  return app;
}