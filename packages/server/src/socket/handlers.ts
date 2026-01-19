import { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  LobbyState,
  PlayerInfo,
  LeaderboardState,
  LeaderboardEntry,
  PlayerGameResult,
} from '@ks/shared';
import {
  SCORING,
  calculateScore,
  sortLeaderboard,
  assignRanks,
  buildDNFEntry,
} from '@ks/shared';
import { LobbyStore } from '../redis.js';
import { generateLobbyCode } from '../utils/lobbyCode.js';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

/**
 * Set up all WebSocket event handlers.
 */
export function setupSocketHandlers(
  io: TypedServer,
  store: LobbyStore
): void {
  io.on('connection', (socket: TypedSocket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    // ========== Lobby Management ==========

    socket.on('lobby:create', async (data) => {
      try {
        // Validate input
        if (!data.displayName.trim()) {
          socket.emit('lobby:error', {
            code: 'NAME_REQUIRED',
            message: 'Display name is required',
          });
          return;
        }

        // Generate unique lobby code
        let lobbyCode = generateLobbyCode();
        let attempts = 0;
        while ((await store.lobbyExists(lobbyCode)) && attempts < 5) {
          lobbyCode = generateLobbyCode();
          attempts++;
        }

        // Create host player
        const player: PlayerInfo = {
          playerId: data.playerId,
          displayName: data.displayName.trim(),
          seatNumber: 1,
          isHost: true,
          isConnected: true,
        };

        // Create lobby
        const lobby: LobbyState = {
          lobbyCode,
          puzzleId: data.puzzleId,
          hostId: data.playerId,
          status: 'waiting',
          players: [player],
        };

        await store.createLobby(lobby);
        await store.setPlayerSocket(data.playerId, socket.id, lobbyCode);

        socket.join(lobbyCode);
        socket.emit('lobby:created', { lobbyCode, lobby });

        console.log(
          `[Lobby] Created ${lobbyCode} by ${data.displayName} (${data.playerId})`
        );
      } catch (err) {
        console.error('[Lobby] Create error:', err);
        socket.emit('lobby:error', {
          code: 'INVALID_STATE',
          message: 'Failed to create lobby',
        });
      }
    });

    socket.on('lobby:join', async (data) => {
      try {
        // Validate input
        if (!data.displayName.trim()) {
          socket.emit('lobby:error', {
            code: 'NAME_REQUIRED',
            message: 'Display name is required',
          });
          return;
        }

        const lobby = await store.getLobby(data.lobbyCode);

        if (!lobby) {
          socket.emit('lobby:error', {
            code: 'NOT_FOUND',
            message: 'Lobby not found',
          });
          return;
        }

        if (lobby.status !== 'waiting') {
          socket.emit('lobby:error', {
            code: 'ALREADY_STARTED',
            message: 'Game has already started',
          });
          return;
        }

        // Check if player is rejoining
        const existingPlayer = lobby.players.find(
          (p) => p.playerId === data.playerId
        );

        if (existingPlayer) {
          // Reconnecting player
          existingPlayer.isConnected = true;
          existingPlayer.displayName = data.displayName.trim();
        } else {
          // New player
          if (lobby.players.length >= SCORING.MAX_PLAYERS) {
            socket.emit('lobby:error', {
              code: 'FULL',
              message: 'Lobby is full (max 10 players)',
            });
            return;
          }

          // Find next available seat
          const takenSeats = new Set(lobby.players.map((p) => p.seatNumber));
          let seatNumber = 1;
          while (takenSeats.has(seatNumber) && seatNumber <= SCORING.MAX_PLAYERS) {
            seatNumber++;
          }

          lobby.players.push({
            playerId: data.playerId,
            displayName: data.displayName.trim(),
            seatNumber,
            isHost: false,
            isConnected: true,
          });
        }

        await store.updateLobby(lobby);
        await store.setPlayerSocket(data.playerId, socket.id, data.lobbyCode);

        socket.join(data.lobbyCode);
        socket.emit('lobby:joined', { lobby });
        io.to(data.lobbyCode).emit('lobby:updated', { lobby });

        console.log(
          `[Lobby] ${data.displayName} joined ${data.lobbyCode} (${lobby.players.length} players)`
        );
      } catch (err) {
        console.error('[Lobby] Join error:', err);
        socket.emit('lobby:error', {
          code: 'INVALID_STATE',
          message: 'Failed to join lobby',
        });
      }
    });

    socket.on('lobby:leave', async (data) => {
      try {
        const lobby = await store.getLobby(data.lobbyCode);
        if (!lobby) return;

        const leavingPlayer = lobby.players.find(
          (p) => p.playerId === data.playerId
        );
        const playerName = leavingPlayer?.displayName || 'Unknown';

        lobby.players = lobby.players.filter(
          (p) => p.playerId !== data.playerId
        );

        if (lobby.players.length === 0) {
          // No players left, delete lobby
          await store.deleteLobby(data.lobbyCode);
          console.log(`[Lobby] Deleted ${data.lobbyCode} (empty)`);
        } else {
          // Transfer host if needed
          if (lobby.hostId === data.playerId) {
            const newHost = lobby.players[0];
            lobby.hostId = newHost.playerId;
            newHost.isHost = true;
            console.log(
              `[Lobby] Host transferred to ${newHost.displayName} in ${data.lobbyCode}`
            );
          }
          await store.updateLobby(lobby);
          io.to(data.lobbyCode).emit('lobby:updated', { lobby });
        }

        socket.leave(data.lobbyCode);
        await store.removePlayerSocket(data.playerId, socket.id);

        console.log(`[Lobby] ${playerName} left ${data.lobbyCode}`);
      } catch (err) {
        console.error('[Lobby] Leave error:', err);
      }
    });

    // ========== Game Flow ==========

    socket.on('game:start', async (data) => {
      try {
        const lobby = await store.getLobby(data.lobbyCode);

        if (!lobby) {
          socket.emit('lobby:error', {
            code: 'NOT_FOUND',
            message: 'Lobby not found',
          });
          return;
        }

        if (lobby.hostId !== data.playerId) {
          socket.emit('lobby:error', {
            code: 'NOT_HOST',
            message: 'Only the host can start the game',
          });
          return;
        }

        if (lobby.status !== 'waiting') {
          socket.emit('lobby:error', {
            code: 'INVALID_STATE',
            message: 'Game has already started',
          });
          return;
        }

        // Start countdown
        lobby.status = 'countdown';
        await store.updateLobby(lobby);

        console.log(`[Game] Starting countdown for ${data.lobbyCode}`);

        // Emit countdown: 3, 2, 1
        for (let i = SCORING.COUNTDOWN_SECONDS; i >= 1; i--) {
          io.to(data.lobbyCode).emit('game:countdown', {
            lobbyCode: data.lobbyCode,
            secondsRemaining: i,
          });
          await sleep(1000);
        }

        // Start game
        const now = Date.now();
        lobby.status = 'playing';
        lobby.startedAt = now;
        lobby.timeoutAt = now + SCORING.GAME_TIMEOUT_MS;
        await store.updateLobby(lobby);

        io.to(data.lobbyCode).emit('game:start', {
          lobbyCode: data.lobbyCode,
          startedAt: now,
          timeoutAt: lobby.timeoutAt,
        });

        console.log(`[Game] Started ${data.lobbyCode} at ${now}`);

        // Schedule timeout check
        setTimeout(
          () => checkGameTimeout(io, store, data.lobbyCode),
          SCORING.GAME_TIMEOUT_MS + 1000
        );
      } catch (err) {
        console.error('[Game] Start error:', err);
        socket.emit('lobby:error', {
          code: 'INVALID_STATE',
          message: 'Failed to start game',
        });
      }
    });

    socket.on('game:submit', async (data) => {
      try {
        const lobby = await store.getLobby(data.lobbyCode);
        if (!lobby || lobby.status !== 'playing') return;

        // Check if player already submitted
        const existingResult = await store.getPlayerResult(
          data.lobbyCode,
          data.result.playerId
        );
        if (existingResult) return;

        await store.addResult(data.lobbyCode, data.result);

        // Find player for display name
        const player = lobby.players.find(
          (p) => p.playerId === data.result.playerId
        );

        if (player) {
          // Count how many have finished
          const results = await store.getResults(data.lobbyCode);
          const rank = results.length;

          io.to(data.lobbyCode).emit('game:playerFinished', {
            lobbyCode: data.lobbyCode,
            playerId: data.result.playerId,
            displayName: player.displayName,
            rank,
          });

          console.log(
            `[Game] ${player.displayName} finished ${data.lobbyCode} (rank ${rank})`
          );

          // Send intermediate leaderboard so finished players can see results
          const intermediateLeaderboard = await buildIntermediateLeaderboard(
            store,
            lobby
          );
          io.to(data.lobbyCode).emit('game:leaderboard', {
            leaderboard: intermediateLeaderboard,
          });
        }

        // Check if all connected players finished
        const results = await store.getResults(data.lobbyCode);
        const connectedPlayers = lobby.players.filter((p) => p.isConnected);

        if (results.length >= connectedPlayers.length) {
          await finalizeGame(io, store, data.lobbyCode);
        }
      } catch (err) {
        console.error('[Game] Submit error:', err);
      }
    });

    socket.on('game:giveup', async (data) => {
      try {
        const lobby = await store.getLobby(data.lobbyCode);
        if (!lobby || lobby.status !== 'playing') return;

        // Check if player already submitted
        const existingResult = await store.getPlayerResult(
          data.lobbyCode,
          data.playerId
        );
        if (existingResult) return;

        // Find player
        const player = lobby.players.find((p) => p.playerId === data.playerId);
        if (!player) return;

        // Create DNF result
        const dnfResult: PlayerGameResult = {
          playerId: data.playerId,
          puzzleState: null,
          finishedAt: Date.now(),
          totalTimeMs: Date.now() - (lobby.startedAt || Date.now()),
          correctCount: 0,
          totalCount: 0,
          hintsUsed: 0,
          isDNF: true,
        };

        await store.addResult(data.lobbyCode, dnfResult);

        // Notify all players
        io.to(data.lobbyCode).emit('game:playerFinished', {
          lobbyCode: data.lobbyCode,
          playerId: data.playerId,
          displayName: player.displayName,
          rank: -1, // DNF indicator
          isDNF: true,
        });

        console.log(
          `[Game] ${player.displayName} gave up in ${data.lobbyCode}`
        );

        // Send intermediate leaderboard
        const intermediateLeaderboard = await buildIntermediateLeaderboard(
          store,
          lobby
        );
        io.to(data.lobbyCode).emit('game:leaderboard', {
          leaderboard: intermediateLeaderboard,
        });

        // Check if all connected players finished
        const results = await store.getResults(data.lobbyCode);
        const connectedPlayers = lobby.players.filter((p) => p.isConnected);

        if (results.length >= connectedPlayers.length) {
          await finalizeGame(io, store, data.lobbyCode);
        }
      } catch (err) {
        console.error('[Game] Give up error:', err);
      }
    });

    // ========== Disconnect Handling ==========

    socket.on('disconnect', async () => {
      try {
        const playerId = await store.getSocketPlayer(socket.id);
        const lobbyCode = await store.getSocketLobby(socket.id);

        if (!playerId || !lobbyCode) {
          console.log(`[Socket] Disconnected: ${socket.id} (no lobby)`);
          return;
        }

        const lobby = await store.getLobby(lobbyCode);
        if (!lobby) return;

        const player = lobby.players.find((p) => p.playerId === playerId);
        if (!player) return;

        player.isConnected = false;
        await store.updateLobby(lobby);
        await store.removePlayerSocket(playerId, socket.id);

        console.log(
          `[Socket] ${player.displayName} disconnected from ${lobbyCode}`
        );

        if (lobby.status === 'playing') {
          // Notify others of disconnect during game
          io.to(lobbyCode).emit('player:disconnected', {
            lobbyCode,
            playerId,
            displayName: player.displayName,
          });

          // Check if all remaining connected players have finished
          const results = await store.getResults(lobbyCode);
          const connectedPlayers = lobby.players.filter((p) => p.isConnected);

          if (
            connectedPlayers.length > 0 &&
            results.length >= connectedPlayers.length
          ) {
            await finalizeGame(io, store, lobbyCode);
          } else if (connectedPlayers.length === 0) {
            // All players disconnected
            await finalizeGame(io, store, lobbyCode);
          }
        } else if (lobby.status === 'waiting') {
          // Update lobby for waiting players
          io.to(lobbyCode).emit('lobby:updated', { lobby });
        }
      } catch (err) {
        console.error('[Socket] Disconnect error:', err);
      }
    });
  });
}

