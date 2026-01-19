import type { PuzzleState } from '@ks/engine';

/** Unique identifier for a player, stored in localStorage */
export type PlayerId = string;

/** Player information within a lobby */
export type PlayerInfo = {
  playerId: PlayerId;
  displayName: string;
  seatNumber: number; // 1-10
  isHost: boolean;
  isConnected: boolean;
};

/** Lobby lifecycle states */
export type LobbyStatus = 'waiting' | 'countdown' | 'playing' | 'finished';

/** Complete lobby state, synced between server and clients */
export type LobbyState = {
  lobbyCode: string; // 6-char alphanumeric (e.g., "ABC123")
  puzzleId: string;
  puzzleTitle?: string;
  hostId: PlayerId;
  status: LobbyStatus;
  players: PlayerInfo[]; // Max 10
  countdownSeconds?: number; // 3, 2, 1 during countdown phase
  startedAt?: number; // Unix timestamp when game started
  timeoutAt?: number; // Unix timestamp for game timeout
};

/** Result submitted by a player when they finish the puzzle */
export type PlayerGameResult = {
  playerId: PlayerId;
  puzzleState: PuzzleState | null; // null for DNF (gave up)
  finishedAt: number; // Unix timestamp
  totalTimeMs: number; // Time from game start to finish
  correctCount: number; // Number of solved entries
  totalCount: number; // Total number of entries
  hintsUsed: number; // Total hints used across all entries
  isDNF?: boolean; // True if player gave up
};

/** Entry in the final leaderboard */
export type LeaderboardEntry = {
  playerId: PlayerId;
  displayName: string;
  rank: number; // 1-based position
  score: number; // Computed score
  correctCount: number;
  totalCount: number;
  totalTimeMs: number;
  hintsUsed: number;
  isDNF: boolean; // Did Not Finish (disconnected or timed out)
  isPlaying?: boolean; // True if player is still playing (intermediate leaderboard)
};

/** Complete leaderboard state shown after game ends */
export type LeaderboardState = {
  lobbyCode: string;
  puzzleId: string;
  puzzleTitle?: string;
  entries: LeaderboardEntry[];
  isFinal?: boolean; // True when game is fully complete (all players done)
};

/** Error codes for lobby operations */
export type LobbyErrorCode =
  | 'NOT_FOUND'
  | 'FULL'
  | 'ALREADY_STARTED'
  | 'NOT_HOST'
  | 'INVALID_STATE'
  | 'NAME_REQUIRED';
