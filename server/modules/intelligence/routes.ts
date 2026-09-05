import { Router } from 'express';
import { db } from '../../db/client.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { vehicleScope } from '../../middleware/scope.js';

export const intelligenceRouter = Router();
intelligenceRouter.use(requireAuth, requirePermission('fleet.read'));

function period(req: import('express').Request) {
  const from = typeof req.query.from === 'string' && req.query.from ? new Date(req.query.from) : new Date(Date.now() - 30 * 86400000);
  const to = typeof req.query.to === 'string' && req.query.to ? new Date(req.query.to) : new Date();
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) throw new Error('Invalid date range');
  return { from, to };
}

intelligenceRouter.get('/kpi', async (req, res, next) => {
  try {
    const { from, to } = period(req);
    const scope = vehicleScope(req, 'v');
    const p = [...scope.params, from, to];
    const fi = scope.nextIndex;
    const ti = scope.nextIndex + 1;
    const result = await db.query(`
      SELECT
        COUNT(*)::int AS total_fleet,
        COUNT(*) FILTER (WHERE v.status='moving')::int AS moving,
        COUNT(*) FILTER (WHERE v.status IN ('offline','no_gps'))::int AS offline,
        COUNT(*) FILTER (WHERE v.status='emergency')::int AS emergency,
        (SELECT COUNT(*)::int FROM alerts a JOIN vehicles av ON av.id=a.vehicle_id WHERE ${scope.clause.replaceAll('v.', 'av.')} AND a.acknowledged_at IS NULL) AS open_alerts,
        (SELECT COUNT(*)::int FROM fuel_anomalies fa JOIN vehicles av ON av.id=fa.vehicle_id WHERE ${scope.clause.replaceAll('v.', 'av.')} AND fa.resolved_at IS NULL) AS open_fuel_anomalies,
        (SELECT COUNT(*)::int FROM maintenance_records mr JOIN vehicles av ON av.id=mr.vehicle_id WHERE ${scope.clause.replaceAll('v.', 'av.')} AND mr.status IN ('scheduled','due_soon','overdue','in_progress') AND ((mr.due_at IS NOT NULL AND mr.due_at < CURRENT_DATE) OR (mr.due_odometer_km IS NOT NULL AND av.odometer_km >= mr.due_odometer_km))) AS overdue_maintenance,
        (SELECT COALESCE(SUM(t.distance_km),0) FROM trips t JOIN vehicles av ON av.id=t.vehicle_id WHERE ${scope.clause.replaceAll('v.', 'av.')} AND t.started_at >= $${fi} AND t.started_at < $${ti}) AS distance_km,
        (SELECT COUNT(*)::int FROM trips t JOIN vehicles av ON av.id=t.vehicle_id WHERE ${scope.clause.replaceAll('v.', 'av.')} AND t.started_at >= $${fi} AND t.started_at < $${ti}) AS trips,
        (SELECT COALESCE(SUM(te.duration_seconds),0) FROM (SELECT t.duration_seconds FROM trips t JOIN vehicles av ON av.id=t.vehicle_id WHERE ${scope.clause.replaceAll('v.', 'av.')} AND t.started_at >= $${fi} AND t.started_at < $${ti}) te) AS trip_seconds
      FROM vehicles v WHERE ${scope.clause}` , p);
    const r = result.rows[0] ?? {};
    const total = Number(r.total_fleet || 0);
    const moving = Number(r.moving || 0);
    const offline = Number(r.offline || 0);
    const distance = Number(r.distance_km || 0);
    const tripSeconds = Number(r.trip_seconds || 0);
    res.json({ data: {
      period: { from: from.toISOString(), to: to.toISOString() },
      fleet: { total, moving, offline, emergency: Number(r.emergency || 0) },
      utilization: total ? moving / total * 100 : 0,
      availability: total ? (total - offline) / total * 100 : 0,
      safetyExposure: Number(r.open_alerts || 0),
      fuelIntegrity: { openAnomalies: Number(r.open_fuel_anomalies || 0) },
      maintenance: { overdue: Number(r.overdue_maintenance || 0) },
      operations: { trips: Number(r.trips || 0), distanceKm: distance, tripHours: tripSeconds / 3600 },
      definitions: {
        utilization: 'moving vehicles / vehicles in scope × 100',
        availability: '(vehicles in scope − offline/no-GPS vehicles) / vehicles in scope × 100',
        safetyExposure: 'unacknowledged alerts for vehicles in scope',
      },
    }});
  } catch (error) { next(error); }
});

