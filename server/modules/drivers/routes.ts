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
    clause: 'dr.agency_id = $1',
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
    const result = await db.query(`SELECT dr.*, a.name AS agency_name FROM drivers dr LEFT JOIN agencies a ON a.id = dr.agency_id WHERE ${where} ORDER BY dr.full_name`, params);
    res.json({ data: result.rows });
  } catch (error) { next(error); }
});

driversRouter.get('/:id', requirePermission('drivers.read'), async (req, res, next) => {
  try {
    const s = scope(req);
    const params = [...s.params, req.params.id];
    const result = await db.query(`SELECT dr.*, a.name AS agency_name FROM drivers dr LEFT JOIN agencies a ON a.id = dr.agency_id WHERE dr.id = $${params.length} AND ${s.clause}`, params);
    if (!result.rows[0]) return res.status(404).json({ error: 'Driver not found' });
    res.json({ data: result.rows[0] });
  } catch (error) { next(error); }
});

driversRouter.post('/', requirePermission('drivers.write'), async (req, res, next) => {
  try {
    const b = req.body ?? {};
    if (typeof b.fullName !== 'string' || !b.fullName.trim()) return res.status(400).json({ error: 'fullName is required' });
    if (typeof b.agencyId !== 'string' || !b.agencyId.trim()) return res.status(400).json({ error: 'agencyId is required' });
    if (!req.auth!.roles.includes('super_admin') && b.agencyId !== req.auth!.agencyId) return res.status(403).json({ error: 'Driver agency is outside your scope' });

    const agency = await db.query('SELECT 1 FROM agencies WHERE id = $1 AND active = TRUE', [b.agencyId]);
    if (!agency.rows[0]) return res.status(400).json({ error: 'Invalid agency' });

    const result = await db.query(`INSERT INTO drivers(agency_id, employee_number, full_name, phone, licence_number, licence_expiry)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [b.agencyId, b.employeeNumber ?? null, b.fullName.trim(), b.phone ?? null, b.licenceNumber ?? null, b.licenceExpiry ?? null]);
    await writeAudit(req, 'driver.create', 'driver', result.rows[0].id, 'success', undefined, { agencyId: b.agencyId });
    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    if ((error as { code?: string }).code === '23505') return res.status(409).json({ error: 'Employee or licence number already exists' });
    next(error);
  }
});

export default driversRouter;
