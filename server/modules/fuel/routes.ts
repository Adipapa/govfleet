import { Router } from 'express';
import { db } from '../../db/client.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { vehicleScope } from '../../middleware/scope.js';
import { writeAudit } from '../audit/audit.js';

export const fuelRouter = Router();
fuelRouter.use(requireAuth);

fuelRouter.get('/vehicles/:vehicleId', requirePermission('fleet.read'), async (req, res, next) => {
  try {
    const scope = vehicleScope(req);
    const params = [...scope.params, req.params.vehicleId];
    const vehicle = await db.query('SELECT v.id, v.registration_number, v.tank_capacity_litres FROM vehicles v WHERE v.id=$' + params.length + ' AND ' + scope.clause, params);
    if (!vehicle.rows[0]) return res.status(404).json({ error: 'Vehicle not found' });
    const transactions = await db.query('SELECT id, vehicle_id, driver_id, transaction_type, occurred_at, odometer_km, fuel_before_litres, fuel_after_litres, quantity_litres, price_per_litre, total_cost, station_name, receipt_reference, notes, created_by FROM fuel_transactions WHERE vehicle_id=$1 ORDER BY occurred_at DESC LIMIT 100', [req.params.vehicleId]);
    const anomalies = await db.query('SELECT id, anomaly_type, occurred_at, litres_delta, expected_litres, severity, metadata, resolved_at FROM fuel_anomalies WHERE vehicle_id=$1 ORDER BY occurred_at DESC LIMIT 50', [req.params.vehicleId]);
    const summary = await db.query("SELECT COALESCE(SUM(quantity_litres),0) AS litres, COALESCE(SUM(total_cost),0) AS cost, COUNT(*) AS transactions FROM fuel_transactions WHERE vehicle_id=$1 AND transaction_type='refuel' AND occurred_at >= date_trunc('month', now())", [req.params.vehicleId]);
    res.json({ data: { vehicle: vehicle.rows[0], transactions: transactions.rows, anomalies: anomalies.rows, month: summary.rows[0] } });
  } catch (error) { next(error); }
});

fuelRouter.post('/vehicles/:vehicleId/refuels', requirePermission('fleet.write'), async (req, res, next) => {
  try {
    const scope = vehicleScope(req);
    const { quantityLitres, pricePerLitre, occurredAt, odometerKm, fuelBeforeLitres, fuelAfterLitres, stationName, receiptReference, notes } = req.body ?? {};
    const quantity = Number(quantityLitres);
    if (!Number.isFinite(quantity) || quantity <= 0) return res.status(400).json({ error: 'quantityLitres must be greater than zero' });
    const price = pricePerLitre == null ? null : Number(pricePerLitre);
    if (price != null && (!Number.isFinite(price) || price < 0)) return res.status(400).json({ error: 'pricePerLitre must be zero or greater' });
    const vehicleParams = [...scope.params, req.params.vehicleId];
    const vehicle = await db.query('SELECT v.id FROM vehicles v WHERE v.id=$' + vehicleParams.length + ' AND ' + scope.clause, vehicleParams);
    if (!vehicle.rows[0]) return res.status(404).json({ error: 'Vehicle not found' });
    const result = await db.query('INSERT INTO fuel_transactions (vehicle_id, transaction_type, occurred_at, odometer_km, fuel_before_litres, fuel_after_litres, quantity_litres, price_per_litre, station_name, receipt_reference, notes, created_by) VALUES ($1,\'refuel\',COALESCE($2,now()),$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *', [req.params.vehicleId, occurredAt ? new Date(occurredAt) : null, odometerKm ?? null, fuelBeforeLitres ?? null, fuelAfterLitres ?? null, quantity, price, stationName ?? null, receiptReference ?? null, notes ?? null, req.auth!.id]);
    await writeAudit(req, 'fuel.refuel.create', 'fuel_transaction', result.rows[0].id, 'success');
    res.status(201).json({ data: result.rows[0] });
  } catch (error) { next(error); }
});

