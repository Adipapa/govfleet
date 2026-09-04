import pg from 'pg';
import { env } from '../config/env.js';

const { Pool } = pg;

export const db = new Pool({
  connectionString: env.databaseUrl,
  max: Number(process.env.DB_POOL_MAX ?? 20),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

export async function closeDb(): Promise<void> {
  await db.end();
}
