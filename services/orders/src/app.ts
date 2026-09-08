import cookie from '@fastify/cookie';
import csrf from '@fastify/csrf-protection';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import type { Pool } from 'pg';
import { registerAuthRoutes, SESSION_COOKIE } from './auth/routes.js';
import { UserRepository } from './users/repository.js';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string };
    user: { sub: string };
  }
}

export interface AppOptions {
  logLevel: string;
  pool: Pool;
  jwtSecret: string;
  cookieSecure: boolean;
}

export async function buildApp(options: AppOptions): Promise<FastifyInstance> {
  const app = Fastify({ logger: { level: options.logLevel } });

  await app.register(cookie);
  await app.register(jwt, {
    secret: options.jwtSecret,
    cookie: { cookieName: SESSION_COOKIE, signed: false },
  });
  await app.register(rateLimit, { global: false });
  await app.register(csrf, {
    sessionPlugin: '@fastify/cookie',
    cookieKey: 'csrf-secret',
    cookieOpts: {
      httpOnly: true,
      secure: options.cookieSecure,
      sameSite: 'strict',
      path: '/',
    },
  });

  app.get('/auth/csrf-token', async (_request, reply) => ({ csrfToken: reply.generateCsrf() }));

  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      await reply.code(401).send({ error: 'Unauthorized', message: 'Authentication required' });
    }
  });

  app.get('/health', async () => ({ status: 'ok' }));

  app.get('/ready', async (_request, reply) => {
    try {
      await options.pool.query('SELECT 1');
      return { status: 'ready' };
    } catch (error) {
      app.log.error(error, 'readiness check failed');
      return reply.code(503).send({ status: 'not ready' });
    }
  });

  registerAuthRoutes(app, new UserRepository(options.pool), options.cookieSecure);

  return app;
}