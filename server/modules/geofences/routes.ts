import { Router } from 'express';
import { db } from '../../db/client.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { writeAudit } from '../audit/audit.js';

export const geofencesRouter = Router();
geofencesRouter.use(requireAuth);

function scopeFor(req: any, alias = 'g') {
  if (req.auth?.roles?.includes('super_admin')) return { clause: 'TRUE', params: [] as unknown[] };
  const params: unknown[] = [];
  const conditions: string[] = [];
  if (req.auth?.agencyId) { params.push(req.auth.agencyId); conditions.push(`(${alias}.agency_id IS NULL OR ${alias}.agency_id = $${params.length})`); }
  else conditions.push(`${alias}.agency_id IS NULL`);
  if (req.auth?.departmentId) { params.push(req.auth.departmentId); conditions.push(`(${alias}.department_id IS NULL OR ${alias}.department_id = $${params.length})`); }
  return { clause: conditions.join(' AND ') || 'FALSE', params };
}

function numberField(value: unknown, name: string, required = false) {
  if (value == null || value === '') { if (required) throw new Error(`${name} is required`); return null; }
  const n = Number(value); if (!Number.isFinite(n)) throw new Error(`${name} must be numeric`); return n;
}

geofencesRouter.get('/', requirePermission('fleet.read'), async (req, res, next) => {
  try {
    const scope = scopeFor(req);
    const active = req.query.active === undefined ? true : req.query.active === 'true';
    const params = [...scope.params, active];
    const result = await db.query(
      `SELECT g.id, g.agency_id, g.department_id, g.name, g.category, g.restricted,
              g.alert_on_entry, g.alert_on_exit, g.speed_limit_kmh, g.center_lat,
              g.center_lng, g.radius_m, g.active, g.created_at, g.updated_at
       FROM geofences g WHERE ${scope.clause} AND g.active = $${params.length}
       ORDER BY g.name ASC`, params,
    );
    res.json({ data: result.rows });
  } catch (error) { next(error); }
});

geofencesRouter.get('/:id/events', requirePermission('fleet.read'), async (req, res, next) => {
  try {
    const scope = scopeFor(req);
    const params = [...scope.params, req.params.id];
    const fence = await db.query(`SELECT g.id FROM geofences g WHERE g.id=$${params.length} AND ${scope.clause}`, params);
    if (!fence.rows[0]) return res.status(404).json({ error: 'Geofence not found' });
    const result = await db.query(
      `SELECT ge.id, ge.geofence_id, ge.vehicle_id, v.registration_number, ge.event_type,
              ge.occurred_at, ge.latitude, ge.longitude
       FROM geofence_events ge JOIN vehicles v ON v.id=ge.vehicle_id
       WHERE ge.geofence_id=$1 ORDER BY ge.occurred_at DESC LIMIT 200`, [req.params.id],
    );
    res.json({ data: result.rows });
  } catch (error) { next(error); }
});

geofencesRouter.post('/', requirePermission('fleet.write'), async (req, res, next) => {
  try {
    const { name, category = 'government', agencyId = null, departmentId = null, restricted = false, alertOnEntry = true, alertOnExit = true, speedLimitKmh, centerLat, centerLng, radiusM = 500 } = req.body ?? {};
    if (!String(name ?? '').trim()) return res.status(400).json({ error: 'name is required' });
    const lat = numberField(centerLat, 'centerLat', true); const lng = numberField(centerLng, 'centerLng', true); const radius = numberField(radiusM, 'radiusM', true);
    const speed = numberField(speedLimitKmh, 'speedLimitKmh');
    if (lat! < -90 || lat! > 90 || lng! < -180 || lng! > 180 || radius! <= 0 || radius! > 100000) return res.status(400).json({ error: 'Invalid geofence coordinates or radius' });
    const scope = scopeFor(req);
    if (!req.auth!.roles.includes('super_admin')) {
      if (agencyId && agencyId !== req.auth!.agencyId) return res.status(403).json({ error: 'Geofence agency is outside your scope' });
      if (departmentId && req.auth!.departmentId && departmentId !== req.auth!.departmentId) return res.status(403).json({ error: 'Geofence department is outside your scope' });
    }
    const result = await db.query(
      `INSERT INTO geofences (agency_id, department_id, name, category, restricted, alert_on_entry, alert_on_exit, speed_limit_kmh, center_lat, center_lng, radius_m, geometry, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, ST_Buffer(ST_SetSRID(ST_MakePoint($10,$9),4326)::geography,$11),$12)
       RETURNING id, agency_id, department_id, name, category, restricted, alert_on_entry, alert_on_exit, speed_limit_kmh, center_lat, center_lng, radius_m, active, created_at, updated_at`,
      [agencyId, departmentId, String(name).trim(), String(category), Boolean(restricted), Boolean(alertOnEntry), Boolean(alertOnExit), speed, lat, lng, radius, req.auth!.id],
    );
    await writeAudit(req, 'geofence.create', 'geofence', result.rows[0].id, 'success');
    res.status(201).json({ data: result.rows[0] });
  } catch (error) { if (error instanceof Error && /required|must be numeric/.test(error.message)) return res.status(400).json({ error: error.message }); next(error); }
});

