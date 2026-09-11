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

const vehicleColumns = `
  v.id, v.agency_id, a.name AS agency_name, v.department_id, d.name AS department_name,
  v.registration_number, v.asset_number, v.vin, v.engine_number, v.make, v.model, v.model_year,
  v.vehicle_type, v.body_type, v.color, v.transmission, v.seats, v.fuel_type,
  v.tank_capacity_litres, v.odometer_km, v.status, v.active, v.acquisition_date,
  v.acquisition_method, v.purchase_value, v.base_location, v.cost_center, v.asset_category,
  v.registration_expiry, v.insurance_expiry, v.roadworthiness_expiry, v.permit_expiry,
  v.next_service_date, v.next_service_odometer_km, v.last_service_date,
  v.last_service_odometer_km, v.notes, v.disposal_date, v.disposal_reason,
  v.created_at, v.updated_at`;

fleetRouter.get('/vehicles', requirePermission('fleet.read'), async (req, res, next) => {
  try {
    const page = parsePage(req.query.page, 1, 100000);
    const limit = parsePage(req.query.limit, 50, 100);
    const offset = (page - 1) * limit;
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
    const agencyId = typeof req.query.agencyId === 'string' ? req.query.agencyId : '';
    const departmentId = typeof req.query.departmentId === 'string' ? req.query.departmentId : '';
    const type = typeof req.query.vehicleType === 'string' ? req.query.vehicleType.trim() : '';
    const fuelType = typeof req.query.fuelType === 'string' ? req.query.fuelType.trim() : '';
    const activeOnly = req.query.includeInactive !== 'true';

    const scope = vehicleScope(req);
    const params: unknown[] = [...scope.params];
    const conditions = [scope.clause, ...(activeOnly ? ['v.active = TRUE'] : [])];
    const add = (sql: string, value: unknown) => { params.push(value); conditions.push(sql.replace('$IDX', `$${params.length}`)); };

    if (search) add(`(v.registration_number ILIKE '%' || $IDX || '%' OR v.asset_number ILIKE '%' || $IDX || '%' OR v.vin ILIKE '%' || $IDX || '%' OR v.make ILIKE '%' || $IDX || '%' OR v.model ILIKE '%' || $IDX || '%' OR v.engine_number ILIKE '%' || $IDX || '%')`, search);
    if (status) add(`v.status::text = $IDX`, status);
    if (agencyId && req.auth!.roles.includes('super_admin')) add(`v.agency_id = $IDX`, agencyId);
    if (departmentId && (req.auth!.roles.includes('super_admin') || !!req.auth!.departmentId)) add(`v.department_id = $IDX`, departmentId);
    if (type) add(`v.vehicle_type = $IDX`, type);
    if (fuelType) add(`v.fuel_type = $IDX`, fuelType);

    const where = conditions.join(' AND ');
    const listParams = [...params, limit, offset];
    const result = await db.query(`SELECT ${vehicleColumns}
      FROM vehicles v JOIN agencies a ON a.id = v.agency_id LEFT JOIN departments d ON d.id = v.department_id
      WHERE ${where} ORDER BY v.registration_number LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`, listParams);
    const count = await db.query(`SELECT count(*)::int AS total FROM vehicles v WHERE ${where}`, params);
    res.json({ data: result.rows, pagination: { page, limit, total: count.rows[0].total, pages: Math.ceil(count.rows[0].total / limit) } });
  } catch (error) { next(error); }
});

