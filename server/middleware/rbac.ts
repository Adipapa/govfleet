import type { NextFunction, Request, Response } from 'express';

export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) return res.status(401).json({ error: 'Authentication required' });
    if (!req.auth.permissions.includes(permission)) return res.status(403).json({ error: 'Insufficient permission' });
    next();
  };
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) return res.status(401).json({ error: 'Authentication required' });
    if (!roles.some((role) => req.auth!.roles.includes(role))) return res.status(403).json({ error: 'Insufficient role' });
    next();
  };
}
