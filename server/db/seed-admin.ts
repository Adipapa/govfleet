import { db, closeDb } from './client.js';
import { hashPassword } from '../modules/auth/auth.js';

async function seedAdmin() {
  const username = process.env.ADMIN_USERNAME;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const fullName = process.env.ADMIN_FULL_NAME ?? 'QTS Platform Administrator';

  if (!username || !email || !password) {
    throw new Error('ADMIN_USERNAME, ADMIN_EMAIL and ADMIN_PASSWORD are required for admin seeding');
  }
  if (password.length < 14) throw new Error('ADMIN_PASSWORD must be at least 14 characters');

  const passwordHash = await hashPassword(password);
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const userResult = await client.query<{ id: string }>(
      `INSERT INTO users(username, email, password_hash, full_name)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (username) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, full_name = EXCLUDED.full_name, status = 'active'
       RETURNING id`,
      [username, email, passwordHash, fullName],
    );
    const role = await client.query<{ id: string }>('SELECT id FROM roles WHERE name = $1', ['super_admin']);
    if (!role.rows[0]) throw new Error('super_admin role not found; run migrations first');
    await client.query('DELETE FROM user_roles WHERE user_id = $1', [userResult.rows[0].id]);
    await client.query('INSERT INTO user_roles(user_id, role_id) VALUES ($1,$2)', [userResult.rows[0].id, role.rows[0].id]);
    await client.query('COMMIT');
    console.log(`Seeded administrator ${username}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

seedAdmin()
  .catch((error) => {
    console.error('Admin seed failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
