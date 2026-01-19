import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type {
  PlayerId,
  LobbyState,
  LeaderboardState,
  PlayerGameResult,
} from '@ks/shared';
import { getSocket, connectSocket, disconnectSocket } from '../lib/socket';
import { getPlayerId, getPlayerName, setPlayerName } from '../lib/player';

// ============================================================
// State Types
// ============================================================

type MultiplayerState = {
  /** Persistent player ID from localStorage */
  playerId: PlayerId;
  /** Player's display name */
  playerName: string;
  /** Current lobby state (null if not in a lobby) */
  lobby: LobbyState | null;
  /** Leaderboard after game ends */
  leaderboard: LeaderboardState | null;
  /** Countdown seconds (3, 2, 1) during countdown phase */
  countdown: number | null;
  /** Timestamp when game started */
  gameStartedAt: number | null;
  /** Players who have finished (during game) */
  finishedPlayers: Array<{ playerId: string; displayName: string; rank: number }>;
  /** Last error message */
  error: string | null;
  /** Socket connection status */
  isConnected: boolean;
};

// ============================================================
// Actions
// ============================================================

type MultiplayerAction =
  | { type: 'SET_NAME'; name: string }
  | { type: 'SET_LOBBY'; lobby: LobbyState | null }
  | { type: 'SET_LEADERBOARD'; leaderboard: LeaderboardState }
  | { type: 'SET_COUNTDOWN'; seconds: number | null }
  | { type: 'GAME_STARTED'; startedAt: number }
  | { type: 'PLAYER_FINISHED'; playerId: string; displayName: string; rank: number }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'SET_CONNECTED'; connected: boolean }
  | { type: 'RESET' };

// ============================================================
// Initial State & Reducer
// ============================================================

function getInitialState(): MultiplayerState {
  return {
    playerId: getPlayerId(),
    playerName: getPlayerName(),
    lobby: null,
    leaderboard: null,
    countdown: null,
    gameStartedAt: null,
    finishedPlayers: [],
    error: null,
    isConnected: false,
  };
}

function reducer(
  state: MultiplayerState,
  action: MultiplayerAction
): MultiplayerState {
  switch (action.type) {
    case 'SET_NAME':
      setPlayerName(action.name);
      return { ...state, playerName: action.name };

    case 'SET_LOBBY':
      return {
        ...state,
        lobby: action.lobby,
        error: null,
        // Reset game state when leaving lobby
        ...(action.lobby === null && {
          countdown: null,
          gameStartedAt: null,
          finishedPlayers: [],
          leaderboard: null,
        }),
      };

    case 'SET_LEADERBOARD':
      return { ...state, leaderboard: action.leaderboard };

    case 'SET_COUNTDOWN':
      return { ...state, countdown: action.seconds };

    case 'GAME_STARTED':
      return {
        ...state,
        gameStartedAt: action.startedAt,
        countdown: null,
        finishedPlayers: [],
      };

    case 'PLAYER_FINISHED':
      // Prevent duplicate entries (Socket.IO can deliver events twice)
      if (state.finishedPlayers.some((p) => p.playerId === action.playerId)) {
        return state;
      }
      return {
        ...state,
        finishedPlayers: [
          ...state.finishedPlayers,
          {
            playerId: action.playerId,
            displayName: action.displayName,
            rank: action.rank,
          },
        ],
      };

    case 'SET_ERROR':
      return { ...state, error: action.error };

    case 'SET_CONNECTED':
      return { ...state, isConnected: action.connected };

    case 'RESET':
      return {
        ...getInitialState(),
        isConnected: state.isConnected,
      };

    default:
      return state;
  }
}

// ============================================================
// Context
// ============================================================

type MultiplayerContextValue = MultiplayerState & {
  /** Update player's display name */
  updateName: (name: string) => void;
  /** Create a new lobby as host */
  createLobby: (puzzleId: string, puzzleTitle?: string) => void;
  /** Join an existing lobby */
  joinLobby: (lobbyCode: string) => void;
  /** Leave current lobby */
  leaveLobby: () => void;
  /** Start the game (host only) */
  startGame: () => void;
  /** Submit game result */
  submitResult: (result: Omit<PlayerGameResult, 'playerId'>) => void;
  /** Give up and mark as DNF */
  giveUp: () => void;
  /** Clear error message */
  clearError: () => void;
  /** Check if current player is host */
  isHost: () => boolean;
};

const MultiplayerContext = createContext<MultiplayerContextValue | null>(null);

// ============================================================
// Provider
// ============================================================

