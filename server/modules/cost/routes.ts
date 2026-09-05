import { Router } from 'express';
import { db } from '../../db/client.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { vehicleScope } from '../../middleware/scope.js';

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
    const params: unknown[] = [...scope.params];
    const add = (value: unknown) => { params.push(value); return '$' + params.length; };
    const date = (column: string) => {
      const clauses: string[] = [];
      if (from) clauses.push(column + ' >= ' + add(from));
      if (to) clauses.push(column + ' <= ' + add(to));
      return clauses.length ? ' AND ' + clauses.join(' AND ') : '';
    };
    const result = await db.query(`
      SELECT
        (SELECT COALESCE(SUM(ft.total_cost),0) FROM fuel_transactions ft WHERE EXISTS (SELECT 1 FROM vehicles v2 WHERE v2.id=ft.vehicle_id AND ${scope.clause.replaceAll('v.', 'v2.')})${date('ft.occurred_at')}) AS fuel_cost,
        (SELECT COALESCE(SUM(ft.quantity_litres),0) FROM fuel_transactions ft WHERE EXISTS (SELECT 1 FROM vehicles v2 WHERE v2.id=ft.vehicle_id AND ${scope.clause.replaceAll('v.', 'v2.')})${date('ft.occurred_at')}) AS fuel_litres,
        (SELECT COALESCE(SUM(m.actual_cost),0) FROM maintenance_records m WHERE EXISTS (SELECT 1 FROM vehicles v2 WHERE v2.id=m.vehicle_id AND ${scope.clause.replaceAll('v.', 'v2.')}) AND m.status='completed'${date('m.performed_at')}) AS maintenance_cost,
        (SELECT COALESCE(SUM(t.distance_km),0) FROM trips t WHERE EXISTS (SELECT 1 FROM vehicles v2 WHERE v2.id=t.vehicle_id AND ${scope.clause.replaceAll('v.', 'v2.')})${date('t.started_at')}) AS distance_km,
        (SELECT COUNT(*) FROM vehicles v WHERE ${scope.clause}) AS vehicles,
        (SELECT COUNT(*) FROM fuel_anomalies fa WHERE EXISTS (SELECT 1 FROM vehicles v2 WHERE v2.id=fa.vehicle_id AND ${scope.clause.replaceAll('v.', 'v2.')}) AND fa.resolved_at IS NULL) AS open_fuel_anomalies
    `, params);
    const row = result.rows[0];
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
    const params: unknown[] = [...scope.params];
    const add = (value: unknown) => { params.push(value); return '$' + params.length; };
    const date = (column: string) => {
      const clauses: string[] = [];
      if (from) clauses.push(column + ' >= ' + add(from));
      if (to) clauses.push(column + ' <= ' + add(to));
      return clauses.length ? ' AND ' + clauses.join(' AND ') : '';
    };
    const fuelDate = date('ft.occurred_at');
    const maintDate = date('m.performed_at');
    const tripDate = date('t.started_at');
    const result = await db.query(`
      SELECT v.id, v.registration_number, v.asset_number,
        COALESCE((SELECT SUM(ft.total_cost) FROM fuel_transactions ft WHERE ft.vehicle_id=v.id${fuelDate}),0) fuel_cost,
        COALESCE((SELECT SUM(ft.quantity_litres) FROM fuel_transactions ft WHERE ft.vehicle_id=v.id${fuelDate}),0) fuel_litres,
        COALESCE((SELECT SUM(m.actual_cost) FROM maintenance_records m WHERE m.vehicle_id=v.id AND m.status='completed'${maintDate}),0) maintenance_cost,
        COALESCE((SELECT SUM(t.distance_km) FROM trips t WHERE t.vehicle_id=v.id${tripDate}),0) distance_km,
        (SELECT COUNT(*) FROM fuel_anomalies fa WHERE fa.vehicle_id=v.id AND fa.resolved_at IS NULL) open_fuel_anomalies
      FROM vehicles v WHERE ${scope.clause}
      ORDER BY (COALESCE((SELECT SUM(ft.total_cost) FROM fuel_transactions ft WHERE ft.vehicle_id=v.id${fuelDate}),0) + COALESCE((SELECT SUM(m.actual_cost) FROM maintenance_records m WHERE m.vehicle_id=v.id AND m.status='completed'${maintDate}),0)) DESC
      LIMIT 500
    `, params);
    res.json({ data: result.rows.map((r) => {
      const fuel=Number(r.fuel_cost||0), maint=Number(r.maintenance_cost||0), distance=Number(r.distance_km||0);
      return { ...r, fuel_cost:fuel, maintenance_cost:maint, total_cost:fuel+maint, distance_km:distance, cost_per_km:distance?(fuel+maint)/distance:0, fuel_cost_per_km:distance?fuel/distance:0 };
    }) });
  } catch (error) { next(error); }
});

