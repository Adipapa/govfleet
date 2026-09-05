import { Router } from 'express';
import { db } from '../../db/client.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';

export const auditRouter = Router();
auditRouter.use(requireAuth);

auditRouter.get('/', requirePermission('audit.read'), async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit ?? 100), 1), 500);
    const params: unknown[] = [limit];
    const filters: string[] = [];
    if (!req.auth!.roles.includes('super_admin')) {
      params.push(req.auth!.id); filters.push(`al.user_id=$${params.length}`);
    } else if (req.query.userId) {
      params.push(String(req.query.userId)); filters.push(`al.user_id=$${params.length}`);
    }
    if (req.query.action) { params.push(`%${String(req.query.action)}%`); filters.push(`al.action ILIKE $${params.length}`); }
    if (req.query.resourceType) { params.push(String(req.query.resourceType)); filters.push(`al.resource_type=$${params.length}`); }
    if (req.query.result) { params.push(String(req.query.result)); filters.push(`al.result=$${params.length}`); }
    const result = await db.query(
      `SELECT al.id, al.user_id, u.username, u.full_name, al.session_id, al.action,
              al.resource_type, al.resource_id, al.result, al.ip_address, al.user_agent,
              al.details, al.reason, al.metadata, al.created_at
       FROM audit_logs al LEFT JOIN users u ON u.id=al.user_id
       ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
       ORDER BY al.created_at DESC LIMIT $1`, params,
    );
    res.json({ data: result.rows });
  } catch (error) { next(error); }
});

export default auditRouter;