export function MultiplayerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, getInitialState);

  // Set up socket event listeners
  useEffect(() => {
    const socket = getSocket();

    // Connection events
    socket.on('connect', () => {
      dispatch({ type: 'SET_CONNECTED', connected: true });
    });

    socket.on('disconnect', () => {
      dispatch({ type: 'SET_CONNECTED', connected: false });
    });

    // Lobby events
    socket.on('lobby:created', ({ lobby }) => {
      dispatch({ type: 'SET_LOBBY', lobby });
    });

    socket.on('lobby:joined', ({ lobby }) => {
      dispatch({ type: 'SET_LOBBY', lobby });
    });

    socket.on('lobby:updated', ({ lobby }) => {
      dispatch({ type: 'SET_LOBBY', lobby });
    });

    socket.on('lobby:error', ({ message }) => {
      dispatch({ type: 'SET_ERROR', error: message });
    });

    // Game events
    socket.on('game:countdown', ({ secondsRemaining }) => {
      dispatch({ type: 'SET_COUNTDOWN', seconds: secondsRemaining });
    });

    socket.on('game:start', ({ startedAt }) => {
      dispatch({ type: 'GAME_STARTED', startedAt });
    });

    socket.on('game:playerFinished', ({ playerId, displayName, rank }) => {
      dispatch({ type: 'PLAYER_FINISHED', playerId, displayName, rank });
    });

    socket.on('game:leaderboard', ({ leaderboard }) => {
      dispatch({ type: 'SET_LEADERBOARD', leaderboard });
    });

    socket.on('player:disconnected', ({ displayName }) => {
      // Could show a toast notification here
      console.log(`${displayName} disconnected`);
    });

    // Connect socket
    connectSocket();

    return () => {
      disconnectSocket();
    };
  }, []);

  // Actions
  const updateName = useCallback((name: string) => {
    dispatch({ type: 'SET_NAME', name });
  }, []);

  const createLobby = useCallback(
    (puzzleId: string, _puzzleTitle?: string) => {
      if (!state.playerName.trim()) {
        dispatch({ type: 'SET_ERROR', error: 'Please enter your name' });
        return;
      }
      getSocket().emit('lobby:create', {
        playerId: state.playerId,
        displayName: state.playerName,
        puzzleId,
      });
    },
    [state.playerId, state.playerName]
  );

  const joinLobby = useCallback(
    (lobbyCode: string) => {
      if (!state.playerName.trim()) {
        dispatch({ type: 'SET_ERROR', error: 'Please enter your name' });
        return;
      }
      getSocket().emit('lobby:join', {
        lobbyCode: lobbyCode.toUpperCase(),
        playerId: state.playerId,
        displayName: state.playerName,
      });
    },
    [state.playerId, state.playerName]
  );

  const leaveLobby = useCallback(() => {
    if (state.lobby) {
      getSocket().emit('lobby:leave', {
        lobbyCode: state.lobby.lobbyCode,
        playerId: state.playerId,
      });
      dispatch({ type: 'SET_LOBBY', lobby: null });
    }
  }, [state.lobby, state.playerId]);

  const startGame = useCallback(() => {
    if (state.lobby) {
      getSocket().emit('game:start', {
        lobbyCode: state.lobby.lobbyCode,
        playerId: state.playerId,
      });
    }
  }, [state.lobby, state.playerId]);

  const submitResult = useCallback(
    (result: Omit<PlayerGameResult, 'playerId'>) => {
      if (state.lobby) {
        getSocket().emit('game:submit', {
          lobbyCode: state.lobby.lobbyCode,
          result: {
            ...result,
            playerId: state.playerId,
          },
        });
      }
    },
    [state.lobby, state.playerId]
  );

  const giveUp = useCallback(() => {
    if (state.lobby) {
      getSocket().emit('game:giveup', {
        lobbyCode: state.lobby.lobbyCode,
        playerId: state.playerId,
      });
    }
  }, [state.lobby, state.playerId]);

  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', error: null });
  }, []);

  const isHost = useCallback(() => {
    return state.lobby?.hostId === state.playerId;
  }, [state.lobby, state.playerId]);

  const value: MultiplayerContextValue = {
    ...state,
    updateName,
    createLobby,
    joinLobby,
    leaveLobby,
    startGame,
    submitResult,
    giveUp,
    clearError,
    isHost,
  };

  return (
    <MultiplayerContext.Provider value={value}>
      {children}
    </MultiplayerContext.Provider>
  );
}

// ============================================================
// Hook
// ============================================================

export function useMultiplayer(): MultiplayerContextValue {
  const context = useContext(MultiplayerContext);
  if (!context) {
    throw new Error('useMultiplayer must be used within MultiplayerProvider');
  }
  return context;
}
