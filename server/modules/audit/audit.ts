import type { Request } from 'express';
import { db } from '../../db/client.js';

export async function writeAudit(
  req: Request,
  action: string,
  resourceType?: string,
  resourceId?: string,
  result = 'success',
  reason?: string,
  metadata: Record<string, unknown> = {},
) {
  await db.query(
    `INSERT INTO audit_logs(user_id, session_id, action, resource_type, resource_id, result, ip_address, user_agent, details, reason, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [
      req.auth?.id ?? null,
      null,
      action,
      resourceType ?? null,
      resourceId ?? null,
      result,
      req.ip || null,
      req.get('user-agent') ?? null,
      JSON.stringify(metadata),
      reason ?? null,
      JSON.stringify(metadata),
    ],
  );
}