/**
 * Check if game has timed out and finalize if so.
 */
async function checkGameTimeout(
  io: TypedServer,
  store: LobbyStore,
  lobbyCode: string
): Promise<void> {
  const lobby = await store.getLobby(lobbyCode);
  if (!lobby || lobby.status !== 'playing') return;

  if (Date.now() >= (lobby.timeoutAt || 0)) {
    console.log(`[Game] Timeout for ${lobbyCode}`);
    await finalizeGame(io, store, lobbyCode);
  }
}

/**
 * Build an intermediate leaderboard showing who has finished and who is still playing.
 */
async function buildIntermediateLeaderboard(
  store: LobbyStore,
  lobby: LobbyState
): Promise<LeaderboardState> {
  const results = await store.getResults(lobby.lobbyCode);
  const resultsByPlayer = new Map(results.map((r) => [r.playerId, r]));

  const entries: LeaderboardEntry[] = lobby.players.map((player) => {
    const result = resultsByPlayer.get(player.playerId);

    if (!result) {
      // Still playing
      return {
        playerId: player.playerId,
        displayName: player.displayName,
        rank: 0,
        score: 0,
        correctCount: 0,
        totalCount: 0,
        totalTimeMs: 0,
        hintsUsed: 0,
        isDNF: false,
        isPlaying: true,
      };
    }

    if (result.isDNF) {
      return {
        ...buildDNFEntry(player.playerId, player.displayName, result.totalCount),
        isPlaying: false,
      };
    }

    return {
      playerId: player.playerId,
      displayName: player.displayName,
      rank: 0,
      score: calculateScore(result),
      correctCount: result.correctCount,
      totalCount: result.totalCount,
      totalTimeMs: result.totalTimeMs,
      hintsUsed: result.hintsUsed,
      isDNF: false,
      isPlaying: false,
    };
  });

  // Sort: finished players by score (desc), then playing players at bottom
  const sorted = sortLeaderboard(entries);
  assignRanks(sorted);

  return {
    lobbyCode: lobby.lobbyCode,
    puzzleId: lobby.puzzleId,
    puzzleTitle: lobby.puzzleTitle,
    entries: sorted,
    isFinal: false,
  };
}

