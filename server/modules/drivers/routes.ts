import { Router, type Request } from 'express';
import { db } from '../../db/client.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { writeAudit } from '../audit/audit.js';

export const driversRouter = Router();
driversRouter.use(requireAuth);

function scope(req: Request) {
  if (!req.auth) throw new Error('Authentication required');
  if (req.auth.roles.includes('super_admin')) return { clause: 'TRUE', params: [] as unknown[] };
  if (!req.auth.agencyId) return { clause: 'FALSE', params: [] as unknown[] };
  return {
    clause: `EXISTS (
      SELECT 1 FROM vehicle_driver_assignments vda
      JOIN vehicles v ON v.id = vda.vehicle_id
      WHERE vda.driver_id = dr.id AND v.agency_id = $1
        AND vda.starts_at <= now() AND (vda.ends_at IS NULL OR vda.ends_at > now())
    )`,
    params: [req.auth.agencyId] as unknown[],
  };
}

driversRouter.get('/', requirePermission('drivers.read'), async (req, res, next) => {
  try {
    const s = scope(req);
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const params = [...s.params];
    let where = `${s.clause}`;
    if (search) { params.push(search); where += ` AND (dr.full_name ILIKE '%' || $${params.length} || '%' OR dr.employee_number ILIKE '%' || $${params.length} || '%' OR dr.licence_number ILIKE '%' || $${params.length} || '%')`; }
    const result = await db.query(`SELECT dr.* FROM drivers dr WHERE ${where} ORDER BY dr.full_name`, params);
    res.json({ data: result.rows });
  } catch (error) { next(error); }
});

driversRouter.get('/:id', requirePermission('drivers.read'), async (req, res, next) => {
  try {
    const s = scope(req);
    const params = [...s.params, req.params.id];
    const result = await db.query(`SELECT dr.* FROM drivers dr WHERE dr.id = $${params.length} AND ${s.clause}`, params);
    if (!result.rows[0]) return res.status(404).json({ error: 'Driver not found' });
    res.json({ data: result.rows[0] });
  } catch (error) { next(error); }
});

driversRouter.post('/', requirePermission('drivers.write'), async (req, res, next) => {
  try {
    const b = req.body ?? {};
    if (typeof b.fullName !== 'string' || !b.fullName.trim()) return res.status(400).json({ error: 'fullName is required' });
    const result = await db.query(`INSERT INTO drivers(employee_number, full_name, phone, licence_number, licence_expiry)
      VALUES ($1,$2,$3,$4,$5) RETURNING *`, [b.employeeNumber ?? null, b.fullName.trim(), b.phone ?? null, b.licenceNumber ?? null, b.licenceExpiry ?? null]);
    await writeAudit(req, 'driver.create', 'driver', result.rows[0].id, 'success');
    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    if ((error as { code?: string }).code === '23505') return res.status(409).json({ error: 'Employee or licence number already exists' });
    next(error);
  }
});

export default driversRouter;
