import { app } from './app.js';
import { env } from './config/env.js';
import { closeDb } from './db/client.js';

const server = app.listen(env.port, () => {
  console.log(`QTS GovFleet API listening on port ${env.port}`);
});

async function shutdown(signal: string) {
  console.log(`${signal} received; shutting down`);
  server.close(async () => {
    await closeDb();
    process.exit(0);
  });
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
