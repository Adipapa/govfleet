import bcrypt from 'bcryptjs';
import { db, closeDb } from './client.js';

async function bootstrapAdmin() {
  const username = process.env.BOOTSTRAP_ADMIN_USERNAME?.trim();
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const fullName = process.env.BOOTSTRAP_ADMIN_NAME?.trim();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

  if (!username || !email || !fullName || !password) {
    throw new Error('Set BOOTSTRAP_ADMIN_USERNAME, BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_NAME and BOOTSTRAP_ADMIN_PASSWORD');
  }
  if (password.length < 14) throw new Error('Bootstrap password must be at least 14 characters');

  const passwordHash = await bcrypt.hash(password, 12);
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const user = await client.query<{ id: string }>(
      `INSERT INTO users (username, email, password_hash, full_name, status)
       VALUES ($1,$2,$3,$4,'active')
       ON CONFLICT (username) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash,
         full_name = EXCLUDED.full_name, status = 'active', updated_at = now()
       RETURNING id`,
      [username, email, passwordHash, fullName],
    );
    await client.query(
      `INSERT INTO user_roles (user_id, role_id)
       SELECT $1, id FROM roles WHERE name = 'super_admin'
       ON CONFLICT DO NOTHING`,
      [user.rows[0].id],
    );
    await client.query('COMMIT');
    console.log(`Bootstrap administrator ready: ${username}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

bootstrapAdmin()
  .catch((error) => { console.error('Admin bootstrap failed', error); process.exitCode = 1; })
  .finally(async () => { await closeDb(); });
