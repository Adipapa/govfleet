import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, closeDb } from './client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, 'migrations');
const initialSchemaPath = path.join(__dirname, 'schema.sql');

async function applyMigration(version: string, sql: string) {
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
}

async function migrate() {
  await db.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);

  const applied = new Set<string>(
    (await db.query<{ version: string }>('SELECT version FROM schema_migrations ORDER BY version')).rows.map((row) => row.version),
  );

  if (!applied.has('001_initial_schema')) {
    await applyMigration('001_initial_schema', await fs.readFile(initialSchemaPath, 'utf8'));
  }

  const files = (await fs.readdir(migrationsDir))
    .filter((file) => /^\d+_.+\.sql$/.test(file))
    .sort();

  for (const file of files) {
    const version = file.replace(/\.sql$/, '');
    if (applied.has(version)) continue;
    await applyMigration(version, await fs.readFile(path.join(migrationsDir, file), 'utf8'));
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
