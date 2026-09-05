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

function booleanField(value: unknown, name: string, fallback: boolean) {
  if (value === undefined) return fallback;
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1' || value === 'yes' || value === 'on') return true;
  if (value === 'false' || value === '0' || value === 'no' || value === 'off') return false;
  throw new Error(`${name} must be boolean`);
}

function validateScope(req: any, agencyId: string | null, departmentId: string | null) {
  if (req.auth?.roles?.includes('super_admin')) return;
  if (agencyId && agencyId !== req.auth?.agencyId) throw new Error('Geofence agency is outside your scope');
  if (departmentId && req.auth?.departmentId && departmentId !== req.auth.departmentId) throw new Error('Geofence department is outside your scope');
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
    const { name, category = 'government', agencyId = null, departmentId = null, speedLimitKmh, centerLat, centerLng, radiusM = 500 } = req.body ?? {};
    if (!String(name ?? '').trim()) return res.status(400).json({ error: 'name is required' });
    const lat = numberField(centerLat, 'centerLat', true); const lng = numberField(centerLng, 'centerLng', true); const radius = numberField(radiusM, 'radiusM', true); const speed = numberField(speedLimitKmh, 'speedLimitKmh');
    const restricted = booleanField(req.body?.restricted, 'restricted', false);
    const alertOnEntry = booleanField(req.body?.alertOnEntry, 'alertOnEntry', true);
    const alertOnExit = booleanField(req.body?.alertOnExit, 'alertOnExit', true);
    if (lat! < -90 || lat! > 90 || lng! < -180 || lng! > 180 || radius! <= 0 || radius! > 100000 || (speed !== null && (speed <= 0 || speed > 300))) return res.status(400).json({ error: 'Invalid geofence coordinates, radius, or speed limit' });
    try { validateScope(req, agencyId, departmentId); } catch (error) { return res.status(403).json({ error: error instanceof Error ? error.message : 'Geofence is outside your scope' }); }
    const result = await db.query(
      `INSERT INTO geofences (agency_id, department_id, name, category, restricted, alert_on_entry, alert_on_exit, speed_limit_kmh, center_lat, center_lng, radius_m, geometry, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, ST_Buffer(ST_SetSRID(ST_MakePoint($10,$9),4326)::geography,$11),$12)
       RETURNING id, agency_id, department_id, name, category, restricted, alert_on_entry, alert_on_exit, speed_limit_kmh, center_lat, center_lng, radius_m, active, created_at, updated_at`,
      [agencyId, departmentId, String(name).trim(), String(category), restricted, alertOnEntry, alertOnExit, speed, lat, lng, radius, req.auth!.id],
    );
    await writeAudit(req, 'geofence.create', 'geofence', result.rows[0].id, 'success');
    res.status(201).json({ data: result.rows[0] });
  } catch (error) { if (error instanceof Error && /required|must be numeric|must be boolean/.test(error.message)) return res.status(400).json({ error: error.message }); next(error); }
});

geofencesRouter.patch('/:id', requirePermission('fleet.write'), async (req, res, next) => {
  try {
    const scope = scopeFor(req);
    const idIndex = scope.params.length + 1;
    const params: unknown[] = [...scope.params, req.params.id];
    const fields: string[] = [];
    const current = await db.query(`SELECT g.agency_id, g.department_id, g.center_lat, g.center_lng, g.radius_m FROM geofences g WHERE g.id=$${idIndex} AND ${scope.clause}`, params);
    if (!current.rows[0]) return res.status(404).json({ error: 'Geofence not found' });
    const body = req.body ?? {};
    if (body.agencyId !== undefined) { validateScope(req, body.agencyId || null, body.departmentId !== undefined ? body.departmentId || null : current.rows[0].department_id); params.push(body.agencyId || null); fields.push(`agency_id=$${params.length}`); }
    if (body.departmentId !== undefined) { validateScope(req, body.agencyId !== undefined ? body.agencyId || null : current.rows[0].agency_id, body.departmentId || null); params.push(body.departmentId || null); fields.push(`department_id=$${params.length}`); }
    if (body.name !== undefined) { if (!String(body.name).trim()) return res.status(400).json({ error: 'name cannot be empty' }); params.push(String(body.name).trim()); fields.push(`name=$${params.length}`); }
    const stringFields: Array<[string,string]> = [['category','category']];
    for (const [key,column] of stringFields) if (body[key] !== undefined) { params.push(String(body[key])); fields.push(`${column}=$${params.length}`); }
    for (const [key,column] of [['speedLimitKmh','speed_limit_kmh'],['radiusM','radius_m']] as const) if (body[key] !== undefined) { const value = numberField(body[key], key, true)!; if (key === 'radiusM' && (value <= 0 || value > 100000)) return res.status(400).json({ error: 'radiusM must be between 1 and 100000' }); if (key === 'speedLimitKmh' && (value <= 0 || value > 300)) return res.status(400).json({ error: 'speedLimitKmh must be between 1 and 300' }); params.push(value); fields.push(`${column}=$${params.length}`); }
    for (const [key,column] of [['restricted','restricted'],['alertOnEntry','alert_on_entry'],['alertOnExit','alert_on_exit'],['active','active']] as const) if (body[key] !== undefined) { params.push(booleanField(body[key], key, false)); fields.push(`${column}=$${params.length}`); }
    const newLat = body.centerLat !== undefined ? numberField(body.centerLat,'centerLat',true)! : Number(current.rows[0].center_lat);
    const newLng = body.centerLng !== undefined ? numberField(body.centerLng,'centerLng',true)! : Number(current.rows[0].center_lng);
    const newRadius = body.radiusM !== undefined ? Number(body.radiusM) : Number(current.rows[0].radius_m);
    if (newLat < -90 || newLat > 90 || newLng < -180 || newLng > 180) return res.status(400).json({ error: 'Invalid geofence coordinates' });
    if (body.centerLat !== undefined) { params.push(newLat); fields.push(`center_lat=$${params.length}`); }
    if (body.centerLng !== undefined) { params.push(newLng); fields.push(`center_lng=$${params.length}`); }
    if (body.centerLat !== undefined || body.centerLng !== undefined || body.radiusM !== undefined) {
      params.push(newLng, newLat, newRadius);
      fields.push(`geometry=ST_Buffer(ST_SetSRID(ST_MakePoint($${params.length-2},$${params.length-1}),4326)::geography,$${params.length})`);
    }
    if (!fields.length) return res.status(400).json({ error: 'No changes supplied' });
    fields.push('updated_at=now()');
    const result = await db.query(`UPDATE geofences g SET ${fields.join(', ')} WHERE g.id=$${idIndex} AND ${scope.clause} RETURNING g.id, g.agency_id, g.department_id, g.name, g.category, g.restricted, g.alert_on_entry, g.alert_on_exit, g.speed_limit_kmh, g.center_lat, g.center_lng, g.radius_m, g.active, g.created_at, g.updated_at`, params);
    await writeAudit(req, 'geofence.update', 'geofence', result.rows[0].id, 'success');
    res.json({ data: result.rows[0] });
  } catch (error) { if (error instanceof Error && /must be numeric|must be boolean|outside your scope/.test(error.message)) return res.status(400).json({ error: error.message }); next(error); }
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
