import type { NextFunction, Request, Response } from 'express';

export type Scope = {
  clause: string;
  params: unknown[];
  nextIndex: number;
};

export function vehicleScope(req: Request, alias = 'v'): Scope {
  if (!req.auth) throw new Error('Authentication required');
  if (req.auth.roles.includes('super_admin')) return { clause: 'TRUE', params: [], nextIndex: 1 };

  const params: unknown[] = [];
  const conditions: string[] = [];

  if (req.auth.agencyId) {
    params.push(req.auth.agencyId);
    conditions.push(`${alias}.agency_id = $${params.length}`);
  }
  if (req.auth.departmentId) {
    params.push(req.auth.departmentId);
    conditions.push(`${alias}.department_id = $${params.length}`);
  }
  if (req.auth.roles.includes('driver')) {
    if (!req.auth.driverId) return { clause: 'FALSE', params: [], nextIndex: 1 };
    params.push(req.auth.driverId);
    conditions.push(`EXISTS (
      SELECT 1 FROM vehicle_driver_assignments vda
      WHERE vda.vehicle_id = ${alias}.id
        AND vda.driver_id = $${params.length}
        AND vda.starts_at <= now()
        AND (vda.ends_at IS NULL OR vda.ends_at > now())
    )`);
  }

  if (!conditions.length) return { clause: 'FALSE', params: [], nextIndex: 1 };
  return { clause: conditions.join(' AND '), params, nextIndex: params.length + 1 };
}

export function requireScopedAccess(req: Request, res: Response, next: NextFunction) {
  if (!req.auth) return res.status(401).json({ error: 'Authentication required' });
  if (!req.auth.roles.includes('super_admin') && !req.auth.agencyId) {
    return res.status(403).json({ error: 'User has no agency scope' });
  }
  next();
}
