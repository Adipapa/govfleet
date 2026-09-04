import type { NextFunction, Request, Response } from 'express';
import { verifyToken, type AuthUser } from '../modules/auth/auth.js';

declare global {
  namespace Express {
    interface Request { auth?: AuthUser; authToken?: string; }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header('authorization');
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required' });
  const token = header.slice(7).trim();
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  const user = await verifyToken(token);
  if (!user) return res.status(401).json({ error: 'Invalid or expired session' });
  req.auth = user;
  req.authToken = token;
  next();
}
