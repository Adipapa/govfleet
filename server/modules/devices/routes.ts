import { Router } from 'express';
import { db } from '../../db/client.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { vehicleScope } from '../../middleware/scope.js';
import { writeAudit } from '../audit/audit.js';
import { issueDeviceToken } from './credentials.js';

export const devicesRouter = Router();
devicesRouter.use(requireAuth);

devicesRouter.get('/', requirePermission('devices.read'), async (req, res, next) => {
  try {
    const scope = vehicleScope(req, 'v');
    const params = [...scope.params];
    const isSuperAdmin = req.auth!.roles.includes('super_admin');
    const where = isSuperAdmin ? 'TRUE' : `v.id IS NOT NULL AND ${scope.clause}`;
    const result = await db.query(`
      SELECT d.id, d.device_identifier, d.serial_number, d.manufacturer, d.model, d.protocol,
             d.firmware_version, d.status, d.last_heartbeat_at, v.id AS vehicle_id,
             v.registration_number, v.agency_id, v.department_id
      FROM devices d
      LEFT JOIN vehicle_device_assignments va ON va.device_id = d.id
        AND va.starts_at <= now() AND (va.ends_at IS NULL OR va.ends_at > now())
      LEFT JOIN vehicles v ON v.id = va.vehicle_id
      WHERE ${where}
      ORDER BY d.device_identifier`, params);
    res.json({ data: result.rows });
  } catch (error) { next(error); }
});

devicesRouter.post('/', requirePermission('devices.write'), async (req, res, next) => {
  try {
    const b = req.body ?? {};
    if (typeof b.deviceIdentifier !== 'string' || !b.deviceIdentifier.trim()) return res.status(400).json({ error: 'deviceIdentifier is required' });
    const result = await db.query(`INSERT INTO devices
      (device_identifier, serial_number, manufacturer, model, protocol, firmware_version)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [b.deviceIdentifier.trim(), b.serialNumber ?? null,
      b.manufacturer ?? null, b.model ?? null, b.protocol ?? null, b.firmwareVersion ?? null]);
    await writeAudit(req, 'device.create', 'device', result.rows[0].id, 'success', undefined, { deviceIdentifier: b.deviceIdentifier });
    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    if ((error as { code?: string }).code === '23505') return res.status(409).json({ error: 'Device identifier already exists' });
    next(error);
  }
});

devicesRouter.post('/:id/credentials', requirePermission('devices.write'), async (req, res, next) => {
  try {
    const scope = vehicleScope(req, 'v');
    const params = [...scope.params, req.params.id];
    const device = await db.query(`SELECT d.id FROM devices d
      JOIN vehicle_device_assignments va ON va.device_id = d.id AND va.starts_at <= now() AND (va.ends_at IS NULL OR va.ends_at > now())
      JOIN vehicles v ON v.id = va.vehicle_id
      WHERE d.id = $${params.length} AND ${scope.clause}`, params);
    if (!device.rows[0] && !req.auth!.roles.includes('super_admin')) return res.status(404).json({ error: 'Device not found or outside your scope' });
    const exists = await db.query('SELECT id FROM devices WHERE id = $1', [req.params.id]);
    if (!exists.rows[0]) return res.status(404).json({ error: 'Device not found' });
    const token = await issueDeviceToken(req.params.id);
    await writeAudit(req, 'device.credential.rotate', 'device', req.params.id, 'success');
    res.status(201).json({ token, warning: 'Store this token securely. It will not be shown again.' });
  } catch (error) { next(error); }
});

devicesRouter.post('/:id/assign', requirePermission('devices.write'), async (req, res, next) => {
  try {
    const { vehicleId } = req.body ?? {};
    if (typeof vehicleId !== 'string' || !vehicleId) return res.status(400).json({ error: 'vehicleId is required' });
    const scope = vehicleScope(req, 'v');
    const vehicle = await db.query(`SELECT v.id FROM vehicles v WHERE v.id = $${scope.nextIndex} AND ${scope.clause}`, [...scope.params, vehicleId]);
    if (!vehicle.rows[0]) return res.status(404).json({ error: 'Vehicle not found or outside your scope' });
    const device = await db.query('SELECT id FROM devices WHERE id = $1', [req.params.id]);
    if (!device.rows[0]) return res.status(404).json({ error: 'Device not found' });

    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query(`UPDATE vehicle_device_assignments SET ends_at = now() WHERE device_id = $1 AND ends_at IS NULL`, [req.params.id]);
      await client.query(`UPDATE vehicle_device_assignments SET ends_at = now() WHERE vehicle_id = $1 AND ends_at IS NULL`, [vehicleId]);
      const assignment = await client.query(`INSERT INTO vehicle_device_assignments(vehicle_id, device_id, starts_at, assigned_by)
        VALUES ($1,$2,now(),$3) RETURNING *`, [vehicleId, req.params.id, req.auth!.id]);
      await client.query('COMMIT');
      await writeAudit(req, 'device.assign', 'device', req.params.id, 'success', undefined, { vehicleId });
      res.status(201).json({ data: assignment.rows[0] });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  } catch (error) { next(error); }
});

export default devicesRouter;
