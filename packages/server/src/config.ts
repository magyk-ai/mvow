import 'dotenv/config';

export const config = {
  /** Server port */
  port: parseInt(process.env.PORT || '3001', 10),

  /** Redis connection URL */
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  /** Allowed CORS origins */
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173').split(','),

  /** Lobby TTL in seconds (1 hour) */
  lobbyTtlSeconds: 60 * 60,

  /** Game results TTL in seconds (15 minutes) */
  gameTtlSeconds: 15 * 60,
} as const;