/**
 * Finalize the game and send leaderboard to all players.
 */
async function finalizeGame(
  io: TypedServer,
  store: LobbyStore,
  lobbyCode: string
): Promise<void> {
  const lobby = await store.getLobby(lobbyCode);
  if (!lobby) return;

  // Prevent double finalization
  if (lobby.status === 'finished') return;

  lobby.status = 'finished';
  await store.updateLobby(lobby);

  const results = await store.getResults(lobbyCode);
  const resultsByPlayer = new Map(results.map((r) => [r.playerId, r]));

  // Build leaderboard entries
  const entries: LeaderboardEntry[] = lobby.players.map((player) => {
    const result = resultsByPlayer.get(player.playerId);

    if (!result) {
      // DNF - either disconnected or didn't finish
      return buildDNFEntry(
        player.playerId,
        player.displayName,
        0 // We don't have totalCount here, will be 0 for DNF
      );
    }

    return {
      playerId: player.playerId,
      displayName: player.displayName,
      rank: 0,
      score: calculateScore(result),
      correctCount: result.correctCount,
      totalCount: result.totalCount,
      totalTimeMs: result.totalTimeMs,
      hintsUsed: result.hintsUsed,
      isDNF: false,
    };
  });

  const sorted = sortLeaderboard(entries);
  assignRanks(sorted);

  const leaderboard: LeaderboardState = {
    lobbyCode,
    puzzleId: lobby.puzzleId,
    puzzleTitle: lobby.puzzleTitle,
    entries: sorted,
    isFinal: true,
  };

  io.to(lobbyCode).emit('game:leaderboard', { leaderboard });

  console.log(`[Game] Finalized ${lobbyCode} with ${sorted.length} players`);
}

/**
 * Sleep for a given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
