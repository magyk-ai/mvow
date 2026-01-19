import { useState, useEffect, useRef } from 'react';
import type { CatalogIndexJSON } from '@ks/engine';
import { useMultiplayer } from '../context/MultiplayerContext';
import './CreateLobbyScreen.css';

type Props = {
  puzzleId: string;
  onBack: () => void;
  onLobbyCreated: (lobbyCode: string) => void;
};

export default function CreateLobbyScreen({
  puzzleId,
  onBack,
  onLobbyCreated,
}: Props) {
  const {
    playerName,
    updateName,
    createLobby,
    lobby,
    error,
    clearError,
    isConnected,
  } = useMultiplayer();

  const [name, setName] = useState(playerName);
  const [puzzleTitle, setPuzzleTitle] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const createRequestSent = useRef(false);

  // Load puzzle info
  useEffect(() => {
    async function loadPuzzleInfo() {
      try {
        const response = await fetch('/mvow/catalog/index.json');
        const catalog: CatalogIndexJSON = await response.json();
        const puzzle = catalog.puzzles.find((p) => p.puzzle_id === puzzleId);
        if (puzzle?.title) {
          setPuzzleTitle(puzzle.title);
        }
      } catch (err) {
        console.error('Failed to load puzzle info:', err);
      } finally {
        setLoading(false);
      }
    }
    loadPuzzleInfo();
  }, [puzzleId]);

  // Navigate to lobby when created
  useEffect(() => {
    if (lobby?.lobbyCode) {
      onLobbyCreated(lobby.lobbyCode);
    }
  }, [lobby, onLobbyCreated]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    updateName(trimmedName);
    setIsCreating(true);
  };

  // Create lobby after name is updated
  useEffect(() => {
    if (isCreating && playerName.trim() && isConnected && !createRequestSent.current) {
      createRequestSent.current = true;
      createLobby(puzzleId, puzzleTitle);
      setIsCreating(false);
    }
  }, [isCreating, playerName, isConnected, puzzleId, puzzleTitle, createLobby]);

  if (loading) {
    return (
      <div className="create-lobby-screen">
        <div className="create-lobby-loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="create-lobby-screen">
      <header className="create-lobby-header">
        <button className="back-button" onClick={onBack} aria-label="Back">
          ←
        </button>
        <h1>Host a Game</h1>
      </header>

      <main className="create-lobby-content">
        <div className="puzzle-preview">
          <h2 className="puzzle-preview-title">{puzzleTitle || 'Puzzle'}</h2>
          <p className="puzzle-preview-id">{puzzleId}</p>
        </div>

        <form onSubmit={handleSubmit} className="create-lobby-form">
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
              placeholder="Enter your name"
              maxLength={20}
              autoFocus
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button
            type="submit"
            className="create-button"
            disabled={!name.trim() || !isConnected}
          >
            {!isConnected ? 'Connecting...' : 'Create Lobby'}
          </button>

          <p className="form-hint">
            You'll get a link to share with friends after creating the lobby.
          </p>
        </form>
      </main>
    </div>
  );
}
