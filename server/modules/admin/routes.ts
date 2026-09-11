import { Router } from 'express';
import { db } from '../../db/client.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { hashPassword } from '../auth/auth.js';
import { writeAudit } from '../audit/audit.js';

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole('super_admin'));

adminRouter.get('/agencies', async (_req, res, next) => {
  try {
    const result = await db.query(`SELECT a.*, (SELECT count(*)::int FROM users u WHERE u.agency_id = a.id) AS user_count,
      (SELECT count(*)::int FROM vehicles v WHERE v.agency_id = a.id) AS vehicle_count
      FROM agencies a ORDER BY a.name`);
    res.json({ data: result.rows });
  } catch (error) { next(error); }
});

adminRouter.post('/agencies', async (req, res, next) => {
  try {
    const { name, code } = req.body ?? {};
    if (typeof name !== 'string' || !name.trim() || typeof code !== 'string' || !code.trim()) return res.status(400).json({ error: 'Agency name and code are required' });
    const result = await db.query(`INSERT INTO agencies(name, code) VALUES ($1,$2) RETURNING *`, [name.trim(), code.trim().toUpperCase()]);
    await writeAudit(req, 'agency.create', 'agency', result.rows[0].id, 'success', undefined, { name: name.trim(), code: code.trim().toUpperCase() });
    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    if ((error as { code?: string }).code === '23505') return res.status(409).json({ error: 'Agency name or code already exists' });
    next(error);
  }
});

adminRouter.patch('/agencies/:id', async (req, res, next) => {
  try {
    const fields: string[] = [];
    const params: unknown[] = [];
    if (typeof req.body?.name === 'string') { params.push(req.body.name.trim()); fields.push(`name = $${params.length}`); }
    if (typeof req.body?.code === 'string') { params.push(req.body.code.trim().toUpperCase()); fields.push(`code = $${params.length}`); }
    if (typeof req.body?.active === 'boolean') { params.push(req.body.active); fields.push(`active = $${params.length}`); }
    if (!fields.length) return res.status(400).json({ error: 'No supported fields supplied' });
    params.push(req.params.id);
    const result = await db.query(`UPDATE agencies SET ${fields.join(', ')}, updated_at = now() WHERE id = $${params.length} RETURNING *`, params);
    if (!result.rows[0]) return res.status(404).json({ error: 'Agency not found' });
    await writeAudit(req, 'agency.update', 'agency', req.params.id, 'success', undefined, { fields: Object.keys(req.body ?? {}) });
    res.json({ data: result.rows[0] });
  } catch (error) { next(error); }
});

adminRouter.get('/departments', async (req, res, next) => {
  try {
    const result = await db.query(`SELECT d.*, a.name AS agency_name FROM departments d JOIN agencies a ON a.id = d.agency_id
      WHERE ($1::uuid IS NULL OR d.agency_id = $1) ORDER BY a.name, d.name`, [req.query.agencyId || null]);
    res.json({ data: result.rows });
  } catch (error) { next(error); }
});

adminRouter.post('/departments', async (req, res, next) => {
  try {
    const { agencyId, name, code } = req.body ?? {};
    if (!agencyId || !name?.trim() || !code?.trim()) return res.status(400).json({ error: 'agencyId, name and code are required' });
    const result = await db.query(`INSERT INTO departments(agency_id, name, code) VALUES ($1,$2,$3) RETURNING *`, [agencyId, name.trim(), code.trim().toUpperCase()]);
    await writeAudit(req, 'department.create', 'department', result.rows[0].id, 'success', undefined, { agencyId, name: name.trim(), code: code.trim().toUpperCase() });
    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    if ((error as { code?: string }).code === '23505') return res.status(409).json({ error: 'Department code already exists in this agency' });
    next(error);
  }
});

