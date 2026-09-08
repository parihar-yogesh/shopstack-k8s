export interface Config {
  port: number;
  host: string;
  logLevel: string;
}

export function loadConfig(): Config {
  return {
    port: Number(process.env.PORT ?? 3000),
    host: process.env.HOST ?? '127.0.0.1',
    logLevel: process.env.LOG_LEVEL ?? 'info',
  };
}