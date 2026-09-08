import type { FastifyInstance } from 'fastify';
import { EmailAlreadyRegisteredError, type UserRepository } from '../users/repository.js';
import { decoy, hashPassword, verifyPassword } from '../users/password.js';

export const SESSION_COOKIE = 'session';

const credentialsBody = {
  type: 'object',
  required: ['email', 'password'],
  additionalProperties: false,
  properties: {
    email: { type: 'string', format: 'email', maxLength: 254 },
    password: { type: 'string', minLength: 10, maxLength: 128 },
  },
} as const;

interface Credentials {
  email: string;
  password: string;
}

export function registerAuthRoutes(
  app: FastifyInstance,
  repository: UserRepository,
  cookieSecure: boolean,
): void {
  const cookieOptions = {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: 'strict' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  };

  app.post<{ Body: Credentials }>(
    '/auth/register',
    { schema: { body: credentialsBody }, onRequest: [app.csrfProtection] },
    async (request, reply) => {
      const email = request.body.email.toLowerCase();

      try {
        const user = await repository.create(email, await hashPassword(request.body.password));
        const token = app.jwt.sign({ sub: user.id });
        return reply.setCookie(SESSION_COOKIE, token, cookieOptions).code(201).send({ user });
      } catch (error) {
        if (error instanceof EmailAlreadyRegisteredError) {
          return reply.code(409).send({ error: 'Conflict', message: 'Email is already registered' });
        }
        throw error;
      }
    },
  );

  app.post<{ Body: Credentials }>(
    '/auth/login',
    {
      schema: { body: credentialsBody },
      onRequest: [app.csrfProtection],
      config: { rateLimit: { max: 10, timeWindow: '15 minutes' } },
    },
    async (request, reply) => {
      const email = request.body.email.toLowerCase();
      const found = await repository.findByEmail(email);

      const valid = await verifyPassword(found?.passwordHash ?? (await decoy()), request.body.password);
      if (!found || !valid) {
        return reply.code(401).send({ error: 'Unauthorized', message: 'Invalid email or password' });
      }

      const token = app.jwt.sign({ sub: found.user.id });
      return reply.setCookie(SESSION_COOKIE, token, cookieOptions).send({ user: found.user });
    },
  );

    app.post('/auth/logout', { onRequest: [app.csrfProtection] }, async (_request, reply) => {
    return reply.clearCookie(SESSION_COOKIE, { path: '/' }).code(204).send();
  });

  app.get('/auth/me', { onRequest: [app.authenticate] }, async (request, reply) => {
    const user = await repository.findById(request.user.sub);
    if (!user) {
      return reply.code(401).send({ error: 'Unauthorized', message: 'Session is no longer valid' });
    }
    return { user };
  });
}