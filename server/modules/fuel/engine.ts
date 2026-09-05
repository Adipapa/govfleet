import { db } from '../../db/client.js';

type FuelPoint = {
  telemetryId: string;
  vehicleId: string;
  recordedAt: Date;
  latitude: number;
  longitude: number;
  speedKmh: number | null;
  ignition: boolean | null;
  odometerKm: number | null;
  fuelLitres: number | null;
};

type Severity = 'low' | 'medium' | 'high' | 'critical';

const MOVING_KMH = 3;
const MIN_FUEL_CHANGE_LITRES = 2;
const SUDDEN_DROP_MIN_LITRES = 5;
const SUDDEN_DROP_TANK_PERCENT = 0.08;
const ABNORMAL_CONSUMPTION_L_PER_100KM = 30;
const REFUEL_MATCH_WINDOW_MINUTES = 30;
const REFUEL_TOLERANCE = 0.20;
const DEDUPE_MINUTES = 30;

function distanceKm(a: FuelPoint, b: FuelPoint): number {
  if (a.odometerKm !== null && b.odometerKm !== null) {
    const delta = a.odometerKm - b.odometerKm;
    if (delta >= 0 && delta <= 100) return delta;
  }
  const r = 6371.0088;
  const dLat = (a.latitude - b.latitude) * Math.PI / 180;
  const dLng = (a.longitude - b.longitude) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(b.latitude * Math.PI / 180) * Math.cos(a.latitude * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(x));
}

async function previousFuelPoint(point: FuelPoint): Promise<FuelPoint | null> {
  const result = await db.query<FuelPoint>(
    `SELECT id::text AS "telemetryId", vehicle_id AS "vehicleId", recorded_at AS "recordedAt",
            latitude, longitude, speed_kmh AS "speedKmh", ignition,
            odometer_km AS "odometerKm", fuel_litres AS "fuelLitres"
     FROM telemetry
     WHERE vehicle_id = $1 AND recorded_at < $2 AND fuel_litres IS NOT NULL
     ORDER BY recorded_at DESC LIMIT 1`,
    [point.vehicleId, point.recordedAt],
  );
  return result.rows[0] ?? null;
}

async function tankCapacity(vehicleId: string): Promise<number | null> {
  const result = await db.query<{ tank_capacity_litres: string | null }>(
    'SELECT tank_capacity_litres FROM vehicles WHERE id = $1', [vehicleId],
  );
  const value = result.rows[0]?.tank_capacity_litres;
  return value == null ? null : Number(value);
}

async function recentlyRecorded(vehicleId: string, anomalyType: string, at: Date): Promise<boolean> {
  const result = await db.query<{ id: string }>(
    `SELECT id FROM fuel_anomalies
     WHERE vehicle_id = $1 AND anomaly_type = $2
       AND occurred_at >= $3 - ($4 * interval '1 minute')
       AND resolved_at IS NULL
     ORDER BY occurred_at DESC LIMIT 1`,
    [vehicleId, anomalyType, at, DEDUPE_MINUTES],
  );
  return Boolean(result.rows[0]);
}

