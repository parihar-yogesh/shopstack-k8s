import Fastify, { type FastifyInstance } from 'fastify';

export function buildApp(logLevel: string): FastifyInstance {
  const app = Fastify({ logger: { level: logLevel } });

  app.get('/health', async () => ({ status: 'ok' }));

  return app;
}