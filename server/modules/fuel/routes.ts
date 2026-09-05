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
    const result = await db.query('INSERT INTO fuel_transactions (vehicle_id, transaction_type, occurred_at, odometer_km, fuel_before_litres, fuel_after_litres, quantity_litres, price_per_litre, station_name, receipt_reference, notes, created_by) VALUES ($1,\'refuel\',COALESCE($2,now()),$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *', [req.params.vehicleId, occurredAt ? new Date(occurredAt) : null, odometerKm ?? null, fuelBeforeLitres ?? null, fuelAfterLitres ?? null, quantity, price, stationName ?? null, receiptReference ?? null, notes ?? null, req.auth!.userId]);
    await writeAudit(req, 'fuel.refuel.create', 'fuel_transaction', result.rows[0].id, 'success');
    res.status(201).json({ data: result.rows[0] });
  } catch (error) { next(error); }
});

fuelRouter.get('/summary', requirePermission('fleet.read'), async (req, res, next) => {
  try {
    const scope = vehicleScope(req);
    const result = await db.query("SELECT COUNT(*)::int AS transactions, COALESCE(SUM(ft.quantity_litres),0) AS litres, COALESCE(SUM(ft.total_cost),0) AS cost, COUNT(DISTINCT ft.vehicle_id)::int AS vehicles FROM fuel_transactions ft JOIN vehicles v ON v.id=ft.vehicle_id WHERE " + scope.clause + " AND ft.transaction_type='refuel' AND ft.occurred_at >= COALESCE($1::timestamptz, date_trunc('month',now())) AND ft.occurred_at < COALESCE($2::timestamptz, now())", [req.query.from || null, req.query.to || null, ...scope.params]);
    res.json({ data: result.rows[0] });
  } catch (error) { next(error); }
});

export default fuelRouter;