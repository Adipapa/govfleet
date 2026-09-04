import { Router } from 'express';
import { db } from '../../db/client.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { vehicleScope } from '../../middleware/scope.js';
import { writeAudit } from '../audit/audit.js';

export const fleetRouter = Router();
fleetRouter.use(requireAuth);

function parsePage(value: unknown, fallback: number, max: number) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? Math.min(n, max) : fallback;
}

fleetRouter.get('/vehicles', requirePermission('fleet.read'), async (req, res, next) => {
  try {
    const page = parsePage(req.query.page, 1, 100000);
    const limit = parsePage(req.query.limit, 50, 100);
    const offset = (page - 1) * limit;
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
    const agencyId = typeof req.query.agencyId === 'string' ? req.query.agencyId : '';
    const departmentId = typeof req.query.departmentId === 'string' ? req.query.departmentId : '';

    const scope = vehicleScope(req);
    const params: unknown[] = [...scope.params];
    const conditions = [scope.clause, 'v.active = TRUE'];
    const add = (sql: string, value: unknown) => {
      params.push(value);
      conditions.push(sql.replace('$IDX', `$${params.length}`));
    };

    if (search) add(`(v.registration_number ILIKE '%' || $IDX || '%' OR v.asset_number ILIKE '%' || $IDX || '%' OR v.make ILIKE '%' || $IDX || '%' OR v.model ILIKE '%' || $IDX || '%')`, search);
    if (status) add(`v.status::text = $IDX`, status);
    if (agencyId && req.auth!.roles.includes('super_admin')) add(`v.agency_id = $IDX`, agencyId);
    if (departmentId && (req.auth!.roles.includes('super_admin') || !!req.auth!.departmentId)) add(`v.department_id = $IDX`, departmentId);

    params.push(limit, offset);
    const where = conditions.join(' AND ');
    const result = await db.query(`
      SELECT v.id, v.registration_number, v.asset_number, v.make, v.model, v.model_year,
             v.vehicle_type, v.fuel_type, v.tank_capacity_litres, v.odometer_km, v.status,
             v.agency_id, a.name AS agency_name, v.department_id, d.name AS department_name,
             v.created_at, v.updated_at
      FROM vehicles v
      JOIN agencies a ON a.id = v.agency_id
      LEFT JOIN departments d ON d.id = v.department_id
      WHERE ${where}
      ORDER BY v.registration_number
      LIMIT $${params.length - 1} OFFSET $${params.length}` , params);

    const count = await db.query(`SELECT count(*)::int AS total FROM vehicles v WHERE ${where}`, params.slice(0, -2));
    res.json({ data: result.rows, pagination: { page, limit, total: count.rows[0].total, pages: Math.ceil(count.rows[0].total / limit) } });
  } catch (error) { next(error); }
});

fleetRouter.get('/vehicles/:id', requirePermission('fleet.read'), async (req, res, next) => {
  try {
    const scope = vehicleScope(req);
    const params = [...scope.params, req.params.id];
    const result = await db.query(`
      SELECT v.*, a.name AS agency_name, d.name AS department_name,
        (SELECT row_to_json(x) FROM (
          SELECT dr.id, dr.employee_number, dr.full_name, dr.phone, dr.licence_number, dr.licence_expiry
          FROM vehicle_driver_assignments va JOIN drivers dr ON dr.id = va.driver_id
          WHERE va.vehicle_id = v.id AND va.starts_at <= now() AND (va.ends_at IS NULL OR va.ends_at > now())
          ORDER BY va.starts_at DESC LIMIT 1
        ) x) AS current_driver,
        (SELECT row_to_json(x) FROM (
          SELECT dv.id, dv.device_identifier, dv.serial_number, dv.manufacturer, dv.model, dv.protocol,
                 dv.firmware_version, dv.status, dv.last_heartbeat_at
          FROM vehicle_device_assignments vd JOIN devices dv ON dv.id = vd.device_id
          WHERE vd.vehicle_id = v.id AND vd.starts_at <= now() AND (vd.ends_at IS NULL OR vd.ends_at > now())
          ORDER BY vd.starts_at DESC LIMIT 1
        ) x) AS current_device
      FROM vehicles v JOIN agencies a ON a.id = v.agency_id LEFT JOIN departments d ON d.id = v.department_id
      WHERE v.id = $${params.length} AND ${scope.clause}`, params);
    if (!result.rows[0]) return res.status(404).json({ error: 'Vehicle not found' });
    res.json({ data: result.rows[0] });
  } catch (error) { next(error); }
});