fleetRouter.get('/vehicles/:id', requirePermission('fleet.read'), async (req, res, next) => {
  try {
    const scope = vehicleScope(req);
    const params = [...scope.params, req.params.id];
    const result = await db.query(`
      SELECT ${vehicleColumns},
        (SELECT row_to_json(x) FROM (
          SELECT dr.id, dr.employee_number, dr.full_name, dr.phone, dr.licence_number, dr.licence_expiry,
                 va.starts_at AS assignment_started_at
          FROM vehicle_driver_assignments va JOIN drivers dr ON dr.id = va.driver_id
          WHERE va.vehicle_id = v.id AND va.starts_at <= now() AND (va.ends_at IS NULL OR va.ends_at > now())
          ORDER BY va.starts_at DESC LIMIT 1) x) AS current_driver,
        (SELECT row_to_json(x) FROM (
          SELECT dv.id, dv.device_identifier, dv.serial_number, dv.manufacturer, dv.model, dv.protocol,
                 dv.firmware_version, dv.status, dv.last_heartbeat_at, vd.starts_at AS assignment_started_at
          FROM vehicle_device_assignments vd JOIN devices dv ON dv.id = vd.device_id
          WHERE vd.vehicle_id = v.id AND vd.starts_at <= now() AND (vd.ends_at IS NULL OR vd.ends_at > now())
          ORDER BY vd.starts_at DESC LIMIT 1) x) AS current_device,
        (SELECT row_to_json(t) FROM (
          SELECT recorded_at, latitude, longitude, speed_kmh, heading, ignition, odometer_km,
                 fuel_litres, battery_voltage, satellites, gsm_signal
          FROM telemetry WHERE vehicle_id = v.id ORDER BY recorded_at DESC LIMIT 1) t) AS latest_telemetry,
        (SELECT count(*)::int FROM trips WHERE vehicle_id = v.id) AS trip_count,
        (SELECT count(*)::int FROM maintenance_records WHERE vehicle_id = v.id AND status <> 'Completed') AS open_maintenance_count,
        (SELECT count(*)::int FROM alerts WHERE vehicle_id = v.id AND acknowledged_at IS NULL) AS open_alert_count,
        (SELECT COALESCE(sum(distance_km),0) FROM trips WHERE vehicle_id = v.id AND started_at >= date_trunc('month', now())) AS month_distance_km,
        (SELECT json_agg(m ORDER BY m.created_at DESC) FROM (
          SELECT id, category, status, due_at, due_odometer_km, performed_at, odometer_km,
                 estimated_cost, actual_cost, service_provider, notes, created_at
          FROM maintenance_records WHERE vehicle_id = v.id ORDER BY created_at DESC LIMIT 10) m) AS recent_maintenance
      FROM vehicles v JOIN agencies a ON a.id = v.agency_id LEFT JOIN departments d ON d.id = v.department_id
      WHERE v.id = $${params.length} AND ${scope.clause}`, params);
    if (!result.rows[0]) return res.status(404).json({ error: 'Vehicle not found' });

    const history = await db.query(`
      SELECT va.id, 'driver' AS assignment_type, va.starts_at, va.ends_at, dr.full_name AS assignee,
             dr.employee_number AS reference
      FROM vehicle_driver_assignments va JOIN drivers dr ON dr.id = va.driver_id WHERE va.vehicle_id = $1
      UNION ALL
      SELECT vd.id, 'device', vd.starts_at, vd.ends_at, dv.device_identifier, dv.serial_number
      FROM vehicle_device_assignments vd JOIN devices dv ON dv.id = vd.device_id WHERE vd.vehicle_id = $1
      ORDER BY starts_at DESC`, [req.params.id]);

    res.json({ data: { ...result.rows[0], assignment_history: history.rows } });
  } catch (error) { next(error); }
});

fleetRouter.post('/vehicles', requirePermission('fleet.write'), async (req, res, next) => {
  try {
    const b = req.body ?? {};
    if (typeof b.agencyId !== 'string' || !b.agencyId.trim() || typeof b.registrationNumber !== 'string' || !b.registrationNumber.trim()) {
      return res.status(400).json({ error: 'agencyId and registrationNumber are required' });
    }
    if (!req.auth!.roles.includes('super_admin') && b.agencyId !== req.auth!.agencyId) return res.status(403).json({ error: 'Vehicle agency is outside your scope' });
    if (b.departmentId) {
      const dep = await db.query('SELECT 1 FROM departments WHERE id = $1 AND agency_id = $2 AND active = TRUE', [b.departmentId, b.agencyId]);
      if (!dep.rows[0]) return res.status(400).json({ error: 'Invalid department for agency' });
    }

    const result = await db.query(`INSERT INTO vehicles
      (agency_id, department_id, registration_number, asset_number, vin, engine_number, make, model, model_year,
       vehicle_type, body_type, color, transmission, seats, fuel_type, tank_capacity_litres, odometer_km,
       acquisition_date, acquisition_method, purchase_value, base_location, cost_center, asset_category,
       registration_expiry, insurance_expiry, roadworthiness_expiry, permit_expiry, next_service_date,
       next_service_odometer_km, last_service_date, last_service_odometer_km, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32)
      RETURNING *`, [
      b.agencyId, b.departmentId ?? null, b.registrationNumber.trim(), b.assetNumber ?? null, b.vin ?? null, b.engineNumber ?? null,
      b.make ?? null, b.model ?? null, b.modelYear ?? null, b.vehicleType ?? null, b.bodyType ?? null, b.color ?? null,
      b.transmission ?? null, b.seats ?? null, b.fuelType ?? null, b.tankCapacityLitres ?? null, b.odometerKm ?? 0,
      b.acquisitionDate ?? null, b.acquisitionMethod ?? null, b.purchaseValue ?? null, b.baseLocation ?? null, b.costCenter ?? null,
      b.assetCategory ?? null, b.registrationExpiry ?? null, b.insuranceExpiry ?? null, b.roadworthinessExpiry ?? null,
      b.permitExpiry ?? null, b.nextServiceDate ?? null, b.nextServiceOdometerKm ?? null, b.lastServiceDate ?? null,
      b.lastServiceOdometerKm ?? null, b.notes ?? null]);
    await writeAudit(req, 'vehicle.create', 'vehicle', result.rows[0].id, 'success', undefined, { registrationNumber: b.registrationNumber });
    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    if ((error as { code?: string }).code === '23505') return res.status(409).json({ error: 'Registration, VIN or asset number already exists' });
    next(error);
  }
});