intelligenceRouter.get('/vehicles', async (req, res, next) => {
  try {
    const scope = vehicleScope(req, 'v');
    const result = await db.query(`
      SELECT v.id, v.registration_number, v.status, v.odometer_km,
        COALESCE((SELECT SUM(t.distance_km) FROM trips t WHERE t.vehicle_id=v.id AND t.started_at >= CURRENT_DATE - INTERVAL '30 days'),0) AS distance_km,
        COALESCE((SELECT SUM(ft.total_cost) FROM fuel_transactions ft WHERE ft.vehicle_id=v.id AND ft.occurred_at >= CURRENT_DATE - INTERVAL '30 days'),0) AS fuel_cost,
        COALESCE((SELECT SUM(m.actual_cost) FROM maintenance_records m WHERE m.vehicle_id=v.id AND m.status='completed' AND m.performed_at >= CURRENT_DATE - INTERVAL '30 days'),0) AS maintenance_cost,
        (SELECT COUNT(*) FROM fuel_anomalies fa WHERE fa.vehicle_id=v.id AND fa.resolved_at IS NULL) AS fuel_anomalies,
        (SELECT COUNT(*) FROM driver_events de WHERE de.vehicle_id=v.id AND de.occurred_at >= CURRENT_DATE - INTERVAL '30 days') AS driver_events,
        (SELECT COUNT(*) FROM maintenance_records mr WHERE mr.vehicle_id=v.id AND mr.status IN ('scheduled','due_soon','overdue','in_progress') AND ((mr.due_at IS NOT NULL AND mr.due_at < CURRENT_DATE) OR (mr.due_odometer_km IS NOT NULL AND v.odometer_km >= mr.due_odometer_km))) AS overdue_maintenance
      FROM vehicles v WHERE ${scope.clause} ORDER BY v.registration_number`, scope.params);
    res.json({ data: result.rows.map((r) => {
      const distance = Number(r.distance_km || 0);
      const fuel = Number(r.fuel_cost || 0);
      const maintenance = Number(r.maintenance_cost || 0);
      const risk = Number(r.fuel_anomalies) * 30 + Number(r.driver_events) * 2 + Number(r.overdue_maintenance) * 20 + (r.status === 'offline' || r.status === 'no_gps' ? 15 : 0);
      return { ...r, distance_km: distance, fuel_cost: fuel, maintenance_cost: maintenance, total_cost: fuel + maintenance, cost_per_km: distance ? (fuel + maintenance) / distance : 0, intelligence_risk_score: risk };
    }) });
  } catch (error) { next(error); }
});

intelligenceRouter.get('/recommendations', async (req, res, next) => {
  try {
    const scope = vehicleScope(req, 'v');
    const result = await db.query(`
      SELECT v.id, v.registration_number, v.status,
        (SELECT COUNT(*) FROM fuel_anomalies fa WHERE fa.vehicle_id=v.id AND fa.resolved_at IS NULL) AS fuel_anomalies,
        (SELECT COUNT(*) FROM driver_events de WHERE de.vehicle_id=v.id AND de.occurred_at >= CURRENT_DATE - INTERVAL '30 days') AS driver_events,
        (SELECT COUNT(*) FROM maintenance_records mr WHERE mr.vehicle_id=v.id AND mr.status IN ('scheduled','due_soon','overdue','in_progress') AND ((mr.due_at IS NOT NULL AND mr.due_at < CURRENT_DATE) OR (mr.due_odometer_km IS NOT NULL AND v.odometer_km >= mr.due_odometer_km))) AS overdue_maintenance
      FROM vehicles v WHERE ${scope.clause}`, scope.params);
    const recommendations: Array<Record<string, unknown>> = [];
    for (const r of result.rows) {
      const fuel = Number(r.fuel_anomalies || 0);
      const safety = Number(r.driver_events || 0);
      const maintenance = Number(r.overdue_maintenance || 0);
      if (fuel) recommendations.push({ vehicleId: r.id, registrationNumber: r.registration_number, priority: fuel > 1 ? 'high' : 'medium', action: 'Investigate fuel anomaly', reason: `${fuel} unresolved fuel anomaly/anomalies require review.` });
      if (maintenance) recommendations.push({ vehicleId: r.id, registrationNumber: r.registration_number, priority: maintenance > 1 ? 'high' : 'medium', action: 'Schedule maintenance', reason: `${maintenance} maintenance item(s) are overdue.` });
      if (safety >= 5) recommendations.push({ vehicleId: r.id, registrationNumber: r.registration_number, priority: 'medium', action: 'Review driver safety performance', reason: `${safety} driver events were recorded in the last 30 days.` });
      if (r.status === 'offline' || r.status === 'no_gps') recommendations.push({ vehicleId: r.id, registrationNumber: r.registration_number, priority: 'high', action: 'Restore GPS connectivity', reason: 'Vehicle is currently offline or has no GPS signal.' });
    }
    recommendations.sort((a, b) => String(a.priority).localeCompare(String(b.priority)));
    res.json({ data: recommendations });
  } catch (error) { next(error); }
});

export default intelligenceRouter;
