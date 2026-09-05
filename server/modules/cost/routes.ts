import { Router } from 'express';
import { db } from '../../db/client.js';
import { requireAuth, requirePermission, vehicleScope } from '../../middleware/auth.js';

const router = Router();
router.use(requireAuth, requirePermission('fleet.read'));

function dateRange(req: import('express').Request) {
  const from = typeof req.query.from === 'string' && req.query.from ? req.query.from : null;
  const to = typeof req.query.to === 'string' && req.query.to ? req.query.to : null;
  return { from, to };
}

router.get('/summary', async (req, res, next) => {
  try {
    const scope = vehicleScope(req, 'v');
    const { from, to } = dateRange(req);
    const params: unknown[] = [];
    const add = (value: unknown) => { params.push(value); return `$${params.length}`; };
    const dateFuel = [from ? `ft.occurred_at >= ${add(from)}` : '', to ? `ft.occurred_at <= ${add(to)}` : ''].filter(Boolean).join(' AND ');
    const dateMaint = [from ? `m.performed_at >= ${add(from)}` : '', to ? `m.performed_at <= ${add(to)}` : ''].filter(Boolean).join(' AND ');
    const dateTrips = [from ? `t.started_at >= ${add(from)}` : '', to ? `t.started_at <= ${add(to)}` : ''].filter(Boolean).join(' AND ');
    const base = await db.query(`
      SELECT
        (SELECT COALESCE(SUM(ft.total_cost),0) FROM fuel_transactions ft JOIN vehicles v ON v.id=ft.vehicle_id WHERE ${scope.clause.replaceAll('v.', 'v.')} ${dateFuel ? `AND ${dateFuel}` : ''}) AS fuel_cost,
        (SELECT COALESCE(SUM(ft.quantity_litres),0) FROM fuel_transactions ft JOIN vehicles v ON v.id=ft.vehicle_id WHERE ${scope.clause.replaceAll('v.', 'v.')} ${dateFuel ? `AND ${dateFuel}` : ''}) AS fuel_litres,
        (SELECT COALESCE(SUM(m.actual_cost),0) FROM maintenance_records m JOIN vehicles v ON v.id=m.vehicle_id WHERE ${scope.clause.replaceAll('v.', 'v.')} AND m.status='completed' ${dateMaint ? `AND ${dateMaint}` : ''}) AS maintenance_cost,
        (SELECT COALESCE(SUM(t.distance_km),0) FROM trips t JOIN vehicles v ON v.id=t.vehicle_id WHERE ${scope.clause.replaceAll('v.', 'v.')} ${dateTrips ? `AND ${dateTrips}` : ''}) AS distance_km,
        (SELECT COUNT(*) FROM vehicles v WHERE ${scope.clause}) AS vehicles,
        (SELECT COUNT(*) FROM fuel_anomalies fa JOIN vehicles v ON v.id=fa.vehicle_id WHERE ${scope.clause.replaceAll('v.', 'v.')} AND fa.resolved_at IS NULL) AS open_fuel_anomalies
    `, params);
    const row = base.rows[0];
    const fuelCost = Number(row.fuel_cost || 0);
    const maintenanceCost = Number(row.maintenance_cost || 0);
    const distance = Number(row.distance_km || 0);
    const totalCost = fuelCost + maintenanceCost;
    res.json({ data: {
      vehicles: Number(row.vehicles || 0), fuel_litres: Number(row.fuel_litres || 0), fuel_cost: fuelCost,
      maintenance_cost: maintenanceCost, total_cost: totalCost, distance_km: distance,
      cost_per_km: distance > 0 ? totalCost / distance : 0,
      fuel_cost_per_km: distance > 0 ? fuelCost / distance : 0,
      maintenance_cost_per_km: distance > 0 ? maintenanceCost / distance : 0,
      open_fuel_anomalies: Number(row.open_fuel_anomalies || 0), from, to
    }});
  } catch (error) { next(error); }
});

router.get('/vehicles', async (req, res, next) => {
  try {
    const scope = vehicleScope(req, 'v');
    const { from, to } = dateRange(req);
    const params: unknown[] = [];
    const add = (value: unknown) => { params.push(value); return `$${params.length}`; };
    const fuelFrom = from ? `AND ft.occurred_at >= ${add(from)}` : '';
    const fuelTo = to ? `AND ft.occurred_at <= ${add(to)}` : '';
    const maintFrom = from ? `AND m.performed_at >= ${add(from)}` : '';
    const maintTo = to ? `AND m.performed_at <= ${add(to)}` : '';
    const tripFrom = from ? `AND t.started_at >= ${add(from)}` : '';
    const tripTo = to ? `AND t.started_at <= ${add(to)}` : '';
    const result = await db.query(`
      SELECT v.id, v.registration_number, v.asset_number,
        COALESCE((SELECT SUM(ft.total_cost) FROM fuel_transactions ft WHERE ft.vehicle_id=v.id ${fuelFrom} ${fuelTo}),0) fuel_cost,
        COALESCE((SELECT SUM(ft.quantity_litres) FROM fuel_transactions ft WHERE ft.vehicle_id=v.id ${fuelFrom} ${fuelTo}),0) fuel_litres,
        COALESCE((SELECT SUM(m.actual_cost) FROM maintenance_records m WHERE m.vehicle_id=v.id AND m.status='completed' ${maintFrom} ${maintTo}),0) maintenance_cost,
        COALESCE((SELECT SUM(t.distance_km) FROM trips t WHERE t.vehicle_id=v.id ${tripFrom} ${tripTo}),0) distance_km,
        (SELECT COUNT(*) FROM fuel_anomalies fa WHERE fa.vehicle_id=v.id AND fa.resolved_at IS NULL) open_fuel_anomalies
      FROM vehicles v WHERE ${scope.clause.replaceAll('v.', 'v.')}
      ORDER BY (COALESCE((SELECT SUM(ft.total_cost) FROM fuel_transactions ft WHERE ft.vehicle_id=v.id ${fuelFrom} ${fuelTo}),0) + COALESCE((SELECT SUM(m.actual_cost) FROM maintenance_records m WHERE m.vehicle_id=v.id AND m.status='completed' ${maintFrom} ${maintTo}),0)) DESC
      LIMIT 500
    `, params);
    res.json({ data: result.rows.map((r) => { const fuel=Number(r.fuel_cost||0), maint=Number(r.maintenance_cost||0), distance=Number(r.distance_km||0); return { ...r, fuel_cost:fuel, maintenance_cost:maint, total_cost:fuel+maint, distance_km:distance, cost_per_km:distance?(fuel+maint)/distance:0, fuel_cost_per_km:distance?fuel/distance:0 }; }) });
  } catch (error) { next(error); }
});

export default router;
