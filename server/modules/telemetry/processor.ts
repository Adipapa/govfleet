import { db } from '../../db/client.js';

type Point = {
  telemetryId: string;
  vehicleId: string;
  recordedAt: Date;
  latitude: number;
  longitude: number;
  speedKmh: number | null;
  heading: number | null;
  ignition: boolean | null;
  odometerKm: number | null;
  fuelLitres: number | null;
};

const OVERSPEED_DEFAULT_KMH = 80;
const MOVING_KMH = 3;
const IDLE_SECONDS = 300;
const AFTER_HOURS_START = 21;
const AFTER_HOURS_END = 6;
const HARSH_ACCEL_KMH_S = 3.0;
const HARSH_BRAKE_KMH_S = -4.0;

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const r = 6371.0088;
  const dLat = (bLat - aLat) * Math.PI / 180;
  const dLng = (bLng - aLng) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * Math.PI / 180) * Math.cos(bLat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(x));
}

function isAfterHours(date: Date): boolean {
  const hour = date.getUTCHours();
  return hour >= AFTER_HOURS_START || hour < AFTER_HOURS_END;
}

async function currentDriver(vehicleId: string, at: Date): Promise<string | null> {
  const result = await db.query<{ driver_id: string }>(
    `SELECT driver_id FROM vehicle_driver_assignments
     WHERE vehicle_id = $1 AND starts_at <= $2 AND (ends_at IS NULL OR ends_at > $2)
     ORDER BY starts_at DESC LIMIT 1`, [vehicleId, at],
  );
  return result.rows[0]?.driver_id ?? null;
}

async function openTrip(vehicleId: string) {
  const result = await db.query<{ id: string; started_at: Date; distance_km: string; idle_seconds: number; max_speed_kmh: string | null; fuel_consumed_litres: string | null }>(
    `SELECT id, started_at, distance_km, idle_seconds, max_speed_kmh, fuel_consumed_litres
     FROM trips WHERE vehicle_id = $1 AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1`, [vehicleId],
  );
  return result.rows[0] ?? null;
}

async function previousPoint(vehicleId: string, at: Date) {
  const result = await db.query<Point>(
    `SELECT id::text AS "telemetryId", vehicle_id AS "vehicleId", recorded_at AS "recordedAt",
            latitude, longitude, speed_kmh AS "speedKmh", heading, ignition,
            odometer_km AS "odometerKm", fuel_litres AS "fuelLitres"
     FROM telemetry WHERE vehicle_id = $1 AND recorded_at < $2
     ORDER BY recorded_at DESC LIMIT 1`, [vehicleId, at],
  );
  return result.rows[0] ?? null;
}