fleetRouter.post('/vehicles', requirePermission('fleet.write'), async (req, res, next) => {
  try {
    const b = req.body ?? {};
    const required = ['agencyId', 'registrationNumber'];
    if (required.some((key) => typeof b[key] !== 'string' || !b[key].trim())) return res.status(400).json({ error: 'agencyId and registrationNumber are required' });
    if (!req.auth!.roles.includes('super_admin') && b.agencyId !== req.auth!.agencyId) return res.status(403).json({ error: 'Vehicle agency is outside your scope' });
    if (b.departmentId) {
      const dep = await db.query('SELECT 1 FROM departments WHERE id = $1 AND agency_id = $2 AND active = TRUE', [b.departmentId, b.agencyId]);
      if (!dep.rows[0]) return res.status(400).json({ error: 'Invalid department for agency' });
    }

    const result = await db.query(`INSERT INTO vehicles
      (agency_id, department_id, registration_number, asset_number, make, model, model_year, vehicle_type, fuel_type, tank_capacity_litres, odometer_km)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *`, [b.agencyId, b.departmentId ?? null, b.registrationNumber.trim(), b.assetNumber ?? null,
      b.make ?? null, b.model ?? null, b.modelYear ?? null, b.vehicleType ?? null, b.fuelType ?? null,
      b.tankCapacityLitres ?? null, b.odometerKm ?? 0]);
    await writeAudit(req, 'vehicle.create', 'vehicle', result.rows[0].id, 'success', undefined, { registrationNumber: b.registrationNumber });
    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    if ((error as { code?: string }).code === '23505') return res.status(409).json({ error: 'Registration or asset number already exists' });
    next(error);
  }
});

fleetRouter.patch('/vehicles/:id', requirePermission('fleet.write'), async (req, res, next) => {
  try {
    const scope = vehicleScope(req);
    const current = await db.query(`SELECT * FROM vehicles v WHERE v.id = $${scope.nextIndex} AND ${scope.clause}`, [...scope.params, req.params.id]);
    if (!current.rows[0]) return res.status(404).json({ error: 'Vehicle not found' });

    const allowed: Record<string, string> = {
      registrationNumber: 'registration_number', assetNumber: 'asset_number', make: 'make', model: 'model',
      modelYear: 'model_year', vehicleType: 'vehicle_type', fuelType: 'fuel_type',
      tankCapacityLitres: 'tank_capacity_litres', odometerKm: 'odometer_km', status: 'status', departmentId: 'department_id', active: 'active',
    };
    const entries = Object.entries(allowed).filter(([key]) => Object.prototype.hasOwnProperty.call(req.body ?? {}, key));
    if (!entries.length) return res.status(400).json({ error: 'No supported fields supplied' });

    const params: unknown[] = [];
    const sets = entries.map(([key, column]) => { params.push(req.body[key]); return `${column} = $${params.length}`; });
    params.push(req.params.id);
    const result = await db.query(`UPDATE vehicles SET ${sets.join(', ')}, updated_at = now() WHERE id = $${params.length} RETURNING *`, params);
    await writeAudit(req, 'vehicle.update', 'vehicle', req.params.id, 'success', undefined, { fields: entries.map(([key]) => key) });
    res.json({ data: result.rows[0] });
  } catch (error) {
    if ((error as { code?: string }).code === '23505') return res.status(409).json({ error: 'Registration or asset number already exists' });
    next(error);
  }
});

export default fleetRouter;