fleetRouter.patch('/vehicles/:id', requirePermission('fleet.write'), async (req, res, next) => {
  try {
    const scope = vehicleScope(req);
    const current = await db.query(`SELECT * FROM vehicles v WHERE v.id = $${scope.nextIndex} AND ${scope.clause}`, [...scope.params, req.params.id]);
    if (!current.rows[0]) return res.status(404).json({ error: 'Vehicle not found' });

    const allowed: Record<string, string> = {
      registrationNumber: 'registration_number', assetNumber: 'asset_number', vin: 'vin', engineNumber: 'engine_number',
      make: 'make', model: 'model', modelYear: 'model_year', vehicleType: 'vehicle_type', bodyType: 'body_type',
      color: 'color', transmission: 'transmission', seats: 'seats', fuelType: 'fuel_type', tankCapacityLitres: 'tank_capacity_litres',
      odometerKm: 'odometer_km', status: 'status', departmentId: 'department_id', active: 'active', acquisitionDate: 'acquisition_date',
      acquisitionMethod: 'acquisition_method', purchaseValue: 'purchase_value', baseLocation: 'base_location', costCenter: 'cost_center',
      assetCategory: 'asset_category', registrationExpiry: 'registration_expiry', insuranceExpiry: 'insurance_expiry',
      roadworthinessExpiry: 'roadworthiness_expiry', permitExpiry: 'permit_expiry', nextServiceDate: 'next_service_date',
      nextServiceOdometerKm: 'next_service_odometer_km', lastServiceDate: 'last_service_date',
      lastServiceOdometerKm: 'last_service_odometer_km', notes: 'notes', disposalDate: 'disposal_date', disposalReason: 'disposal_reason'
    };
    const entries = Object.entries(allowed).filter(([key]) => Object.prototype.hasOwnProperty.call(req.body ?? {}, key));
    if (!entries.length) return res.status(400).json({ error: 'No supported fields supplied' });
    if (Object.prototype.hasOwnProperty.call(req.body, 'departmentId') && req.body.departmentId) {
      const dep = await db.query('SELECT 1 FROM departments WHERE id = $1 AND agency_id = $2 AND active = TRUE', [req.body.departmentId, current.rows[0].agency_id]);
      if (!dep.rows[0]) return res.status(400).json({ error: 'Invalid department for vehicle agency' });
    }

    const params: unknown[] = [];
    const sets = entries.map(([key, column]) => { params.push(req.body[key]); return `${column} = $${params.length}`; });
    params.push(req.params.id);
    const result = await db.query(`UPDATE vehicles SET ${sets.join(', ')}, updated_at = now() WHERE id = $${params.length} RETURNING *`, params);
    await writeAudit(req, 'vehicle.update', 'vehicle', req.params.id, 'success', undefined, { fields: entries.map(([key]) => key) });
    res.json({ data: result.rows[0] });
  } catch (error) {
    if ((error as { code?: string }).code === '23505') return res.status(409).json({ error: 'Registration, VIN or asset number already exists' });
    next(error);
  }
});

export default fleetRouter;
