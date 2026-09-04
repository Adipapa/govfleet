import { Router } from 'express';
import { db } from '../../db/client.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { vehicleScope } from '../../middleware/scope.js';

export const telemetryRouter = Router();
telemetryRouter.use(requireAuth, requirePermission('telemetry.read'));

telemetryRouter.get('/latest', async (req, res, next) => {
  try {
    const scope = vehicleScope(req, 'v');
    const result = await db.query(`
      SELECT DISTINCT ON (t.vehicle_id)
        t.id, t.vehicle_id, v.registration_number, v.agency_id, v.department_id,
        t.recorded_at, t.latitude, t.longitude, t.speed_kmh, t.heading, t.ignition,
        t.odometer_km, t.fuel_litres, t.battery_voltage, t.satellites, t.gsm_signal
      FROM telemetry t
      JOIN vehicles v ON v.id = t.vehicle_id
      WHERE ${scope.clause}
      ORDER BY t.vehicle_id, t.recorded_at DESC`, scope.params);
    res.json({ data: result.rows });
  } catch (error) { next(error); }
});

telemetryRouter.get('/vehicles/:vehicleId', async (req, res, next) => {
  try {
    const scope = vehicleScope(req, 'v');
    const limitRaw = Number(req.query.limit ?? 500);
    const limit = Number.isInteger(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 2000) : 500;
    const params = [...scope.params, req.params.vehicleId, limit];
    const result = await db.query(`
      SELECT t.id, t.recorded_at, t.latitude, t.longitude, t.speed_kmh, t.heading, t.ignition,
             t.odometer_km, t.fuel_litres, t.battery_voltage, t.satellites, t.gsm_signal
      FROM telemetry t JOIN vehicles v ON v.id = t.vehicle_id
      WHERE t.vehicle_id = $${scope.nextIndex} AND ${scope.clause}
      ORDER BY t.recorded_at DESC LIMIT $${scope.nextIndex + 1}`, params);
    res.json({ data: result.rows });
  } catch (error) { next(error); }
});

export default telemetryRouter;
