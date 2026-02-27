import sql from 'mssql';
import { env } from '../config/env';

const match = env.DATABASE_URL.match(/^sqlserver:\/\/(.+?):(.+?)@([^:;]+):?(\d+)?;database=([^;]+);/);
if (!match) {
  throw new Error('Invalid DATABASE_URL format');
}

const user = match[1];
const password = match[2];
const server = match[3];
const portRaw = match[4];
const database = match[5];

if (!user || !password || !server || !database) {
  throw new Error('DATABASE_URL missing required values');
}

const config: sql.config = {
  user,
  password,
  server,
  port: Number(portRaw || 1433),
  database,
  options: {
    encrypt: true,
    trustServerCertificate: false,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let poolPromise: Promise<sql.ConnectionPool> | null = null;

export function getPool() {
  if (!poolPromise) {
    poolPromise = sql.connect(config);
  }
  return poolPromise;
}

export { sql };
