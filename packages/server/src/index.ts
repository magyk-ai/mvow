import { createServer } from 'http';
import express from 'express';
import { Server } from 'socket.io';
import cors from 'cors';
import type { ClientToServerEvents, ServerToClientEvents } from '@ks/shared';
import { config } from './config.js';
import { createRedisClient, LobbyStore } from './redis.js';
import { setupSocketHandlers } from './socket/handlers.js';

// Create Express app
const app = express();
const httpServer = createServer(app);

// Configure CORS
app.use(
  cors({
    origin: config.corsOrigins,
    credentials: true,
  })
);
app.use(express.json());

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Create Socket.IO server with typed events
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: config.corsOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Start server first so healthcheck passes
httpServer.listen(config.port, () => {
  console.log(`[Server] Running on port ${config.port}`);
  console.log(`[Server] CORS origins: ${config.corsOrigins.join(', ')}`);
});

// Create Redis client and store
const redis = createRedisClient();
const store = new LobbyStore(redis);

// Handle Redis connection
redis.on('connect', () => {
  console.log('[Redis] Connected');
});

redis.on('error', (err: Error) => {
  console.error('[Redis] Error:', err.message);
});

// Set up socket handlers
setupSocketHandlers(io, store);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received, shutting down...');
  httpServer.close(() => {
    redis.quit();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[Server] SIGINT received, shutting down...');
  httpServer.close(() => {
    redis.quit();
    process.exit(0);
  });
});