geofencesRouter.patch('/:id', requirePermission('fleet.write'), async (req, res, next) => {
  try {
    const scope = scopeFor(req);
    const params: unknown[] = [...scope.params, req.params.id];
    const fields: string[] = [];
    const allowed: Array<[string,string]> = [['name','name'],['category','category'],['agencyId','agency_id'],['departmentId','department_id'],['restricted','restricted'],['alertOnEntry','alert_on_entry'],['alertOnExit','alert_on_exit'],['speedLimitKmh','speed_limit_kmh'],['radiusM','radius_m'],['active','active']];
    for (const [bodyKey, column] of allowed) if (req.body?.[bodyKey] !== undefined) { params.push(req.body[bodyKey]); fields.push(`${column}=$${params.length}`); }
    if (req.body?.centerLat !== undefined) { params.push(numberField(req.body.centerLat, 'centerLat', true)); fields.push(`center_lat=$${params.length}`); }
    if (req.body?.centerLng !== undefined) { params.push(numberField(req.body.centerLng, 'centerLng', true)); fields.push(`center_lng=$${params.length}`); }
    if (req.body?.centerLat !== undefined || req.body?.centerLng !== undefined || req.body?.radiusM !== undefined) {
      const latIdx = params.length - (req.body?.centerLng !== undefined ? 1 : 0);
      void latIdx;
      fields.push(`geometry=ST_Buffer(ST_SetSRID(ST_MakePoint(COALESCE($${params.length + 1}, center_lng), COALESCE($${params.length + 2}, center_lat)),4326)::geography, COALESCE($${params.length + 3}, radius_m))`);
      params.push(null, null, null);
    }
    if (!fields.length) return res.status(400).json({ error: 'No changes supplied' });
    fields.push('updated_at=now()');
    const idIndex = scope.params.length + 1;
    const result = await db.query(`UPDATE geofences g SET ${fields.join(', ')} WHERE g.id=$${idIndex} AND ${scope.clause} RETURNING g.id, g.agency_id, g.department_id, g.name, g.category, g.restricted, g.alert_on_entry, g.alert_on_exit, g.speed_limit_kmh, g.center_lat, g.center_lng, g.radius_m, g.active, g.created_at, g.updated_at`, params);
    if (!result.rows[0]) return res.status(404).json({ error: 'Geofence not found' });
    await writeAudit(req, 'geofence.update', 'geofence', result.rows[0].id, 'success');
    res.json({ data: result.rows[0] });
  } catch (error) { next(error); }
});

geofencesRouter.delete('/:id', requirePermission('fleet.write'), async (req, res, next) => {
  try {
    const scope = scopeFor(req); const params = [...scope.params, req.params.id];
    const result = await db.query(`UPDATE geofences g SET active=false, updated_at=now() WHERE g.id=$${params.length} AND ${scope.clause} RETURNING g.id`, params);
    if (!result.rows[0]) return res.status(404).json({ error: 'Geofence not found' });
    await writeAudit(req, 'geofence.delete', 'geofence', result.rows[0].id, 'success');
    res.status(204).send();
  } catch (error) { next(error); }
});

export default geofencesRouter;
