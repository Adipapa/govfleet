import { db } from '../../db/client.js';

const DUE_SOON_DAYS = 30;
const DUE_SOON_KM = 1000;
const ALERT_DEDUPE_HOURS = 24;

export async function evaluateMaintenance(vehicleId: string, recordedAt: Date, odometerKm: number | null): Promise<void> {
  const records = await db.query<{
    id: string;
    category: string;
    due_at: string | null;
    due_odometer_km: string | null;
    priority: string;
    agency_id: string | null;
    registration_number: string;
  }>(
    `SELECT mr.id, mr.category, mr.due_at, mr.due_odometer_km, mr.priority,
            v.agency_id, v.registration_number
     FROM maintenance_records mr
     JOIN vehicles v ON v.id = mr.vehicle_id
     WHERE mr.vehicle_id = $1 AND mr.status IN ('scheduled','due_soon','overdue','in_progress')`,
    [vehicleId],
  );

  for (const record of records.rows) {
    const dueByDate = record.due_at ? new Date(`${record.due_at}T23:59:59Z`) : null;
    const dueByKm = record.due_odometer_km == null ? null : Number(record.due_odometer_km);
    const overdue = Boolean((dueByDate && recordedAt > dueByDate) || (dueByKm != null && odometerKm != null && odometerKm >= dueByKm));
    const dueSoon = !overdue && Boolean(
      (dueByDate && dueByDate.getTime() - recordedAt.getTime() <= DUE_SOON_DAYS * 86400000) ||
      (dueByKm != null && odometerKm != null && odometerKm >= dueByKm - DUE_SOON_KM),
    );
    if (!overdue && !dueSoon) continue;

    const type = overdue ? 'maintenance_overdue' : 'maintenance_due_soon';
    const recent = await db.query<{ id: string }>(
      `SELECT id FROM alerts WHERE vehicle_id=$1 AND type=$2 AND occurred_at >= $3 - ($4 * interval '1 hour') LIMIT 1`,
      [vehicleId, type, recordedAt, ALERT_DEDUPE_HOURS],
    );
    if (recent.rows[0]) continue;

    const severity = overdue ? (record.priority === 'critical' ? 'critical' : 'high') : (record.priority === 'high' || record.priority === 'critical' ? 'high' : 'medium');
    const trigger = overdue
      ? `Service is overdue${dueByKm != null && odometerKm != null ? ` at ${odometerKm.toFixed(0)} km` : ''}.`
      : `Service is due within ${DUE_SOON_DAYS} days or ${DUE_SOON_KM.toLocaleString()} km.`;
    await db.query(
      `INSERT INTO alerts(vehicle_id, agency_id, type, severity, title, message, occurred_at, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [vehicleId, record.agency_id, type, severity, overdue ? 'Maintenance overdue' : 'Maintenance due soon', `${record.registration_number}: ${record.category}. ${trigger}`, recordedAt, { maintenanceId: record.id, category: record.category, dueAt: record.due_at, dueOdometerKm: dueByKm }],
    );
  }
}
