import 'dotenv/config';

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.API_PORT ?? 4000),
  databaseUrl: required('DATABASE_URL', 'postgresql://qts:qts_dev@localhost:5432/qts_govfleet'),
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  jwtSecret: required('JWT_SECRET', 'CHANGE_ME_IN_PRODUCTION'),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
};

if (env.nodeEnv === 'production' && env.jwtSecret === 'CHANGE_ME_IN_PRODUCTION') {
  throw new Error('JWT_SECRET must be changed in production');
}
