import { Router } from 'express';
import { db } from '../../db/client.js';
import { authenticateDevice } from '../devices/credentials.js';
import { processTelemetry } from './processor.js';
import { analyzeFuel } from '../fuel/engine.js';
import { publishFleetEvent } from '../../realtime/eventBus.js';

aexport const telemetryIngestRouter = Router();

type TelemetryPayload = {
  recordedAt?: string;
  latitude: number;
  longitude: number;
  speedKmh?: number;
  heading?: number;
  ignition?: boolean;
  odometerKm?: number;
  fuelLitres?: number;
  batteryVoltage?: number;
  satellites?: number;
  gsmSignal?: number;
  rawPayload?: Record<string, unknown>;
};

function validCoordinate(latitude: number, longitude: number) {
  return Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

function optionalNumber(value: unknown, name: string, min?: number, max?: number): number | null {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || (min !== undefined && parsed < min) || (max !== undefined && parsed > max)) throw new Error(`Invalid ${name}`);
  return parsed;
}

telemetryIngestRouter.post('/telemetry', async (req, res, next) => {
  try {
    const deviceIdentifier = req.header('x-device-id');
    const token = req.header('x-device-token');
    if (!deviceIdentifier || !token) return res.status(401).json({ error: 'Device credentials required' });
    const deviceId = await authenticateDevice(deviceIdentifier, token);
    if (!deviceId) return res.status(401).json({ error: 'Invalid device credentials' });

    const b = req.body as Partial<TelemetryPayload>;
    const latitude = Number(b.latitude);
    const longitude = Number(b.longitude);
    if (!validCoordinate(latitude, longitude)) return res.status(400).json({ error: 'Valid latitude and longitude are required' });

    const speed = optionalNumber(b.speedKmh, 'speedKmh', 0, 350);
    const heading = optionalNumber(b.heading, 'heading', 0, 360);
    const odometerKm = optionalNumber(b.odometerKm, 'odometerKm', 0, 10_000_000);
    const fuelLitres = optionalNumber(b.fuelLitres, 'fuelLitres', 0, 10_000);
    const batteryVoltage = optionalNumber(b.batteryVoltage, 'batteryVoltage', 0, 100);
    const satellites = optionalNumber(b.satellites, 'satellites', 0, 100);
    const gsmSignal = optionalNumber(b.gsmSignal, 'gsmSignal', 0, 100);
    const ignition = b.ignition === undefined ? null : Boolean(b.ignition);
    const status = speed !== null && speed > 3 ? 'moving' : ignition ? 'idling' : 'stopped';

    const assignment = await db.query<{ vehicle_id: string }>(
      `SELECT vehicle_id FROM vehicle_device_assignments
       WHERE device_id = $1 AND starts_at <= now() AND (ends_at IS NULL OR ends_at > now())
       ORDER BY starts_at DESC LIMIT 1`, [deviceId]);
    if (!assignment.rows[0]) return res.status(409).json({ error: 'Device is not assigned to a vehicle' });
    const vehicleId = assignment.rows[0].vehicle_id;

    const recordedAt = b.recordedAt ? new Date(b.recordedAt) : new Date();
    if (Number.isNaN(recordedAt.getTime())) return res.status(400).json({ error: 'Invalid recordedAt timestamp' });
    const now = Date.now();
    if (recordedAt.getTime() > now + 5 * 60_000) return res.status(400).json({ error: 'Telemetry timestamp is too far in the future' });
    if (recordedAt.getTime() < now - 30 * 24 * 60 * 60_000) return res.status(400).json({ error: 'Telemetry timestamp is too old' });

    const client = await db.connect();
    let telemetryId: string;
    try {
      await client.query('BEGIN');
      const telemetry = await client.query<{ id: string }>(`INSERT INTO telemetry
        (device_id, vehicle_id, recorded_at, latitude, longitude, speed_kmh, heading, ignition,
         odometer_km, fuel_litres, battery_voltage, satellites, gsm_signal, raw_payload)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`, [
        deviceId, vehicleId, recordedAt, latitude, longitude,
        speed, heading, ignition, odometerKm, fuelLitres, batteryVoltage, satellites, gsmSignal,
        b.rawPayload ?? {},
      ]);
      telemetryId = telemetry.rows[0].id;
      await client.query(`UPDATE devices SET status = 'active', last_heartbeat_at = now(), updated_at = now() WHERE id = $1`, [deviceId]);
      await client.query(`UPDATE vehicles SET status = $1, odometer_km = COALESCE($2, odometer_km), updated_at = now() WHERE id = $3`, [status, odometerKm, vehicleId]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }

    try {
      await processTelemetry({ telemetryId, vehicleId, recordedAt, latitude, longitude, speedKmh: speed, heading, ignition, odometerKm, fuelLitres });
      await analyzeFuel({ telemetryId, vehicleId, recordedAt, latitude, longitude, speedKmh: speed, ignition, odometerKm, fuelLitres });
    } catch (processingError) {
      console.error('Telemetry processing failed', { telemetryId, vehicleId, error: processingError });
    }

    publishFleetEvent({
      type: 'telemetry.updated',
      occurredAt: recordedAt.toISOString(),
      payload: { telemetryId, vehicleId, deviceId, latitude, longitude, speedKmh: speed, heading, ignition, odometerKm, fuelLitres, status },
    });

    const generatedAlerts = await db.query<{
      id: string; type: string; severity: string; title: string; message: string; occurred_at: Date;
    }>(
      `SELECT id, type, severity, title, message, occurred_at FROM alerts
       WHERE vehicle_id = $1 AND occurred_at = $2 ORDER BY occurred_at`, [vehicleId, recordedAt],
    );
    for (const alert of generatedAlerts.rows) {
      publishFleetEvent({
        type: 'alert.created',
        occurredAt: alert.occurred_at.toISOString(),
        payload: { id: alert.id, vehicleId, type: alert.type, severity: alert.severity, title: alert.title, message: alert.message },
      });
    }

    res.status(202).json({ accepted: true, telemetryId, vehicleId, status });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Invalid ')) return res.status(400).json({ error: error.message });
    next(error);
  }
});

export default telemetryIngestRouter;
