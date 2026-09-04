import { Router } from 'express';
import type { Request, Response } from 'express';
import { authenticateRequest } from '../../middleware/auth.js';
import { subscribeFleetEvents, type FleetEvent } from '../../realtime/eventBus.js';

export const realtimeRouter = Router();

function writeEvent(res: Response, event: FleetEvent): void {
  res.write(`event: ${event.type}\n`);
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

realtimeRouter.get('/events', authenticateRequest, (req: Request, res: Response) => {
  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 20_000);
  const unsubscribe = subscribeFleetEvents((event) => writeEvent(res, event));

  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
    res.end();
  });

  res.write(`event: connected\ndata: ${JSON.stringify({ connectedAt: new Date().toISOString() })}\n\n`);
});