fuelRouter.get('/anomalies', requirePermission('fleet.read'), async (req, res, next) => {
  try {
    const scope = vehicleScope(req, 'v');
    const limit = Math.min(Math.max(Number(req.query.limit ?? 100), 1), 500);
    const resolved = req.query.resolved === undefined ? null : req.query.resolved === 'true';
    const params = [...scope.params, resolved, limit];
    const resolvedIndex = scope.params.length + 1;
    const limitIndex = scope.params.length + 2;
    const result = await db.query(
      `SELECT fa.id, fa.vehicle_id, v.registration_number, fa.telemetry_id, fa.anomaly_type,
              fa.occurred_at, fa.litres_delta, fa.expected_litres, fa.severity, fa.metadata, fa.resolved_at
       FROM fuel_anomalies fa JOIN vehicles v ON v.id = fa.vehicle_id
       WHERE ${scope.clause}
         AND ($${resolvedIndex}::boolean IS NULL OR (fa.resolved_at IS NOT NULL) = $${resolvedIndex})
       ORDER BY fa.occurred_at DESC LIMIT $${limitIndex}`,
      params,
    );
    res.json({ data: result.rows });
  } catch (error) { next(error); }
});

fuelRouter.post('/anomalies/:anomalyId/resolve', requirePermission('fleet.write'), async (req, res, next) => {
  try {
    const scope = vehicleScope(req, 'v');
    const params = [...scope.params, req.params.anomalyId];
    const result = await db.query(
      `UPDATE fuel_anomalies fa SET resolved_at = COALESCE(fa.resolved_at, now())
       FROM vehicles v WHERE fa.vehicle_id = v.id AND fa.id = $${params.length} AND ${scope.clause}
       RETURNING fa.id, fa.vehicle_id, fa.anomaly_type, fa.occurred_at, fa.litres_delta, fa.expected_litres, fa.severity, fa.metadata, fa.resolved_at`,
      params,
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Fuel anomaly not found' });
    await writeAudit(req, 'fuel.anomaly.resolve', 'fuel_anomaly', result.rows[0].id, 'success');
    res.json({ data: result.rows[0] });
  } catch (error) { next(error); }
});

fuelRouter.get('/summary', requirePermission('fleet.read'), async (req, res, next) => {
  try {
    const scope = vehicleScope(req, 'v');
    const params = [...scope.params, req.query.from || null, req.query.to || null];
    const fromIndex = scope.params.length + 1;
    const toIndex = scope.params.length + 2;
    const anomalyScope = scope.clause.replaceAll('v.', 'av.');
    const result = await db.query(
      `SELECT COUNT(ft.id)::int AS transactions,
              COALESCE(SUM(CASE WHEN ft.transaction_type='refuel' THEN ft.quantity_litres ELSE 0 END),0) AS litres,
              COALESCE(SUM(CASE WHEN ft.transaction_type='refuel' THEN ft.total_cost ELSE 0 END),0) AS cost,
              COUNT(DISTINCT CASE WHEN ft.transaction_type='refuel' THEN ft.vehicle_id END)::int AS vehicles,
              (SELECT COUNT(*)::int FROM fuel_anomalies fa JOIN vehicles av ON av.id=fa.vehicle_id WHERE ${anomalyScope} AND fa.resolved_at IS NULL) AS open_anomalies,
              (SELECT COUNT(*)::int FROM fuel_anomalies fa JOIN vehicles av ON av.id=fa.vehicle_id WHERE ${anomalyScope} AND fa.occurred_at >= COALESCE($${fromIndex}::timestamptz, date_trunc('month',now())) AND fa.occurred_at < COALESCE($${toIndex}::timestamptz, now())) AS anomalies
       FROM vehicles v LEFT JOIN fuel_transactions ft ON ft.vehicle_id=v.id
       WHERE ${scope.clause}
         AND (ft.id IS NULL OR (ft.transaction_type='refuel' AND ft.occurred_at >= COALESCE($${fromIndex}::timestamptz, date_trunc('month',now())) AND ft.occurred_at < COALESCE($${toIndex}::timestamptz, now())))`,
      params,
    );
    res.json({ data: result.rows[0] });
  } catch (error) { next(error); }
});

export default fuelRouter;
