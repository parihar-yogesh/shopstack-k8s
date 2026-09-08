export interface Config {
  port: number;
  host: string;
  logLevel: string;
  databaseUrl: string;
  jwtSecret: string;
  cookieSecure: boolean;
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function loadConfig(): Config {
  return {
    port: Number(process.env.PORT ?? 3001),
    host: process.env.HOST ?? '127.0.0.1',
    logLevel: process.env.LOG_LEVEL ?? 'info',
    databaseUrl: required('DATABASE_URL'),
    jwtSecret: required('JWT_SECRET'),
    cookieSecure: process.env.COOKIE_SECURE !== 'false',
  };
}