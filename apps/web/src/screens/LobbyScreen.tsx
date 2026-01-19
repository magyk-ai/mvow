import { useState, useEffect, useRef } from 'react';
import { useMultiplayer } from '../context/MultiplayerContext';
import PlayerList from '../components/PlayerList';
import CountdownOverlay from '../components/CountdownOverlay';
import './LobbyScreen.css';

type Props = {
  lobbyCode: string;
  onBack: () => void;
  onGameStart: (lobbyCode: string) => void;
};

export default function LobbyScreen({ lobbyCode, onBack, onGameStart }: Props) {
  const {
    playerId,
    playerName,
    updateName,
    lobby,
    countdown,
    gameStartedAt,
    joinLobby,
    leaveLobby,
    startGame,
    error,
    clearError,
    isHost,
    isConnected,
  } = useMultiplayer();

  const [name, setName] = useState(playerName);
  const [hasJoined, setHasJoined] = useState(false);
  const [copied, setCopied] = useState(false);
  const joinRequestSent = useRef(false);

  // Single effect to handle joining - triggered when conditions are met
  useEffect(() => {
    if (
      isConnected &&
      hasJoined &&
      playerName.trim() &&
      !lobby &&
      !joinRequestSent.current
    ) {
      joinRequestSent.current = true;
      joinLobby(lobbyCode);
    }
  }, [isConnected, hasJoined, playerName, lobby, lobbyCode, joinLobby]);

  // Auto-set hasJoined if player already has a name (returning user)
  useEffect(() => {
    if (playerName.trim() && !hasJoined) {
      setHasJoined(true);
    }
  }, [playerName, hasJoined]);

  // Navigate to game when it starts
  useEffect(() => {
    if (gameStartedAt && lobby?.lobbyCode) {
      onGameStart(lobby.lobbyCode);
    }
  }, [gameStartedAt, lobby, onGameStart]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    // Update name in context first
    updateName(trimmedName);
    // Mark as ready to join - the useEffect will handle the actual join
    setHasJoined(true);
  };

  const handleLeave = () => {
    leaveLobby();
    onBack();
  };

  const handleCopyLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}#lobby/${lobbyCode}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Show name entry if player hasn't set their name
  if (!playerName.trim() || (!hasJoined && !lobby)) {
    return (
      <div className="lobby-screen">
        <header className="lobby-header">
          <button className="back-button" onClick={onBack} aria-label="Back">
            ←
          </button>
          <h1>Join Game</h1>
        </header>

        <main className="lobby-content">
          <div className="lobby-code-display">
            <span className="lobby-code-label">Game Code</span>
            <span className="lobby-code-value">{lobbyCode}</span>
          </div>

          <form onSubmit={handleJoin} className="join-form">
            <div className="form-group">
              <label htmlFor="player-name">Your Name</label>
              <input
                id="player-name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) clearError();
                }}
                placeholder="Enter your name to join"
                maxLength={20}
                autoFocus
                required
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button
              type="submit"
              className="join-button"
              disabled={!name.trim() || !isConnected}
            >
              {!isConnected ? 'Connecting...' : 'Join Game'}
            </button>
          </form>
        </main>
      </div>
    );
  }

  // Show loading while waiting for lobby data
  if (!lobby) {
    return (
      <div className="lobby-screen">
        <div className="lobby-loading">
          {error ? (
            <div className="error-container">
              <div className="error-message">{error}</div>
              <button className="back-button-text" onClick={onBack}>
                Back to Catalog
              </button>
            </div>
          ) : (
            'Joining lobby...'
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="lobby-screen">
      {countdown !== null && <CountdownOverlay seconds={countdown} />}

      <header className="lobby-header">
        <button className="back-button" onClick={handleLeave} aria-label="Leave">
          ←
        </button>
        <div className="header-info">
          <h1>{lobby.puzzleTitle || 'Multiplayer Game'}</h1>
          <span className="lobby-status">Waiting for players...</span>
        </div>
      </header>

      <main className="lobby-content">
        <div className="lobby-code-section">
          <div className="lobby-code-display large">
            <span className="lobby-code-label">Share this code</span>
            <span className="lobby-code-value">{lobbyCode}</span>
          </div>

          <button className="copy-link-button" onClick={handleCopyLink}>
            {copied ? '✓ Copied!' : 'Copy Link'}
          </button>
        </div>

        <PlayerList players={lobby.players} currentPlayerId={playerId} />

        {isHost() ? (
          <div className="host-controls">
            <button
              className="start-button"
              onClick={startGame}
              disabled={lobby.players.length < 1}
            >
              Start Game
            </button>
            {lobby.players.length < 2 && (
              <p className="start-hint">
                Share the code above to invite players!
              </p>
            )}
          </div>
        ) : (
          <div className="waiting-message">
            <p>Waiting for host to start the game...</p>
          </div>
        )}
      </main>
    </div>
  );
}
