import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { createPool } from './db.js';

const config = loadConfig();
const pool = createPool(config.databaseUrl);
const app = await buildApp({
  logLevel: config.logLevel,
  pool,
  jwtSecret: config.jwtSecret,
  cookieSecure: config.cookieSecure,
});

try {
  await app.listen({ port: config.port, host: config.host });
} catch (error) {
  app.log.error(error);
  await pool.end();
  process.exit(1);
}