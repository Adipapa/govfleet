import { Router } from 'express';
import { db } from '../../db/client.js';
import { authenticateDevice } from '../devices/credentials.js';

export const telemetryIngestRouter = Router();

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

    const assignment = await db.query<{ vehicle_id: string }>(
      `SELECT vehicle_id FROM vehicle_device_assignments
       WHERE device_id = $1 AND starts_at <= now() AND (ends_at IS NULL OR ends_at > now())
       ORDER BY starts_at DESC LIMIT 1`, [deviceId]);
    if (!assignment.rows[0]) return res.status(409).json({ error: 'Device is not assigned to a vehicle' });
    const vehicleId = assignment.rows[0].vehicle_id;

    const recordedAt = b.recordedAt ? new Date(b.recordedAt) : new Date();
    if (Number.isNaN(recordedAt.getTime())) return res.status(400).json({ error: 'Invalid recordedAt timestamp' });

    const speed = b.speedKmh === undefined ? null : Number(b.speedKmh);
    const ignition = b.ignition === undefined ? null : Boolean(b.ignition);
    const status = speed !== null && speed > 3 ? 'moving' : ignition ? 'idling' : 'stopped';

    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const telemetry = await client.query<{ id: string }>(`INSERT INTO telemetry
        (device_id, vehicle_id, recorded_at, latitude, longitude, speed_kmh, heading, ignition,
         odometer_km, fuel_litres, battery_voltage, satellites, gsm_signal, raw_payload)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`, [
        deviceId, vehicleId, recordedAt, latitude, longitude,
        speed, b.heading === undefined ? null : Number(b.heading), ignition,
        b.odometerKm === undefined ? null : Number(b.odometerKm),
        b.fuelLitres === undefined ? null : Number(b.fuelLitres),
        b.batteryVoltage === undefined ? null : Number(b.batteryVoltage),
        b.satellites === undefined ? null : Number(b.satellites),
        b.gsmSignal === undefined ? null : Number(b.gsmSignal),
        b.rawPayload ?? {},
      ]);

      await client.query(`UPDATE devices SET status = 'active', last_heartbeat_at = now(), updated_at = now() WHERE id = $1`, [deviceId]);
      await client.query(`UPDATE vehicles SET status = $1, odometer_km = COALESCE($2, odometer_km), updated_at = now() WHERE id = $3`, [status, b.odometerKm ?? null, vehicleId]);
      await client.query('COMMIT');
      res.status(202).json({ accepted: true, telemetryId: telemetry.rows[0].id, vehicleId, status });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  } catch (error) { next(error); }
});

export default telemetryIngestRouter;
