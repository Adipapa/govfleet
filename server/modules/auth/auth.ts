import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../../db/client.js';
import { env } from '../../config/env.js';

export type AuthUser = {
  id: string;
  username: string;
  email: string;
  fullName: string;
  agencyId: string | null;
  departmentId: string | null;
  driverId: string | null;
  sessionId: string;
  roles: string[];
  permissions: string[];
};

const SESSION_DAYS = 8;

function tokenHash(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function signToken(userId: string, sessionId: string) {
  return jwt.sign({ sub: userId, sid: sessionId }, env.jwtSecret, { expiresIn: `${SESSION_DAYS}d` });
}

async function loadUser(userId: string, sessionId: string): Promise<AuthUser | null> {
  const result = await db.query<{
    id: string; username: string; email: string; full_name: string;
    agency_id: string | null; department_id: string | null; driver_id: string | null; status: string;
  }>(`SELECT id, username, email, full_name, agency_id, department_id, driver_id, status FROM users WHERE id = $1`, [userId]);
  const user = result.rows[0];
  if (!user || user.status !== 'active') return null;

  const roles = await db.query<{ name: string }>(
    `SELECT r.name FROM roles r JOIN user_roles ur ON ur.role_id = r.id WHERE ur.user_id = $1 ORDER BY r.name`, [user.id]);
  const permissions = await db.query<{ name: string }>(
    `SELECT DISTINCT p.name FROM permissions p
     JOIN role_permissions rp ON rp.permission_id = p.id
     JOIN user_roles ur ON ur.role_id = rp.role_id WHERE ur.user_id = $1 ORDER BY p.name`, [user.id]);

  return {
    id: user.id, username: user.username, email: user.email, fullName: user.full_name,
    agencyId: user.agency_id, departmentId: user.department_id, driverId: user.driver_id,
    sessionId,
    roles: roles.rows.map((r) => r.name), permissions: permissions.rows.map((p) => p.name),
  };
}

export async function authenticate(usernameOrEmail: string, password: string, ip?: string, userAgent?: string) {
  const result = await db.query<{
    id: string; username: string; email: string; password_hash: string; status: string;
  }>(`SELECT id, username, email, password_hash, status
      FROM users WHERE lower(username) = lower($1) OR lower(email) = lower($1) LIMIT 1`, [usernameOrEmail]);

  const user = result.rows[0];
  if (!user || user.status !== 'active' || !(await bcrypt.compare(password, user.password_hash))) return null;

  const sessionId = crypto.randomUUID();
  const token = signToken(user.id, sessionId);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);

  await db.query(`INSERT INTO sessions(id, user_id, token_hash, expires_at, ip_address, user_agent)
                  VALUES ($1,$2,$3,$4,$5,$6)`, [sessionId, user.id, tokenHash(token), expiresAt, ip ?? null, userAgent ?? null]);
  await db.query('UPDATE users SET last_login_at = now() WHERE id = $1', [user.id]);

  const authUser = await loadUser(user.id, sessionId);
  if (!authUser) return null;
  return { token, user: authUser };
}

export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const payload = jwt.verify(token, env.jwtSecret) as { sub?: string; sid?: string };
    if (!payload.sub || !payload.sid) return null;
    const session = await db.query<{ user_id: string }>(
      `SELECT user_id FROM sessions WHERE id = $1 AND token_hash = $2 AND revoked_at IS NULL AND expires_at > now()`,
      [payload.sid, tokenHash(token)],
    );
    if (!session.rows[0] || session.rows[0].user_id !== payload.sub) return null;
    await db.query('UPDATE sessions SET last_seen_at = now() WHERE id = $1', [payload.sid]);
    return loadUser(payload.sub, payload.sid);
  } catch {
    return null;
  }
}

export async function revokeToken(token: string) {
  await db.query('UPDATE sessions SET revoked_at = now() WHERE token_hash = $1', [tokenHash(token)]);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}
