import crypto from 'node:crypto';
import { db } from '../../db/client.js';

function digest(token: string, salt: Buffer) {
  return crypto.scryptSync(token, salt, 32).toString('hex');
}

export function generateDeviceToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export async function issueDeviceToken(deviceId: string) {
  const token = generateDeviceToken();
  const salt = crypto.randomBytes(16);
  const hash = digest(token, salt);

  await db.query('UPDATE device_credentials SET active = FALSE WHERE device_id = $1 AND active = TRUE', [deviceId]);
  await db.query(`INSERT INTO device_credentials(device_id, token_hash, token_salt) VALUES ($1,$2,$3)`, [deviceId, hash, salt.toString('base64')]);
  return token;
}

export async function authenticateDevice(deviceIdentifier: string, token: string) {
  const result = await db.query<{ id: string; device_id: string; token_hash: string; token_salt: string }>(
    `SELECT c.id, c.device_id, c.token_hash, c.token_salt
     FROM device_credentials c JOIN devices d ON d.id = c.device_id
     WHERE d.device_identifier = $1 AND c.active = TRUE
     ORDER BY c.created_at DESC LIMIT 1`, [deviceIdentifier],
  );
  const credential = result.rows[0];
  if (!credential) return null;

  const salt = Buffer.from(credential.token_salt, 'base64');
  const actual = Buffer.from(digest(token, salt), 'hex');
  const expected = Buffer.from(credential.token_hash, 'hex');
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;

  await db.query('UPDATE device_credentials SET last_used_at = now() WHERE id = $1', [credential.id]);
  return credential.device_id;
}
