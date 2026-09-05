import { Router } from 'express';
import { db } from '../../db/client.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { vehicleScope } from '../../middleware/scope.js';
import { writeAudit } from '../audit/audit.js';

export const maintenanceRouter = Router();
maintenanceRouter.use(requireAuth);

const SELECT = `mr.id, mr.vehicle_id, v.registration_number, mr.category, mr.status, mr.priority,
  mr.due_at, mr.due_odometer_km, mr.performed_at, mr.odometer_km, mr.estimated_cost, mr.actual_cost,
  mr.service_provider, mr.notes, mr.interval_km, mr.interval_days, mr.completed_by, mr.created_at, mr.updated_at`;

maintenanceRouter.get('/', requirePermission('fleet.read'), async (req, res, next) => {
  try {
    const scope = vehicleScope(req, 'v');
    const params: unknown[] = [...scope.params];
    const conditions = [scope.clause];
    if (req.query.status) { params.push(String(req.query.status)); conditions.push(`mr.status = $${params.length}`); }
    if (req.query.vehicleId) { params.push(String(req.query.vehicleId)); conditions.push(`mr.vehicle_id = $${params.length}`); }
    const limit = Math.min(Math.max(Number(req.query.limit ?? 100), 1), 500);
    params.push(limit);
    const result = await db.query(`SELECT ${SELECT} FROM maintenance_records mr JOIN vehicles v ON v.id=mr.vehicle_id WHERE ${conditions.join(' AND ')} ORDER BY COALESCE(mr.due_at, '9999-12-31') ASC, COALESCE(mr.due_odometer_km, 999999999) ASC LIMIT $${params.length}`, params);
    res.json({ data: result.rows });
  } catch (error) { next(error); }
});

maintenanceRouter.get('/summary', requirePermission('fleet.read'), async (req, res, next) => {
  try {
    const scope = vehicleScope(req, 'v');
    const result = await db.query(`SELECT
      COUNT(mr.id)::int AS total,
      COUNT(*) FILTER (WHERE mr.status='overdue')::int AS overdue,
      COUNT(*) FILTER (WHERE mr.status='due_soon')::int AS due_soon,
      COUNT(*) FILTER (WHERE mr.status='scheduled')::int AS scheduled,
      COUNT(*) FILTER (WHERE mr.status='in_progress')::int AS in_progress,
      COUNT(*) FILTER (WHERE mr.status='completed')::int AS completed,
      COALESCE(SUM(COALESCE(mr.actual_cost,mr.estimated_cost)),0) AS cost
      FROM maintenance_records mr JOIN vehicles v ON v.id=mr.vehicle_id WHERE ${scope.clause}`, scope.params);
    res.json({ data: result.rows[0] });
  } catch (error) { next(error); }
});

maintenanceRouter.post('/', requirePermission('fleet.write'), async (req, res, next) => {
  try {
    const scope = vehicleScope(req, 'v');
    const { vehicleId, category, dueAt, dueOdometerKm, estimatedCost, serviceProvider, notes, priority='medium', intervalKm, intervalDays } = req.body ?? {};
    if (!vehicleId || !category) return res.status(400).json({ error: 'vehicleId and category are required' });
    const vehicleParams = [...scope.params, vehicleId];
    const vehicle = await db.query(`SELECT v.id FROM vehicles v WHERE v.id=$${vehicleParams.length} AND ${scope.clause}`, vehicleParams);
    if (!vehicle.rows[0]) return res.status(404).json({ error: 'Vehicle not found' });
    if (dueAt && Number.isNaN(Date.parse(String(dueAt)))) return res.status(400).json({ error: 'dueAt must be a valid date' });
    const cost = estimatedCost == null ? null : Number(estimatedCost);
    if (cost != null && (!Number.isFinite(cost) || cost < 0)) return res.status(400).json({ error: 'estimatedCost must be zero or greater' });
    const result = await db.query(`INSERT INTO maintenance_records (vehicle_id,category,status,priority,due_at,due_odometer_km,estimated_cost,service_provider,notes,interval_km,interval_days,updated_at) VALUES ($1,'scheduled',$2,$3,$4,$5,$6,$7,$8,$9,$10,now()) RETURNING id`, [vehicleId, category, priority, dueAt ?? null, dueOdometerKm ?? null, cost, serviceProvider ?? null, notes ?? null, intervalKm ?? null, intervalDays ?? null]);
    const row = await db.query(`SELECT ${SELECT} FROM maintenance_records mr JOIN vehicles v ON v.id=mr.vehicle_id WHERE mr.id=$1`, [result.rows[0].id]);
    await writeAudit(req, 'maintenance.create', 'maintenance_record', result.rows[0].id, 'success');
    res.status(201).json({ data: row.rows[0] });
  } catch (error) { next(error); }
});

maintenanceRouter.patch('/:id/status', requirePermission('fleet.write'), async (req, res, next) => {
  try {
    const scope = vehicleScope(req, 'v');
    const { status } = req.body ?? {};
    const allowed = ['scheduled','in_progress','completed','cancelled','overdue','due_soon'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid maintenance status' });
    const params = [...scope.params, req.params.id, status];
    const result = await db.query(`UPDATE maintenance_records mr SET status=$${params.length}, performed_at=CASE WHEN $${params.length}='completed' THEN COALESCE(mr.performed_at,CURRENT_DATE) ELSE mr.performed_at END, completed_by=CASE WHEN $${params.length}='completed' THEN $${scope.params.length + 3} ELSE mr.completed_by END, updated_at=now() FROM vehicles v WHERE mr.vehicle_id=v.id AND mr.id=$${scope.params.length + 1} AND ${scope.clause} RETURNING mr.id`, [...scope.params, req.params.id, status, req.auth!.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Maintenance record not found' });
    await writeAudit(req, `maintenance.${status}`, 'maintenance_record', req.params.id, 'success');
    res.json({ data: result.rows[0] });
  } catch (error) { next(error); }
});

maintenanceRouter.patch('/:id/complete', requirePermission('fleet.write'), async (req, res, next) => {
  try {
    const scope = vehicleScope(req, 'v');
    const { actualCost, performedAt, odometerKm, notes } = req.body ?? {};
    const cost = actualCost == null ? null : Number(actualCost);
    if (cost != null && (!Number.isFinite(cost) || cost < 0)) return res.status(400).json({ error: 'actualCost must be zero or greater' });
    const params = [...scope.params, req.params.id, cost, performedAt ?? null, odometerKm ?? null, notes ?? null, req.auth!.id];
    const idIndex=scope.params.length+1;
    const result = await db.query(`UPDATE maintenance_records mr SET status='completed', actual_cost=COALESCE($${idIndex+1},mr.actual_cost), performed_at=COALESCE($${idIndex+2},mr.performed_at,CURRENT_DATE), odometer_km=COALESCE($${idIndex+3},mr.odometer_km), notes=COALESCE($${idIndex+4},mr.notes), completed_by=$${idIndex+5}, updated_at=now() FROM vehicles v WHERE mr.vehicle_id=v.id AND mr.id=$${idIndex} AND ${scope.clause} RETURNING mr.id`, params);
    if (!result.rows[0]) return res.status(404).json({ error: 'Maintenance record not found' });
    await writeAudit(req, 'maintenance.complete', 'maintenance_record', req.params.id, 'success');
    res.json({ data: result.rows[0] });
  } catch (error) { next(error); }
});

export default maintenanceRouter;
