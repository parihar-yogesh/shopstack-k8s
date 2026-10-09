import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { createPool } from './db.js';

const config = loadConfig();
const pool = createPool(config.databaseUrl);
const app = buildApp(config.logLevel, pool);

let shuttingDown = false;

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  app.log.info({ signal }, 'shutdown requested');

  // Load balancers may still route requests here for a moment after the signal
  // arrives, so keep serving before closing. Zero outside Kubernetes.
  if (config.shutdownDelayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, config.shutdownDelayMs));
  }

  try {
    await app.close();
    await pool.end();
    app.log.info('shutdown complete');
    process.exit(0);
  } catch (error) {
    app.log.error(error, 'shutdown failed');
    process.exit(1);
  }
}

process.once('SIGTERM', (signal) => void shutdown(signal));
process.once('SIGINT', (signal) => void shutdown(signal));

try {
  await app.listen({ port: config.port, host: config.host });
} catch (error) {
  app.log.error(error);
  await pool.end();
  process.exit(1);
}