import { Redis } from 'ioredis';
import type { LobbyState, PlayerGameResult } from '@ks/shared';
import { config } from './config.js';

/** Create a new Redis client */
export function createRedisClient(): Redis {
  return new Redis(config.redisUrl);
}

/** Redis key patterns */
const KEYS = {
  lobby: (code: string) => `lobby:${code}`,
  results: (code: string) => `results:${code}`,
  playerSocket: (playerId: string) => `player:socket:${playerId}`,
  socketPlayer: (socketId: string) => `socket:player:${socketId}`,
  socketLobby: (socketId: string) => `socket:lobby:${socketId}`,
} as const;

/**
 * Data access layer for lobby and game state stored in Redis.
 */
export class LobbyStore {
  constructor(private redis: Redis) {}

  // ============ Lobby Operations ============

  /** Create a new lobby with TTL */
  async createLobby(lobby: LobbyState): Promise<void> {
    const key = KEYS.lobby(lobby.lobbyCode);
    await this.redis.setex(key, config.lobbyTtlSeconds, JSON.stringify(lobby));
  }

  /** Get a lobby by code */
  async getLobby(lobbyCode: string): Promise<LobbyState | null> {
    const data = await this.redis.get(KEYS.lobby(lobbyCode));
    return data ? JSON.parse(data) : null;
  }

  /** Update an existing lobby, preserving remaining TTL */
  async updateLobby(lobby: LobbyState): Promise<void> {
    const key = KEYS.lobby(lobby.lobbyCode);
    const ttl = await this.redis.ttl(key);
    // Preserve existing TTL or set minimum of 60 seconds
    await this.redis.setex(key, Math.max(ttl, 60), JSON.stringify(lobby));
  }

  /** Delete a lobby */
  async deleteLobby(lobbyCode: string): Promise<void> {
    await this.redis.del(KEYS.lobby(lobbyCode));
  }

  /** Check if a lobby exists */
  async lobbyExists(lobbyCode: string): Promise<boolean> {
    const exists = await this.redis.exists(KEYS.lobby(lobbyCode));
    return exists === 1;
  }

  // ============ Game Results ============

  /** Add a player's game result */
  async addResult(lobbyCode: string, result: PlayerGameResult): Promise<void> {
    const key = KEYS.results(lobbyCode);
    await this.redis.hset(key, result.playerId, JSON.stringify(result));
    await this.redis.expire(key, config.gameTtlSeconds);
  }

  /** Get all game results for a lobby */
  async getResults(lobbyCode: string): Promise<PlayerGameResult[]> {
    const data = await this.redis.hgetall(KEYS.results(lobbyCode));
    return Object.values(data).map((v) => JSON.parse(v as string));
  }

  /** Get a specific player's result */
  async getPlayerResult(
    lobbyCode: string,
    playerId: string
  ): Promise<PlayerGameResult | null> {
    const data = await this.redis.hget(KEYS.results(lobbyCode), playerId);
    return data ? JSON.parse(data) : null;
  }

  // ============ Socket Tracking ============

  /** Associate a player with their socket and lobby */
  async setPlayerSocket(
    playerId: string,
    socketId: string,
    lobbyCode: string
  ): Promise<void> {
    const pipeline = this.redis.pipeline();
    pipeline.setex(KEYS.playerSocket(playerId), config.lobbyTtlSeconds, socketId);
    pipeline.setex(KEYS.socketPlayer(socketId), config.lobbyTtlSeconds, playerId);
    pipeline.setex(KEYS.socketLobby(socketId), config.lobbyTtlSeconds, lobbyCode);
    await pipeline.exec();
  }

  /** Get socket ID for a player */
  async getPlayerSocket(playerId: string): Promise<string | null> {
    return this.redis.get(KEYS.playerSocket(playerId));
  }

  /** Get player ID for a socket */
  async getSocketPlayer(socketId: string): Promise<string | null> {
    return this.redis.get(KEYS.socketPlayer(socketId));
  }

  /** Get lobby code for a socket */
  async getSocketLobby(socketId: string): Promise<string | null> {
    return this.redis.get(KEYS.socketLobby(socketId));
  }

  /** Remove socket associations */
  async removePlayerSocket(playerId: string, socketId: string): Promise<void> {
    const pipeline = this.redis.pipeline();
    pipeline.del(KEYS.playerSocket(playerId));
    pipeline.del(KEYS.socketPlayer(socketId));
    pipeline.del(KEYS.socketLobby(socketId));
    await pipeline.exec();
  }
}