async function recordAnomaly(point: FuelPoint, anomalyType: 'sudden_drop' | 'abnormal_consumption' | 'refuel_mismatch', severity: Severity, litresDelta: number | null, expectedLitres: number | null, metadata: Record<string, unknown>, title: string, message: string): Promise<void> {
  if (await recentlyRecorded(point.vehicleId, anomalyType, point.recordedAt)) return;

  const driver = await db.query<{ driver_id: string }>(
    `SELECT driver_id FROM vehicle_driver_assignments
     WHERE vehicle_id = $1 AND starts_at <= $2 AND (ends_at IS NULL OR ends_at > $2)
     ORDER BY starts_at DESC LIMIT 1`, [point.vehicleId, point.recordedAt],
  );
  const driverId = driver.rows[0]?.driver_id ?? null;
  const vehicle = await db.query<{ agency_id: string | null }>('SELECT agency_id FROM vehicles WHERE id = $1', [point.vehicleId]);

  await db.query(
    `INSERT INTO fuel_anomalies(vehicle_id, telemetry_id, anomaly_type, occurred_at, litres_delta, expected_litres, severity, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [point.vehicleId, point.telemetryId, anomalyType, point.recordedAt, litresDelta, expectedLitres, severity, metadata],
  );

  await db.query(
    `INSERT INTO alerts(vehicle_id, driver_id, agency_id, type, severity, title, message, occurred_at, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [point.vehicleId, driverId, vehicle.rows[0]?.agency_id ?? null, `fuel_${anomalyType}`, severity, title, message, point.recordedAt, metadata],
  );
}

async function checkRefuelMismatch(point: FuelPoint, fuelDelta: number): Promise<void> {
  if (fuelDelta <= MIN_FUEL_CHANGE_LITRES) return;
  const transaction = await db.query<{ id: string; quantity_litres: string }>(
    `SELECT id, quantity_litres FROM fuel_transactions
     WHERE vehicle_id = $1 AND transaction_type = 'refuel'
       AND occurred_at BETWEEN $2 - ($3 * interval '1 minute') AND $2 + ($3 * interval '1 minute')
     ORDER BY ABS(EXTRACT(EPOCH FROM (occurred_at - $2))) ASC LIMIT 1`,
    [point.vehicleId, point.recordedAt, REFUEL_MATCH_WINDOW_MINUTES],
  );
  if (!transaction.rows[0]) return;

  const recordedQuantity = Number(transaction.rows[0].quantity_litres);
  const difference = Math.abs(fuelDelta - recordedQuantity) / Math.max(recordedQuantity, 0.1);
  if (difference <= REFUEL_TOLERANCE) return;

  await recordAnomaly(
    point,
    'refuel_mismatch',
    difference > 0.5 ? 'high' : 'medium',
    fuelDelta,
    recordedQuantity,
    { transactionId: transaction.rows[0].id, telemetryIncreaseLitres: fuelDelta, recordedRefuelLitres: recordedQuantity, variancePercent: Math.round(difference * 100) },
    'Fuel refuel mismatch',
    `Telemetry shows a ${fuelDelta.toFixed(1)} L fuel increase, while the recorded refuel was ${recordedQuantity.toFixed(1)} L.`,
  );
}

export async function analyzeFuel(point: FuelPoint): Promise<void> {
  if (point.fuelLitres === null) return;
  const previous = await previousFuelPoint(point);
  if (!previous || previous.fuelLitres === null) return;

  const fuelDelta = point.fuelLitres - previous.fuelLitres;
  if (Math.abs(fuelDelta) < MIN_FUEL_CHANGE_LITRES) return;

  const distance = distanceKm(point, previous);
  const capacity = await tankCapacity(point.vehicleId);
  const suddenDropThreshold = Math.max(SUDDEN_DROP_MIN_LITRES, (capacity ?? 0) * SUDDEN_DROP_TANK_PERCENT);

  if (fuelDelta <= -suddenDropThreshold && (point.speedKmh ?? 0) <= MOVING_KMH && point.ignition !== true && distance < 0.5) {
    await recordAnomaly(
      point,
      'sudden_drop',
      Math.abs(fuelDelta) >= Math.max(15, (capacity ?? 0) * 0.2) ? 'critical' : 'high',
      fuelDelta,
      0,
      { previousFuelLitres: previous.fuelLitres, currentFuelLitres: point.fuelLitres, distanceKm: Number(distance.toFixed(3)), speedKmh: point.speedKmh, ignition: point.ignition },
      'Suspicious fuel level drop',
      `Fuel level dropped by ${Math.abs(fuelDelta).toFixed(1)} L while the vehicle was stationary.`,
    );
  }

  if ((point.speedKmh ?? 0) > MOVING_KMH && distance >= 2 && fuelDelta < 0) {
    const consumption = Math.abs(fuelDelta) / distance * 100;
    if (consumption > ABNORMAL_CONSUMPTION_L_PER_100KM) {
      await recordAnomaly(
        point,
        'abnormal_consumption',
        consumption > 50 ? 'high' : 'medium',
        fuelDelta,
        distance * ABNORMAL_CONSUMPTION_L_PER_100KM / 100,
        { distanceKm: Number(distance.toFixed(2)), consumptionLPer100Km: Number(consumption.toFixed(2)), thresholdLPer100Km: ABNORMAL_CONSUMPTION_L_PER_100KM },
        'Abnormal fuel consumption',
        `Observed fuel consumption is ${consumption.toFixed(1)} L/100 km over the latest movement interval.`,
      );
    }
  }

  await checkRefuelMismatch(point, fuelDelta);
}
