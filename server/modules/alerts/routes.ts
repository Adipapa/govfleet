import { Router } from 'express';
import { db } from '../../db/client.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { vehicleScope } from '../../middleware/scope.js';
import { writeAuditLog } from '../audit/audit.js';

const router = Router();
router.use(requireAuth);

router.get('/', requirePermission('alerts.read'), async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 25)));
    const offset = (page - 1) * limit;
    const severity = typeof req.query.severity === 'string' ? req.query.severity : null;
    const acknowledged = req.query.acknowledged === undefined ? null : req.query.acknowledged === 'true';
    const params: unknown[] = [];
    const conditions = [vehicleScope(req, 'v')];

    if (severity) {
      params.push(severity);
      conditions.push(`a.severity = $${params.length}`);
    }
    if (acknowledged !== null) {
      conditions.push(acknowledged ? 'a.acknowledged_at IS NOT NULL' : 'a.acknowledged_at IS NULL');
    }
    if (typeof req.query.vehicleId === 'string') {
      params.push(req.query.vehicleId);
      conditions.push(`a.vehicle_id = $${params.length}`);
    }

    const count = await db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM alerts a LEFT JOIN vehicles v ON v.id = a.vehicle_id WHERE ${conditions.join(' AND ')}`,
      params,
    );
    params.push(limit, offset);
    const rows = await db.query(
      `SELECT a.id, a.vehicle_id AS "vehicleId", a.driver_id AS "driverId", a.agency_id AS "agencyId",
              a.type, a.severity, a.title, a.message, a.occurred_at AS "occurredAt",
              a.acknowledged_at AS "acknowledgedAt", a.acknowledged_by AS "acknowledgedBy", a.metadata,
              v.registration_number AS "registrationNumber"
       FROM alerts a LEFT JOIN vehicles v ON v.id = a.vehicle_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY a.occurred_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    res.json({ data: rows.rows, pagination: { page, limit, total: Number(count.rows[0]?.count ?? 0) } });
  } catch (error) { next(error); }
});

router.get('/summary', requirePermission('alerts.read'), async (req, res, next) => {
  try {
    const scope = vehicleScope(req, 'v');
    const result = await db.query(
      `SELECT a.severity, COUNT(*)::int AS count
       FROM alerts a LEFT JOIN vehicles v ON v.id = a.vehicle_id
       WHERE ${scope} AND a.acknowledged_at IS NULL
       GROUP BY a.severity ORDER BY CASE a.severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END`,
    );
    res.json({ data: result.rows });
  } catch (error) { next(error); }
});

router.post('/:id/acknowledge', requirePermission('alerts.manage'), async (req, res, next) => {
  try {
    const scope = vehicleScope(req, 'v');
    const result = await db.query(
      `UPDATE alerts a SET acknowledged_at = now(), acknowledged_by = $1
       FROM vehicles v WHERE a.id = $2 AND a.vehicle_id = v.id AND ${scope}
       RETURNING a.id, a.acknowledged_at AS "acknowledgedAt", a.acknowledged_by AS "acknowledgedBy"`,
      [req.auth!.id, req.params.id],
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Alert not found' });
    await writeAuditLog(req, 'alert.acknowledge', 'alert', req.params.id, { acknowledged: true });
    res.json({ data: result.rows[0] });
  } catch (error) { next(error); }
});

export default router;