router.get('/roi', async (req, res, next) => {
  try {
    const baselineAnnualCost = Number(req.query.baselineAnnualCost);
    const implementationCost = Number(req.query.implementationCost);
    if (!Number.isFinite(baselineAnnualCost) || baselineAnnualCost < 0) return res.status(400).json({ error: 'baselineAnnualCost must be a non-negative number' });
    if (!Number.isFinite(implementationCost) || implementationCost <= 0) return res.status(400).json({ error: 'implementationCost must be greater than zero' });

    const scope = vehicleScope(req, 'v');
    const { from, to } = dateRange(req);
    const periodStart = from ? new Date(from) : new Date(new Date().getFullYear(), 0, 1);
    const periodEnd = to ? new Date(to) : new Date();
    if (Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime()) || periodEnd <= periodStart) return res.status(400).json({ error: 'Invalid ROI date range' });

    const result = await db.query(`
      SELECT
        COALESCE((SELECT SUM(ft.total_cost) FROM fuel_transactions ft WHERE EXISTS (SELECT 1 FROM vehicles v2 WHERE v2.id=ft.vehicle_id AND ${scope.clause.replaceAll('v.', 'v2.')}) AND ft.occurred_at >= $${scope.nextIndex} AND ft.occurred_at < $${scope.nextIndex + 1}),0) AS fuel_actual,
        COALESCE((SELECT SUM(m.actual_cost) FROM maintenance_records m WHERE EXISTS (SELECT 1 FROM vehicles v2 WHERE v2.id=m.vehicle_id AND ${scope.clause.replaceAll('v.', 'v2.')}) AND m.status='completed' AND m.performed_at >= $${scope.nextIndex} AND m.performed_at < $${scope.nextIndex + 1}),0) AS maintenance_actual
    `, [...scope.params, periodStart, new Date(periodEnd.getTime() + 86400000)]);

    const row = result.rows[0] || {};
    const actualCost = Number(row.fuel_actual || 0) + Number(row.maintenance_actual || 0);
    const days = Math.max(1, (periodEnd.getTime() - periodStart.getTime()) / 86400000);
    const annualizedCurrentCost = actualCost * 365 / days;
    const annualSavings = baselineAnnualCost - annualizedCurrentCost;
    const netAnnualBenefit = annualSavings - implementationCost;
    const roiPercent = (netAnnualBenefit / implementationCost) * 100;
    const paybackMonths = annualSavings > 0 ? implementationCost / annualSavings * 12 : null;

    res.json({ data: {
      baselineAnnualCost, implementationCost, periodStart: periodStart.toISOString(), periodEnd: periodEnd.toISOString(),
      observedCost: actualCost, annualizedCurrentCost, annualSavings, netAnnualBenefit,
      roiPercent, paybackMonths, positiveRoi: roiPercent > 0,
      fuelActual: Number(row.fuel_actual || 0), maintenanceActual: Number(row.maintenance_actual || 0)
    }});
  } catch (error) { next(error); }
});

export default router;