adminRouter.patch('/departments/:id', async (req, res, next) => {
  try {
    const fields: string[] = [];
    const params: unknown[] = [];
    if (typeof req.body?.name === 'string') { params.push(req.body.name.trim()); fields.push(`name = $${params.length}`); }
    if (typeof req.body?.code === 'string') { params.push(req.body.code.trim().toUpperCase()); fields.push(`code = $${params.length}`); }
    if (typeof req.body?.active === 'boolean') { params.push(req.body.active); fields.push(`active = $${params.length}`); }
    if (!fields.length) return res.status(400).json({ error: 'No supported fields supplied' });
    params.push(req.params.id);
    const result = await db.query(`UPDATE departments SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING *`, params);
    if (!result.rows[0]) return res.status(404).json({ error: 'Department not found' });
    await writeAudit(req, 'department.update', 'department', req.params.id, 'success');
    res.json({ data: result.rows[0] });
  } catch (error) { next(error); }
});

adminRouter.get('/users', async (_req, res, next) => {
  try {
    const result = await db.query(`SELECT u.id, u.username, u.email, u.full_name, u.status, u.agency_id, a.name AS agency_name,
      u.department_id, d.name AS department_name, u.driver_id, u.created_at, u.updated_at,
      COALESCE(json_agg(DISTINCT jsonb_build_object('id', r.id, 'name', r.name)) FILTER (WHERE r.id IS NOT NULL), '[]') AS roles
      FROM users u LEFT JOIN agencies a ON a.id = u.agency_id LEFT JOIN departments d ON d.id = u.department_id
      LEFT JOIN user_roles ur ON ur.user_id = u.id LEFT JOIN roles r ON r.id = ur.role_id
      GROUP BY u.id, a.name, d.name ORDER BY u.full_name`);
    res.json({ data: result.rows });
  } catch (error) { next(error); }
});

adminRouter.post('/users', async (req, res, next) => {
  try {
    const { username, email, password, fullName, agencyId, departmentId, driverId, roleIds } = req.body ?? {};
    if (!username?.trim() || !email?.trim() || !password || !fullName?.trim()) return res.status(400).json({ error: 'username, email, password and fullName are required' });
    if (String(password).length < 14) return res.status(400).json({ error: 'Password must be at least 14 characters' });
    if (departmentId) {
      const dep = await db.query('SELECT 1 FROM departments WHERE id = $1 AND agency_id = $2 AND active = TRUE', [departmentId, agencyId]);
      if (!dep.rows[0]) return res.status(400).json({ error: 'Invalid department for agency' });
    }
    const passwordHash = await hashPassword(password);
    const result = await db.query(`INSERT INTO users(username,email,password_hash,full_name,agency_id,department_id,driver_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, username, email, full_name, status, agency_id, department_id, driver_id, created_at`,
      [username.trim(), email.trim().toLowerCase(), passwordHash, fullName.trim(), agencyId || null, departmentId || null, driverId || null]);
    const ids = Array.isArray(roleIds) ? roleIds.filter((v: unknown) => typeof v === 'string') : [];
    if (ids.length) await db.query(`INSERT INTO user_roles(user_id, role_id) SELECT $1, id FROM roles WHERE id = ANY($2::uuid[]) ON CONFLICT DO NOTHING`, [result.rows[0].id, ids]);
    await writeAudit(req, 'user.create', 'user', result.rows[0].id, 'success', undefined, { username: result.rows[0].username, agencyId: agencyId || null, roleIds: ids });
    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    if ((error as { code?: string }).code === '23505') return res.status(409).json({ error: 'Username or email already exists' });
    next(error);
  }
});

