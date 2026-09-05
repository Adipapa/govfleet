import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { db } from './db/client.js';
import { authRouter } from './modules/auth/routes.js';
import fleetRouter from './modules/fleet/routes.js';
import driversRouter from './modules/drivers/routes.js';
import assignmentsRouter from './modules/assignments/routes.js';
import tripsRouter from './modules/trips/routes.js';
import devicesRouter from './modules/devices/routes.js';
import telemetryIngestRouter from './modules/telemetry/ingest.js';
import telemetryRouter from './modules/telemetry/routes.js';
import alertsRouter from './modules/alerts/routes.js';
import { realtimeRouter } from './modules/realtime/routes.js';
import fuelRouter from './modules/fuel/routes.js';
import maintenanceRouter from './modules/maintenance/routes.js';
import costRouter from './modules/cost/routes.js';
import budgetRouter from './modules/cost/budgetRoutes.js';

export const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.get('/health', async (_req, res) => {
  try { await db.query('SELECT 1'); res.json({ status: 'ok', database: 'ok', service: 'qts-govfleet-api' }); }
  catch { res.status(503).json({ status: 'degraded', database: 'unavailable', service: 'qts-govfleet-api' }); }
});
app.get('/api/v1', (_req, res) => { res.json({ name: 'QTS Government Fleet API', version: 'v1' }); });
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/vehicles', fleetRouter);
app.use('/api/v1/drivers', driversRouter);
app.use('/api/v1/assignments', assignmentsRouter);
app.use('/api/v1/trips', tripsRouter);
app.use('/api/v1/devices', devicesRouter);
app.use('/api/v1/telemetry', telemetryRouter);
app.use('/api/v1/alerts', alertsRouter);
app.use('/api/v1/realtime', realtimeRouter);
app.use('/api/v1/ingest', telemetryIngestRouter);
app.use('/api/v1/fuel', fuelRouter);
app.use('/api/v1/maintenance', maintenanceRouter);
app.use('/api/v1/cost', costRouter);
app.use('/api/v1/cost', budgetRouter);
app.use((_req, res) => { res.status(404).json({ error: 'Not Found' }); });
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => { console.error(err); res.status(500).json({ error: 'Internal server error' }); });
