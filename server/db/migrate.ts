import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, closeDb } from './client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, 'schema.sql');

async function migrate() {
  await db.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);

  const version = '001_initial_schema';
  const exists = await db.query('SELECT 1 FROM schema_migrations WHERE version = $1', [version]);
  if (exists.rowCount === 0) {
    const sql = await fs.readFile(schemaPath, 'utf8');
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations(version) VALUES ($1)', [version]);
      await client.query('COMMIT');
      console.log(`Applied migration ${version}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } else {
    console.log(`Migration ${version} already applied`);
  }
}

migrate()
  .catch((error) => {
    console.error('Migration failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
