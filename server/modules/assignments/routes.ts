import { Router } from 'express';
import { db } from '../../db/client.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { vehicleScope } from '../../middleware/scope.js';
import { writeAudit } from '../audit/audit.js';

export const assignmentsRouter = Router();
assignmentsRouter.use(requireAuth);

function validDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

assignmentsRouter.get('/vehicles/:vehicleId', requirePermission('fleet.read'), async (req, res, next) => {
  try {
    const scope = vehicleScope(req);
    const params = [...scope.params, req.params.vehicleId];
    const result = await db.query(`
      SELECT vda.id, vda.vehicle_id, vda.driver_id, vda.starts_at, vda.ends_at,
             vda.assigned_by, vda.starts_at <= now() AS started,
             (vda.ends_at IS NULL OR vda.ends_at > now()) AS active,
             dr.employee_number, dr.full_name, dr.phone, dr.licence_number, dr.licence_expiry
      FROM vehicle_driver_assignments vda
      JOIN drivers dr ON dr.id = vda.driver_id
      JOIN vehicles v ON v.id = vda.vehicle_id
      WHERE vda.vehicle_id = $${params.length} AND ${scope.clause}
      ORDER BY vda.starts_at DESC`, params);
    res.json({ data: result.rows });
  } catch (error) { next(error); }
});

assignmentsRouter.post('/vehicles/:vehicleId/driver', requirePermission('fleet.write'), async (req, res, next) => {
  const client = await db.connect();
  try {
    const scope = vehicleScope(req);
    const b = req.body ?? {};
    if (typeof b.driverId !== 'string' || !b.driverId.trim()) return res.status(400).json({ error: 'driverId is required' });
    if (b.startsAt !== undefined && !validDate(b.startsAt)) return res.status(400).json({ error: 'startsAt must be a valid date' });
    if (b.endsAt !== undefined && !validDate(b.endsAt)) return res.status(400).json({ error: 'endsAt must be a valid date' });

    const startsAt = b.startsAt ? new Date(b.startsAt) : new Date();
    const endsAt = b.endsAt ? new Date(b.endsAt) : null;
    if (endsAt && endsAt <= startsAt) return res.status(400).json({ error: 'endsAt must be after startsAt' });

    await client.query('BEGIN');
    const vehicleParams = [...scope.params, req.params.vehicleId];
    const vehicle = await client.query(`SELECT id, agency_id, department_id FROM vehicles v WHERE v.id = $${vehicleParams.length} AND ${scope.clause} AND v.active = TRUE FOR UPDATE`, vehicleParams);
    if (!vehicle.rows[0]) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Vehicle not found' }); }

    const driver = await client.query(`SELECT id, agency_id, active FROM drivers WHERE id = $1 FOR SHARE`, [b.driverId]);
    if (!driver.rows[0] || !driver.rows[0].active) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Active driver not found' }); }
    if (driver.rows[0].agency_id !== vehicle.rows[0].agency_id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Driver and vehicle must belong to the same agency' });
    }

    if (startsAt <= new Date()) {
      await client.query(`
        UPDATE vehicle_driver_assignments
        SET ends_at = $1
        WHERE vehicle_id = $2 AND starts_at < $1
          AND (ends_at IS NULL OR ends_at > $1)`, [startsAt, req.params.vehicleId]);
    }

    const result = await client.query(`
      INSERT INTO vehicle_driver_assignments(vehicle_id, driver_id, starts_at, ends_at, assigned_by)
      VALUES ($1,$2,$3,$4,$5)
      RETURNING *`, [req.params.vehicleId, b.driverId, startsAt, endsAt, req.auth!.id]);

    await client.query('COMMIT');
    await writeAudit(req, 'driver.assign_vehicle', 'vehicle_driver_assignment', result.rows[0].id, 'success', undefined, {
      vehicleId: req.params.vehicleId, driverId: b.driverId, startsAt: startsAt.toISOString(), endsAt: endsAt?.toISOString() ?? null,
    });
    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    if ((error as { code?: string }).code === '23P01') return res.status(409).json({ error: 'Assignment overlaps an existing driver assignment' });
    next(error);
  } finally { client.release(); }
});

assignmentsRouter.post('/:id/end', requirePermission('fleet.write'), async (req, res, next) => {
  try {
    if (req.body?.endsAt !== undefined && !validDate(req.body.endsAt)) return res.status(400).json({ error: 'endsAt must be a valid date' });
    const endsAt = req.body?.endsAt ? new Date(req.body.endsAt) : new Date();
    const scope = vehicleScope(req);
    const params = [...scope.params, req.params.id, endsAt];
    const result = await db.query(`
      UPDATE vehicle_driver_assignments vda
      SET ends_at = $${params.length}
      FROM vehicles v
      WHERE vda.id = $${scope.params.length + 1}
        AND vda.vehicle_id = v.id
        AND ${scope.clause}
        AND vda.ends_at IS NULL
        AND $${params.length} > vda.starts_at
      RETURNING vda.*`, params);
    if (!result.rows[0]) return res.status(404).json({ error: 'Active assignment not found' });
    await writeAudit(req, 'driver.unassign_vehicle', 'vehicle_driver_assignment', req.params.id, 'success', undefined, { endsAt: endsAt.toISOString() });
    res.json({ data: result.rows[0] });
  } catch (error) { next(error); }
});

assignmentsRouter.get('/drivers/:driverId', requirePermission('drivers.read'), async (req, res, next) => {
  try {
    const s = req.auth!.roles.includes('super_admin')
      ? { clause: 'TRUE', params: [] as unknown[] }
      : req.auth!.agencyId
        ? { clause: 'v.agency_id = $1', params: [req.auth!.agencyId] as unknown[] }
        : { clause: 'FALSE', params: [] as unknown[] };
    const params = [...s.params, req.params.driverId];
    const result = await db.query(`
      SELECT vda.id, vda.vehicle_id, vda.driver_id, vda.starts_at, vda.ends_at,
             v.registration_number, v.asset_number, v.make, v.model, v.agency_id, a.name AS agency_name
      FROM vehicle_driver_assignments vda
      JOIN vehicles v ON v.id = vda.vehicle_id
      JOIN agencies a ON a.id = v.agency_id
      WHERE vda.driver_id = $${params.length} AND ${s.clause}
      ORDER BY vda.starts_at DESC`, params);
    res.json({ data: result.rows });
  } catch (error) { next(error); }
});

export default assignmentsRouter;
