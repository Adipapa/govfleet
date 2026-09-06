import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { vehicleScope } from '../../middleware/scope.js';
import { db } from '../../db/client.js';
import { subscribeFleetEvents, type FleetEvent } from '../../realtime/eventBus.js';

export const realtimeRouter = Router();

function writeEvent(res: Response, event: FleetEvent): void {
  if (res.writableEnded) return;
  res.write(`event: ${event.type}\n`);
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

async function eventIsInScope(req: Request, event: FleetEvent): Promise<boolean> {
  if (req.auth?.roles.includes('super_admin')) return true;
  const vehicleId = typeof event.payload.vehicleId === 'string' ? event.payload.vehicleId : null;
  if (!vehicleId) return false;
  const scope = vehicleScope(req, 'v');
  const result = await db.query(
    `SELECT v.id FROM vehicles v WHERE v.id = $${scope.nextIndex} AND ${scope.clause} LIMIT 1`,
    [...scope.params, vehicleId],
  );
  return Boolean(result.rows[0]);
}

realtimeRouter.get('/events', requireAuth, (req: Request, res: Response) => {
  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  let closed = false;
  const heartbeat = setInterval(() => {
    if (!closed && !res.writableEnded) res.write(': heartbeat\n\n');
  }, 20_000);

  const unsubscribe = subscribeFleetEvents((event) => {
    void eventIsInScope(req, event)
      .then((allowed) => { if (allowed && !closed) writeEvent(res, event); })
      .catch((error) => console.error('Fleet event scope check failed', error));
  });

  req.on('close', () => {
    closed = true;
    clearInterval(heartbeat);
    unsubscribe();
    if (!res.writableEnded) res.end();
  });

  res.write(`event: connected\ndata: ${JSON.stringify({ connectedAt: new Date().toISOString() })}\n\n`);
});

export default realtimeRouter;
