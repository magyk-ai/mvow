import { useState, useEffect, useCallback, useRef } from 'react';
import type { PuzzleJSON, PuzzleModel, PuzzleState, Action } from '@ks/engine';
import {
  derivePuzzleModel,
  createInitialState,
  reduce as engineReduce,
  selectEntryRenderModel,
  EN_V1,
} from '@ks/engine';
import { useMultiplayer } from '../context/MultiplayerContext';
import EntryCard from '../components/EntryCard';
import GameTimer from '../components/GameTimer';
import CountdownOverlay from '../components/CountdownOverlay';
import './MultiplayerPuzzleScreen.css';

type Props = {
  lobbyCode: string;
  onGameEnd: (lobbyCode: string) => void;
};

type PuzzleData = {
  model: PuzzleModel;
  state: PuzzleState;
};

export default function MultiplayerPuzzleScreen({ lobbyCode, onGameEnd }: Props) {
  const {
    lobby,
    countdown,
    gameStartedAt,
    finishedPlayers,
    leaderboard,
    submitResult,
    giveUp,
  } = useMultiplayer();

  const [puzzleData, setPuzzleData] = useState<PuzzleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [wrongEntryId, setWrongEntryId] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [finishedAt, setFinishedAt] = useState<number | null>(null);
  const submittedRef = useRef(false);

  // Navigate to leaderboard when player has submitted and leaderboard is received
  useEffect(() => {
    if (hasSubmitted && leaderboard) {
      onGameEnd(lobbyCode);
    }
  }, [hasSubmitted, leaderboard, lobbyCode, onGameEnd]);

  // Load puzzle
  useEffect(() => {
    async function loadPuzzle() {
      if (!lobby?.puzzleId) return;

      try {
        const catalogEntry = await fetch('/mvow/catalog/index.json')
          .then((r) => r.json())
          .then((catalog) =>
            catalog.puzzles.find((p: { puzzle_id: string }) => p.puzzle_id === lobby.puzzleId)
          );

        if (!catalogEntry) throw new Error('Puzzle not found in catalog');

        const response = await fetch(`/mvow${catalogEntry.path}`);
        if (!response.ok) throw new Error('Failed to load puzzle');

        const puzzleJSON: PuzzleJSON = await response.json();
        const puzzleModel = derivePuzzleModel(puzzleJSON, EN_V1);
        const initialState = createInitialState(puzzleModel);

        setPuzzleData({ model: puzzleModel, state: initialState });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    loadPuzzle();
  }, [lobby?.puzzleId]);

  // Auto-focus first entry when game starts
  useEffect(() => {
    if (puzzleData && gameStartedAt && !activeEntryId) {
      const firstEntry = puzzleData.model.entries[0];
      if (firstEntry) {
        setActiveEntryId(firstEntry.entryId);
      }
    }
  }, [puzzleData, gameStartedAt, activeEntryId]);

  // State management (no localStorage for multiplayer)
  const dispatch = useCallback((action: Action) => {
    setPuzzleData((prev) => {
      if (!prev) return prev;
      const newState = engineReduce(prev.model, prev.state, action, EN_V1);
      return { model: prev.model, state: newState };
    });
  }, []);

  // Find next unsolved entry
  const findNextUnsolvedEntry = useCallback(
    (afterEntryId: string | null): string | null => {
      if (!puzzleData) return null;
      const { model, state } = puzzleData;
      const entries = model.entries;

      let startIdx = 0;
      if (afterEntryId) {
        const currentIdx = entries.findIndex((e) => e.entryId === afterEntryId);
        if (currentIdx !== -1) {
          startIdx = currentIdx + 1;
        }
      }

      for (let i = startIdx; i < entries.length; i++) {
        const entryState = state.entries[entries[i].entryId];
        if (!entryState?.isSolved) {
          return entries[i].entryId;
        }
      }

      for (let i = 0; i < startIdx; i++) {
        const entryState = state.entries[entries[i].entryId];
        if (!entryState?.isSolved) {
          return entries[i].entryId;
        }
      }

      return null;
    },
    [puzzleData]
  );

  // Submit result when puzzle is completed
  useEffect(() => {
    if (!puzzleData || !gameStartedAt || submittedRef.current) return;

    const { model, state } = puzzleData;
    if (!state.completed) return;

    submittedRef.current = true;
    const now = Date.now();
    setFinishedAt(now);
    setHasSubmitted(true);

    // Calculate stats
    let correctCount = 0;
    let hintsUsed = 0;
    Object.values(state.entries).forEach((entry) => {
      if (entry.isSolved) correctCount++;
      hintsUsed += entry.hintIndex;
    });

    submitResult({
      puzzleState: state,
      finishedAt: now,
      totalTimeMs: now - gameStartedAt,
      correctCount,
      totalCount: model.entries.length,
      hintsUsed,
    });
  }, [puzzleData, gameStartedAt, submitResult]);

  const handleEntryFocus = (entryId: string) => {
    if (hasSubmitted) return;
    setActiveEntryId(entryId);
    dispatch({ type: 'FOCUS_ENTRY', entryId });
  };

  const handleGuessChange = (entryId: string, guessText: string) => {
    if (hasSubmitted) return;
    dispatch({ type: 'UPDATE_GUESS', entryId, guessText });
    if (wrongEntryId === entryId) {
      setWrongEntryId(null);
    }
  };

  const handleSubmit = (entryId: string) => {
    if (!puzzleData || hasSubmitted) return;

    const entryState = puzzleData.state.entries[entryId];
    if (!entryState || entryState.isSolved) return;

    dispatch({ type: 'SUBMIT_ENTRY', entryId });

    const newState = engineReduce(
      puzzleData.model,
      puzzleData.state,
      { type: 'SUBMIT_ENTRY', entryId },
      EN_V1
    );
    const newEntryState = newState.entries[entryId];

    if (newEntryState?.isSolved) {
      setTimeout(() => {
        const nextEntry = findNextUnsolvedEntry(entryId);
        if (nextEntry) {
          setActiveEntryId(nextEntry);
        } else {
          setActiveEntryId(null);
        }
      }, 300);
    } else {
      setWrongEntryId(entryId);
      setTimeout(() => {
        setWrongEntryId(null);
      }, 1000);
    }
  };

  const handleHint = (entryId: string) => {
    if (hasSubmitted) return;
    dispatch({ type: 'HINT', entryId });
  };

  const handleGiveUp = () => {
    if (window.confirm('Are you sure you want to give up? You will be marked as DNF.')) {
      submittedRef.current = true;
      setHasSubmitted(true);
      giveUp();
    }
  };

  if (loading || !puzzleData) {
    return (
      <div className="multiplayer-puzzle-screen">
        <div className="puzzle-loading">Loading puzzle...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="multiplayer-puzzle-screen">
        <div className="puzzle-error">Error: {error}</div>
      </div>
    );
  }

  const { model, state } = puzzleData;

  return (
    <div className="multiplayer-puzzle-screen">
      {countdown !== null && <CountdownOverlay seconds={countdown} />}

      {hasSubmitted && (
        <div className="waiting-overlay">
          <div className="waiting-content">
            <div className="waiting-icon">✓</div>
            <h2>Finished!</h2>
            <p>Waiting for other players...</p>
            <div className="finished-count">
              {finishedPlayers.length} / {lobby?.players.length || 0} players finished
            </div>
          </div>
        </div>
      )}

      <header className="puzzle-header multiplayer">
        <div className="header-left">
          <span className="header-subtitle">Multiplayer</span>
          <span className="header-main">{model.title || 'Quiz'}</span>
        </div>
        <div className="header-right">
          {gameStartedAt && (
            <GameTimer
              startedAt={gameStartedAt}
              isFinished={hasSubmitted}
              finishedAt={finishedAt || undefined}
            />
          )}
        </div>
      </header>

      <main className="puzzle-content">
        <div className="entry-list">
          {model.entries.map((entry) => {
            const renderModel = selectEntryRenderModel(
              model,
              state,
              entry.entryId,
              EN_V1
            );

            return (
              <EntryCard
                key={entry.entryId}
                renderModel={renderModel}
                isActive={activeEntryId === entry.entryId && !hasSubmitted}
                isWrong={wrongEntryId === entry.entryId}
                isCompleted={state.completed}
                onFocus={() => handleEntryFocus(entry.entryId)}
                onGuessChange={(text) => handleGuessChange(entry.entryId, text)}
                onSubmit={() => handleSubmit(entry.entryId)}
                onHint={() => handleHint(entry.entryId)}
              />
            );
          })}
        </div>
      </main>

      {!state.completed && !hasSubmitted && (
        <footer className="puzzle-footer">
          <button
            className="hint-button-global"
            onClick={() => activeEntryId && handleHint(activeEntryId)}
            disabled={!activeEntryId}
            aria-label="Reveal next vowel"
          >
            <span className="hint-icon">💡</span>
            <span className="hint-label">Hint</span>
          </button>

          <button
            className="give-up-button"
            onClick={handleGiveUp}
            aria-label="Give up"
          >
            <span className="give-up-icon">🏳️</span>
            <span className="give-up-label">Give Up</span>
          </button>
        </footer>
      )}
    </div>
  );
}
