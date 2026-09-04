import { Router } from 'express';
import { db } from '../../db/client.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { vehicleScope } from '../../middleware/scope.js';
import { writeAudit } from '../audit/audit.js';

export const tripsRouter = Router();
tripsRouter.use(requireAuth);

function pagination(req: { query: Record<string, unknown> }) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
  return { page, limit, offset: (page - 1) * limit };
}

tripsRouter.get('/', requirePermission('fleet.read'), async (req, res, next) => {
  try {
    const scope = vehicleScope(req);
    const { page, limit, offset } = pagination(req);
    const params: unknown[] = [...scope.params];
    const filters: string[] = [scope.clause];
    if (typeof req.query.vehicleId === 'string' && req.query.vehicleId) {
      params.push(req.query.vehicleId); filters.push(`t.vehicle_id = $${params.length}`);
    }
    if (typeof req.query.from === 'string' && !Number.isNaN(Date.parse(req.query.from))) {
      params.push(new Date(req.query.from)); filters.push(`t.started_at >= $${params.length}`);
    }
    if (typeof req.query.to === 'string' && !Number.isNaN(Date.parse(req.query.to))) {
      params.push(new Date(req.query.to)); filters.push(`t.started_at <= $${params.length}`);
    }
    if (req.query.status === 'open') filters.push('t.ended_at IS NULL');
    if (req.query.status === 'completed') filters.push('t.ended_at IS NOT NULL');

    const count = await db.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM trips t JOIN vehicles v ON v.id=t.vehicle_id WHERE ${filters.join(' AND ')}`, params);
    params.push(limit, offset);
    const result = await db.query(`
      SELECT t.id, t.vehicle_id, t.driver_id, t.started_at, t.ended_at,
             t.start_lat, t.start_lng, t.end_lat, t.end_lng,
             t.distance_km, t.duration_seconds, t.idle_seconds,
             t.max_speed_kmh, t.average_speed_kmh, t.fuel_consumed_litres,
             v.registration_number, v.asset_number,
             dr.full_name AS driver_name
      FROM trips t
      JOIN vehicles v ON v.id=t.vehicle_id
      LEFT JOIN drivers dr ON dr.id=t.driver_id
      WHERE ${filters.join(' AND ')}
      ORDER BY t.started_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
    const total = Number(count.rows[0]?.count || 0);
    res.json({ data: result.rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
});

tripsRouter.get('/:id', requirePermission('fleet.read'), async (req, res, next) => {
  try {
    const scope = vehicleScope(req);
    const params = [...scope.params, req.params.id];
    const result = await db.query(`
      SELECT t.id, t.vehicle_id, t.driver_id, t.started_at, t.ended_at,
             t.start_lat, t.start_lng, t.end_lat, t.end_lng,
             t.distance_km, t.duration_seconds, t.idle_seconds,
             t.max_speed_kmh, t.average_speed_kmh, t.fuel_consumed_litres,
             v.registration_number, v.asset_number, dr.full_name AS driver_name
      FROM trips t JOIN vehicles v ON v.id=t.vehicle_id
      LEFT JOIN drivers dr ON dr.id=t.driver_id
      WHERE t.id=$${params.length} AND ${scope.clause}`, params);
    if (!result.rows[0]) return res.status(404).json({ error: 'Trip not found' });
    const points = await db.query(`
      SELECT id, telemetry_id, recorded_at, latitude, longitude, speed_kmh, ignition, fuel_litres
      FROM trip_points WHERE trip_id=$1 ORDER BY recorded_at ASC`, [req.params.id]);
    res.json({ data: { ...result.rows[0], points: points.rows } });
  } catch (error) { next(error); }
});

tripsRouter.post('/:id/close', requirePermission('fleet.write'), async (req, res, next) => {
  try {
    const scope = vehicleScope(req);
    const params = [...scope.params, req.params.id];
    const result = await db.query(`
      UPDATE trips t SET ended_at = COALESCE(ended_at, now())
      FROM vehicles v WHERE t.vehicle_id=v.id AND t.id=$${params.length}
      AND ${scope.clause} AND t.ended_at IS NULL RETURNING t.*`, params);
    if (!result.rows[0]) return res.status(404).json({ error: 'Open trip not found' });
    await writeAudit(req, 'trip.close', 'trip', req.params.id, 'success');
    res.json({ data: result.rows[0] });
  } catch (error) { next(error); }
});

export default tripsRouter;