async function createAlert(point: Point, driverId: string | null, type: string, severity: 'low' | 'medium' | 'high' | 'critical', title: string, message: string, metadata: Record<string, unknown> = {}) {
  const vehicle = await db.query<{ agency_id: string }>('SELECT agency_id FROM vehicles WHERE id = $1', [point.vehicleId]);
  await db.query(
    `INSERT INTO alerts(vehicle_id, driver_id, agency_id, type, severity, title, message, occurred_at, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [point.vehicleId, driverId, vehicle.rows[0]?.agency_id ?? null, type, severity, title, message, point.recordedAt, metadata],
  );
}

async function createTelemetryEvent(point: Point, driverId: string | null, eventType: string, severity: 'low' | 'medium' | 'high' | 'critical', value?: number | null, threshold?: number | null, metadata: Record<string, unknown> = {}) {
  await db.query(
    `INSERT INTO telemetry_events(telemetry_id, vehicle_id, driver_id, event_type, severity, occurred_at, value, threshold, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [point.telemetryId, point.vehicleId, driverId, eventType, severity, point.recordedAt, value ?? null, threshold ?? null, metadata],
  );
}

async function createDriverEvent(point: Point, driverId: string | null, eventType: string, severity: 'low' | 'medium' | 'high' | 'critical', value: number, threshold: number, metadata: Record<string, unknown> = {}) {
  if (!driverId) return;
  await db.query(
    `INSERT INTO driver_events(vehicle_id, driver_id, telemetry_id, event_type, severity, occurred_at, value, threshold, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [point.vehicleId, driverId, point.telemetryId, eventType, severity, point.recordedAt, value, threshold, metadata],
  );
}

async function processGeofences(point: Point) {
  const inside = await db.query<{ id: string; name: string; restricted: boolean; speed_limit_kmh: string | null }>(
    `SELECT id, name, restricted, speed_limit_kmh
     FROM geofences
     WHERE (agency_id IS NULL OR agency_id = (SELECT agency_id FROM vehicles WHERE id = $1))
       AND ST_Contains(geometry::geometry, ST_SetSRID(ST_MakePoint($2,$3),4326))`,
    [point.vehicleId, point.longitude, point.latitude],
  );

  for (const fence of inside.rows) {
    if (fence.restricted) {
      const recent = await db.query<{ id: string }>(
        `SELECT id FROM geofence_events WHERE geofence_id = $1 AND vehicle_id = $2 AND event_type = 'entry'
         AND occurred_at > $3 - interval '10 minutes' ORDER BY occurred_at DESC LIMIT 1`,
        [fence.id, point.vehicleId, point.recordedAt],
      );
      if (!recent.rows[0]) {
        await db.query(
          `INSERT INTO geofence_events(geofence_id, vehicle_id, event_type, occurred_at, latitude, longitude)
           VALUES ($1,$2,'entry',$3,$4,$5)`, [fence.id, point.vehicleId, point.recordedAt, point.latitude, point.longitude],
        );
        const driverId = await currentDriver(point.vehicleId, point.recordedAt);
        await createAlert(point, driverId, 'geofence_breach', 'high', 'Restricted zone entry', `${fence.name} was entered by the vehicle.`, { geofenceId: fence.id });
      }
    }

    if (fence.speed_limit_kmh && point.speedKmh !== null && point.speedKmh > Number(fence.speed_limit_kmh)) {
      await createTelemetryEvent(point, await currentDriver(point.vehicleId, point.recordedAt), 'geofence_overspeed', 'medium', point.speedKmh, Number(fence.speed_limit_kmh), { geofenceId: fence.id });
    }
  }
}

export async function processTelemetry(point: Point): Promise<void> {
  const driverId = await currentDriver(point.vehicleId, point.recordedAt);
  const previous = await previousPoint(point.vehicleId, point.recordedAt);
  const dtSeconds = previous ? Math.max(1, (point.recordedAt.getTime() - previous.recordedAt.getTime()) / 1000) : 0;
  const distanceKm = previous ? haversineKm(previous.latitude, previous.longitude, point.latitude, point.longitude) : 0;
  const speed = point.speedKmh ?? 0;
  const previousSpeed = previous?.speedKmh ?? speed;
  const acceleration = dtSeconds ? (speed - previousSpeed) / dtSeconds : 0;

  let trip = await openTrip(point.vehicleId);
  if (speed > MOVING_KMH && !trip) {
    const created = await db.query<{ id: string }>(
      `INSERT INTO trips(vehicle_id, driver_id, started_at, start_lat, start_lng, max_speed_kmh, average_speed_kmh)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [point.vehicleId, driverId, point.recordedAt, point.latitude, point.longitude, speed, speed],
    );
    trip = { id: created.rows[0].id, started_at: point.recordedAt, distance_km: '0', idle_seconds: 0, max_speed_kmh: String(speed), fuel_consumed_litres: null };
  }

  if (trip) {
    const durationSeconds = Math.max(0, Math.round((point.recordedAt.getTime() - new Date(trip.started_at).getTime()) / 1000));
    const idleIncrement = point.ignition && speed <= MOVING_KMH ? Math.min(Math.max(Math.round(dtSeconds), 0), 300) : 0;
    const previousFuel = previous?.fuelLitres;
    const fuelConsumed = previousFuel !== null && previousFuel !== undefined && point.fuelLitres !== null && point.fuelLitres !== undefined
      ? Math.max(0, previousFuel - point.fuelLitres)
      : 0;
    const distance = Number(trip.distance_km) + Math.min(distanceKm, 10);
    const maxSpeed = Math.max(Number(trip.max_speed_kmh ?? 0), speed);
    const avgSpeed = durationSeconds > 0 ? distance / (durationSeconds / 3600) : speed;
    await db.query(
      `UPDATE trips SET driver_id = COALESCE($2, driver_id), distance_km = $3, duration_seconds = $4,
       idle_seconds = idle_seconds + $5, max_speed_kmh = $6, average_speed_kmh = $7,
       fuel_consumed_litres = COALESCE(fuel_consumed_litres,0) + $8 WHERE id = $1`,
      [trip.id, driverId, distance, durationSeconds, idleIncrement, maxSpeed, avgSpeed, fuelConsumed],
    );
    await db.query(
      `INSERT INTO trip_points(trip_id, telemetry_id, recorded_at, latitude, longitude, speed_kmh, ignition, fuel_litres)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (telemetry_id) DO NOTHING`,
      [trip.id, point.telemetryId, point.recordedAt, point.latitude, point.longitude, point.speedKmh, point.ignition, point.fuelLitres],
    );

    if (speed <= MOVING_KMH && point.ignition === false && previous && previous.speedKmh !== null && previous.speedKmh <= MOVING_KMH) {
      await db.query(
        `UPDATE trips SET ended_at = $2, end_lat = $3, end_lng = $4 WHERE id = $1`,
        [trip.id, point.recordedAt, point.latitude, point.longitude],
      );
    }
  }

  if (speed > OVERSPEED_DEFAULT_KMH) {
    await createTelemetryEvent(point, driverId, 'overspeed', 'high', speed, OVERSPEED_DEFAULT_KMH);
    await createDriverEvent(point, driverId, 'overspeed', 'high', speed, OVERSPEED_DEFAULT_KMH);
    await createAlert(point, driverId, 'overspeed', 'high', 'Overspeed detected', `Vehicle speed reached ${speed.toFixed(1)} km/h.`, { thresholdKmh: OVERSPEED_DEFAULT_KMH });
  }

  if (acceleration >= HARSH_ACCEL_KMH_S) {
    await createTelemetryEvent(point, driverId, 'harsh_acceleration', 'medium', acceleration, HARSH_ACCEL_KMH_S);
    await createDriverEvent(point, driverId, 'harsh_acceleration', 'medium', acceleration, HARSH_ACCEL_KMH_S);
  } else if (acceleration <= HARSH_BRAKE_KMH_S) {
    await createTelemetryEvent(point, driverId, 'harsh_braking', 'medium', acceleration, HARSH_BRAKE_KMH_S);
    await createDriverEvent(point, driverId, 'harsh_braking', 'medium', acceleration, HARSH_BRAKE_KMH_S);
  }

  if (point.ignition && speed <= MOVING_KMH && dtSeconds >= IDLE_SECONDS) {
    await createTelemetryEvent(point, driverId, 'excessive_idling', 'medium', dtSeconds, IDLE_SECONDS);
    await createAlert(point, driverId, 'excessive_idling', 'medium', 'Excessive idling', `Vehicle has remained idling for at least ${Math.round(dtSeconds / 60)} minutes.`, { durationSeconds: dtSeconds });
  }

  if (speed > MOVING_KMH && isAfterHours(point.recordedAt)) {
    await createTelemetryEvent(point, driverId, 'after_hours_movement', 'medium', speed, null);
    await createAlert(point, driverId, 'after_hours_movement', 'medium', 'After-hours movement', 'Vehicle movement detected outside the configured operating hours.', { speedKmh: speed });
  }

  // Fuel anomalies are handled exclusively by the Fuel Intelligence Engine.
  // Keeping fuel detection out of this general telemetry processor prevents duplicate
  // fuel-theft/refuel alerts and gives the fuel module one authoritative rule set.
  await processGeofences(point);

  await db.query(
    `UPDATE vehicles SET daily_km = daily_km + $2,
      idle_seconds_today = idle_seconds_today + CASE WHEN ignition = TRUE AND speed_kmh <= $3 THEN LEAST($4,300) ELSE 0 END,
      after_hours_seconds_today = after_hours_seconds_today + CASE WHEN speed_kmh > $3 AND $5 = TRUE THEN LEAST($4,300) ELSE 0 END,
      updated_at = now() WHERE id = $1`,
    [point.vehicleId, Math.min(distanceKm, 10), MOVING_KMH, Math.max(0, Math.round(dtSeconds)), isAfterHours(point.recordedAt)],
  );
}
