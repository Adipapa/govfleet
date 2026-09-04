import { Router } from 'express';
import { authenticate, revokeToken } from './auth.js';
import { requireAuth } from '../../middleware/auth.js';
import { writeAudit } from '../audit/audit.js';

export const authRouter = Router();

authRouter.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body ?? {};
    if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
      return res.status(400).json({ error: 'Username/email and password are required' });
    }

    const result = await authenticate(username, password, req.ip, req.get('user-agent'));
    if (!result) return res.status(401).json({ error: 'Invalid credentials' });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.auth });
});

authRouter.post('/logout', requireAuth, async (req, res, next) => {
  try {
    await revokeToken(req.authToken!);
    await writeAudit(req, 'auth.logout', 'session', undefined, 'success');
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
