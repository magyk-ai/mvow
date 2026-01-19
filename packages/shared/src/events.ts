import type {
  PlayerId,
  LobbyState,
  PlayerGameResult,
  LeaderboardState,
  LobbyErrorCode,
} from './multiplayer.js';

// ============================================================
// Client -> Server Events
// ============================================================

export type ClientEvents = {
  /** Host creates a new lobby */
  'lobby:create': {
    playerId: PlayerId;
    displayName: string;
    puzzleId: string;
  };

  /** Player joins an existing lobby */
  'lobby:join': {
    lobbyCode: string;
    playerId: PlayerId;
    displayName: string;
  };

  /** Player leaves the lobby */
  'lobby:leave': {
    lobbyCode: string;
    playerId: PlayerId;
  };

  /** Host starts the game (triggers countdown) */
  'game:start': {
    lobbyCode: string;
    playerId: PlayerId; // Must match hostId
  };

  /** Player submits their final result */
  'game:submit': {
    lobbyCode: string;
    result: PlayerGameResult;
  };

  /** Player gives up (DNF) */
  'game:giveup': {
    lobbyCode: string;
    playerId: PlayerId;
  };
};

// ============================================================
// Server -> Client Events
// ============================================================

export type ServerEvents = {
  /** Lobby was successfully created */
  'lobby:created': {
    lobbyCode: string;
    lobby: LobbyState;
  };

  /** Successfully joined a lobby */
  'lobby:joined': {
    lobby: LobbyState;
  };

  /** Lobby state was updated (player joined/left, status changed) */
  'lobby:updated': {
    lobby: LobbyState;
  };

  /** Lobby operation failed */
  'lobby:error': {
    code: LobbyErrorCode;
    message: string;
  };

  /** Countdown tick (3, 2, 1) */
  'game:countdown': {
    lobbyCode: string;
    secondsRemaining: number;
  };

  /** Game has started, begin playing */
  'game:start': {
    lobbyCode: string;
    startedAt: number; // Unix timestamp
    timeoutAt: number; // Unix timestamp
  };

  /** Another player finished the puzzle */
  'game:playerFinished': {
    lobbyCode: string;
    playerId: PlayerId;
    displayName: string;
    rank: number; // Their finish position (-1 for DNF)
    isDNF?: boolean; // True if player gave up
  };

  /** Game ended, here's the final leaderboard */
  'game:leaderboard': {
    leaderboard: LeaderboardState;
  };

  /** A player disconnected during game */
  'player:disconnected': {
    lobbyCode: string;
    playerId: PlayerId;
    displayName: string;
  };
};

// ============================================================
// Type helpers for Socket.IO typed events
// ============================================================

/** Socket.IO client-to-server event signatures */
export type ClientToServerEvents = {
  [K in keyof ClientEvents]: (data: ClientEvents[K]) => void;
};

/** Socket.IO server-to-client event signatures */
export type ServerToClientEvents = {
  [K in keyof ServerEvents]: (data: ServerEvents[K]) => void;
};
