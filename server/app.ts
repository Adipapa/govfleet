import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { db } from './db/client.js';

export const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.get('/health', async (_req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', database: 'ok', service: 'qts-govfleet-api' });
  } catch {
    res.status(503).json({ status: 'degraded', database: 'unavailable', service: 'qts-govfleet-api' });
  }
});

app.get('/api/v1', (_req, res) => {
  res.json({ name: 'QTS Government Fleet API', version: 'v1' });
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});