adminRouter.patch('/users/:id', async (req, res, next) => {
  try {
    const fields: string[] = [];
    const params: unknown[] = [];
    const values: Record<string, string> = { fullName: 'full_name', email: 'email', agencyId: 'agency_id', departmentId: 'department_id', driverId: 'driver_id', status: 'status' };
    for (const [key, column] of Object.entries(values)) if (Object.prototype.hasOwnProperty.call(req.body ?? {}, key)) { params.push(req.body[key] || null); fields.push(`${column} = $${params.length}`); }
    if (typeof req.body?.password === 'string') {
      if (req.body.password.length < 14) return res.status(400).json({ error: 'Password must be at least 14 characters' });
      params.push(await hashPassword(req.body.password)); fields.push(`password_hash = $${params.length}`);
    }
    if (!fields.length) return res.status(400).json({ error: 'No supported fields supplied' });
    params.push(req.params.id);
    const result = await db.query(`UPDATE users SET ${fields.join(', ')}, updated_at = now() WHERE id = $${params.length} RETURNING id, username, email, full_name, status, agency_id, department_id, driver_id, updated_at`, params);
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    await writeAudit(req, 'user.update', 'user', req.params.id, 'success', undefined, { fields: Object.keys(req.body ?? {}).filter((key) => key !== 'password') });
    res.json({ data: result.rows[0] });
  } catch (error) { next(error); }
});

adminRouter.put('/users/:id/roles', async (req, res, next) => {
  try {
    const roleIds = Array.isArray(req.body?.roleIds) ? req.body.roleIds.filter((v: unknown) => typeof v === 'string') : [];
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM user_roles WHERE user_id = $1', [req.params.id]);
      if (roleIds.length) await client.query(`INSERT INTO user_roles(user_id, role_id) SELECT $1, id FROM roles WHERE id = ANY($2::uuid[])`, [req.params.id, roleIds]);
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
    await writeAudit(req, 'user.roles.update', 'user', req.params.id, 'success', undefined, { roleIds });
    res.json({ data: { userId: req.params.id, roleIds } });
  } catch (error) { next(error); }
});

adminRouter.get('/roles', async (_req, res, next) => {
  try {
    const result = await db.query(`SELECT r.id, r.name, r.description, COALESCE(json_agg(jsonb_build_object('id',p.id,'name',p.name,'description',p.description) ORDER BY p.name) FILTER (WHERE p.id IS NOT NULL), '[]') AS permissions
      FROM roles r LEFT JOIN role_permissions rp ON rp.role_id = r.id LEFT JOIN permissions p ON p.id = rp.permission_id GROUP BY r.id ORDER BY r.name`);
    res.json({ data: result.rows });
  } catch (error) { next(error); }
});

adminRouter.post('/roles', async (req, res, next) => {
  try {
    const { name, description, permissionIds } = req.body ?? {};
    if (!name?.trim()) return res.status(400).json({ error: 'Role name is required' });
    const result = await db.query('INSERT INTO roles(name, description) VALUES ($1,$2) RETURNING *', [name.trim(), description?.trim() || null]);
    const ids = Array.isArray(permissionIds) ? permissionIds.filter((v: unknown) => typeof v === 'string') : [];
    if (ids.length) await db.query(`INSERT INTO role_permissions(role_id, permission_id) SELECT $1, id FROM permissions WHERE id = ANY($2::uuid[]) ON CONFLICT DO NOTHING`, [result.rows[0].id, ids]);
    await writeAudit(req, 'role.create', 'role', result.rows[0].id, 'success', undefined, { name: result.rows[0].name, permissionIds: ids });
    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    if ((error as { code?: string }).code === '23505') return res.status(409).json({ error: 'Role name already exists' });
    next(error);
  }
});

adminRouter.put('/roles/:id/permissions', async (req, res, next) => {
  try {
    const ids = Array.isArray(req.body?.permissionIds) ? req.body.permissionIds.filter((v: unknown) => typeof v === 'string') : [];
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM role_permissions WHERE role_id = $1', [req.params.id]);
      if (ids.length) await client.query(`INSERT INTO role_permissions(role_id, permission_id) SELECT $1, id FROM permissions WHERE id = ANY($2::uuid[])`, [req.params.id, ids]);
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
    await writeAudit(req, 'role.permissions.update', 'role', req.params.id, 'success', undefined, { permissionIds: ids });
    res.json({ data: { roleId: req.params.id, permissionIds: ids } });
  } catch (error) { next(error); }
});

adminRouter.get('/permissions', async (_req, res, next) => {
  try { const result = await db.query('SELECT * FROM permissions ORDER BY name'); res.json({ data: result.rows }); }
  catch (error) { next(error); }
});

export default adminRouter;
