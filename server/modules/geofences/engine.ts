import { db } from '../../db/client.js';

type Point = { vehicleId: string; recordedAt: Date; latitude: number; longitude: number; speedKmh: number | null };

export async function evaluateGeofences(point: Point, driverId: string | null) {
  const current = await db.query<{ id: string; name: string; restricted: boolean; speed_limit_kmh: string | null; alert_on_entry: boolean; alert_on_exit: boolean }>(
    `SELECT id, name, restricted, speed_limit_kmh, alert_on_entry, alert_on_exit FROM geofences
     WHERE active=TRUE AND (agency_id IS NULL OR agency_id=(SELECT agency_id FROM vehicles WHERE id=$1))
       AND ST_Contains(geometry::geometry, ST_SetSRID(ST_MakePoint($2,$3),4326))`,
    [point.vehicleId, point.longitude, point.latitude],
  );
  const previous = await db.query<{ latitude: number; longitude: number }>(
    `SELECT latitude, longitude FROM telemetry WHERE vehicle_id=$1 AND recorded_at < $2 ORDER BY recorded_at DESC LIMIT 1`,
    [point.vehicleId, point.recordedAt],
  );
  const previousRows = previous.rows[0] ? await db.query<{ id: string }>(
    `SELECT id FROM geofences WHERE active=TRUE AND (agency_id IS NULL OR agency_id=(SELECT agency_id FROM vehicles WHERE id=$1))
     AND ST_Contains(geometry::geometry, ST_SetSRID(ST_MakePoint($2,$3),4326))`,
    [point.vehicleId, previous.rows[0].longitude, previous.rows[0].latitude],
  ) : { rows: [] as { id: string }[] };
  const currentIds = new Set(current.rows.map(f => f.id));
  const previousIds = new Set(previousRows.rows.map(f => f.id));

  for (const fence of current.rows) {
    if (!previousIds.has(fence.id) && fence.alert_on_entry) {
      await db.query(`INSERT INTO geofence_events(geofence_id,vehicle_id,event_type,occurred_at,latitude,longitude) VALUES($1,$2,'entry',$3,$4,$5)`, [fence.id, point.vehicleId, point.recordedAt, point.latitude, point.longitude]);
      if (fence.restricted) {
        const agency = await db.query<{ agency_id: string | null }>('SELECT agency_id FROM vehicles WHERE id=$1', [point.vehicleId]);
        await db.query(`INSERT INTO alerts(vehicle_id,driver_id,agency_id,type,severity,title,message,occurred_at,metadata) VALUES($1,$2,$3,'geofence_breach','high',$4,$5,$6,$7)`, [point.vehicleId, driverId, agency.rows[0]?.agency_id ?? null, 'Restricted zone entry', `${fence.name} was entered by the vehicle.`, point.recordedAt, { geofenceId: fence.id }]);
      }
    }
    if (fence.speed_limit_kmh && point.speedKmh !== null && point.speedKmh > Number(fence.speed_limit_kmh)) {
      await db.query(`INSERT INTO telemetry_events(telemetry_id,vehicle_id,driver_id,event_type,severity,occurred_at,value,threshold,metadata) SELECT id,$1,$2,'geofence_overspeed','medium',$3,$4,$5,$6 FROM telemetry WHERE id=(SELECT MAX(id) FROM telemetry WHERE vehicle_id=$1)`, [point.vehicleId, driverId, point.recordedAt, point.speedKmh, Number(fence.speed_limit_kmh), { geofenceId: fence.id }]);
    }
  }

  for (const fenceId of previousIds) if (!currentIds.has(fenceId)) {
    const fence = await db.query<{ name: string; alert_on_exit: boolean }>('SELECT name, alert_on_exit FROM geofences WHERE id=$1 AND active=TRUE', [fenceId]);
    if (fence.rows[0]?.alert_on_exit) await db.query(`INSERT INTO geofence_events(geofence_id,vehicle_id,event_type,occurred_at,latitude,longitude) VALUES($1,$2,'exit',$3,$4,$5)`, [fenceId, point.vehicleId, point.recordedAt, point.latitude, point.longitude]);
  }
}
