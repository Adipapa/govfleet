import { Router } from 'express';
import { db } from '../../db/client.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { vehicleScope } from '../../middleware/scope.js';
import { writeAudit } from '../audit/audit.js';

const router = Router();
router.use(requireAuth);

router.get('/', requirePermission('alerts.read'), async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 25)));
    const offset = (page - 1) * limit;
    const severity = typeof req.query.severity === 'string' ? req.query.severity : null;
    const acknowledged = req.query.acknowledged === undefined ? null : req.query.acknowledged === 'true';
    const scope = vehicleScope(req, 'v');
    const params: unknown[] = [...scope.params];
    const conditions = [scope.clause];
    if (severity) { params.push(severity); conditions.push(`a.severity = $${params.length}`); }
    if (acknowledged !== null) conditions.push(acknowledged ? 'a.acknowledged_at IS NOT NULL' : 'a.acknowledged_at IS NULL');
    if (typeof req.query.vehicleId === 'string') { params.push(req.query.vehicleId); conditions.push(`a.vehicle_id = $${params.length}`); }
    const where = conditions.join(' AND ');
    const count = await db.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM alerts a LEFT JOIN vehicles v ON v.id = a.vehicle_id WHERE ${where}`, params);
    const dataParams = [...params, limit, offset];
    const rows = await db.query(`SELECT a.id, a.vehicle_id AS "vehicleId", a.driver_id AS "driverId", a.agency_id AS "agencyId", a.type, a.severity, a.title, a.message, a.occurred_at AS "occurredAt", a.acknowledged_at AS "acknowledgedAt", a.acknowledged_by AS "acknowledgedBy", a.metadata, v.registration_number AS "registrationNumber" FROM alerts a LEFT JOIN vehicles v ON v.id = a.vehicle_id WHERE ${where} ORDER BY a.occurred_at DESC LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`, dataParams);
    res.json({ data: rows.rows, pagination: { page, limit, total: Number(count.rows[0]?.count ?? 0) } });
  } catch (error) { next(error); }
});

router.get('/summary', requirePermission('alerts.read'), async (req, res, next) => {
  try {
    const scope = vehicleScope(req, 'v');
    const result = await db.query(`SELECT a.severity, COUNT(*)::int AS count FROM alerts a LEFT JOIN vehicles v ON v.id = a.vehicle_id WHERE ${scope.clause} AND a.acknowledged_at IS NULL GROUP BY a.severity`, scope.params);
    const data = { total: 0, unacknowledged: 0, critical: 0, high: 0, medium: 0, low: 0 };
    for (const row of result.rows as Array<{ severity: keyof typeof data; count: number }>) {
      const count = Number(row.count);
      if (row.severity in data) data[row.severity] = count;
      data.total += count; data.unacknowledged += count;
    }
    res.json({ data });
  } catch (error) { next(error); }
});

router.post('/:id/acknowledge', requirePermission('alerts.manage'), async (req, res, next) => {
  try {
    const scope = vehicleScope(req, 'v');
    const params = [req.auth!.id, req.params.id, ...scope.params];
    const result = await db.query(`UPDATE alerts a SET acknowledged_at = now(), acknowledged_by = $1 FROM vehicles v WHERE a.id = $2 AND a.vehicle_id = v.id AND ${scope.clause.replace(/\$(\d+)/g, (_, n) => `$${Number(n) + 2}`)} RETURNING a.id, a.acknowledged_at AS "acknowledgedAt", a.acknowledged_by AS "acknowledgedBy"`, params);
    if (!result.rows[0]) return res.status(404).json({ error: 'Alert not found' });
    await writeAudit(req, 'alert.acknowledge', 'alert', req.params.id, 'success', undefined, { acknowledged: true });
    res.json({ data: result.rows[0] });
  } catch (error) { next(error); }
});

export default router;
