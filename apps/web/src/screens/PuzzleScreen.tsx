import { useState, useEffect, useCallback } from 'react';
import type {
  PuzzleJSON,
  PuzzleModel,
  PuzzleState,
  Action,
} from '@ks/engine';
import {
  derivePuzzleModel,
  createInitialState,
  reduce as engineReduce,
  selectEntryRenderModel,
  EN_V1,
} from '@ks/engine';
import { localStorageAdapter } from '../lib/storage';
import EntryCard from '../components/EntryCard';
import './PuzzleScreen.css';

type Props = {
  puzzleId: string;
  onBack: () => void;
};

type PuzzleData = {
  model: PuzzleModel;
  state: PuzzleState;
};

export default function PuzzleScreen({ puzzleId, onBack }: Props) {
  const [puzzleData, setPuzzleData] = useState<PuzzleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [wrongEntryId, setWrongEntryId] = useState<string | null>(null);

  // State management
  const dispatch = useCallback((action: Action) => {
    setPuzzleData((prev) => {
      if (!prev) return prev;
      const newState = engineReduce(prev.model, prev.state, action, EN_V1);
      // Auto-save to localStorage
      localStorageAdapter.savePuzzleState(puzzleId, newState);
      return { model: prev.model, state: newState };
    });
  }, [puzzleId]);

  // Find the next unsolved entry after a given entry
  const findNextUnsolvedEntry = useCallback((afterEntryId: string | null): string | null => {
    if (!puzzleData) return null;
    const { model, state } = puzzleData;
    const entries = model.entries;

    // Find the start index
    let startIdx = 0;
    if (afterEntryId) {
      const currentIdx = entries.findIndex(e => e.entryId === afterEntryId);
      if (currentIdx !== -1) {
        startIdx = currentIdx + 1;
      }
    }

    // Search from startIdx to end
    for (let i = startIdx; i < entries.length; i++) {
      const entryState = state.entries[entries[i].entryId];
      if (!entryState?.isSolved) {
        return entries[i].entryId;
      }
    }

    // Wrap around and search from beginning to startIdx
    for (let i = 0; i < startIdx; i++) {
      const entryState = state.entries[entries[i].entryId];
      if (!entryState?.isSolved) {
        return entries[i].entryId;
      }
    }

    return null;
  }, [puzzleData]);

  // Auto-focus first unsolved entry on load
  useEffect(() => {
    if (puzzleData && !activeEntryId) {
      const firstUnsolved = findNextUnsolvedEntry(null);
      if (firstUnsolved) {
        setActiveEntryId(firstUnsolved);
      }
    }
  }, [puzzleData, activeEntryId, findNextUnsolvedEntry]);

  useEffect(() => {
    async function loadPuzzle() {
      try {
        // Load puzzle JSON
        const catalogEntry = await fetch('/mvow/catalog/index.json')
          .then((r) => r.json())
          .then((catalog) =>
            catalog.puzzles.find((p: any) => p.puzzle_id === puzzleId)
          );

        if (!catalogEntry) throw new Error('Puzzle not found in catalog');

        const response = await fetch(`/mvow${catalogEntry.path}`);
        if (!response.ok) throw new Error('Failed to load puzzle');

        const puzzleJSON: PuzzleJSON = await response.json();
        const puzzleModel = derivePuzzleModel(puzzleJSON, EN_V1);

        // Load or create initial state
        const savedState = await localStorageAdapter.loadPuzzleState(puzzleId);
        const initialState = savedState || createInitialState(puzzleModel);

        setPuzzleData({ model: puzzleModel, state: initialState });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    loadPuzzle();
  }, [puzzleId]);

  const handleEntryFocus = (entryId: string) => {
    setActiveEntryId(entryId);
    dispatch({ type: 'FOCUS_ENTRY', entryId });
  };

  const handleGuessChange = (entryId: string, guessText: string) => {
    dispatch({ type: 'UPDATE_GUESS', entryId, guessText });
    // Clear wrong state when user starts typing again
    if (wrongEntryId === entryId) {
      setWrongEntryId(null);
    }
  };

  const handleSubmit = (entryId: string) => {
    if (!puzzleData) return;

    const entryState = puzzleData.state.entries[entryId];
    if (!entryState || entryState.isSolved) return;

    // Submit the entry
    dispatch({ type: 'SUBMIT_ENTRY', entryId });

    // Check if it was solved (we need to check the new state)
    // Since dispatch is async via setState, we'll check synchronously with the reducer
    const newState = engineReduce(puzzleData.model, puzzleData.state, { type: 'SUBMIT_ENTRY', entryId }, EN_V1);
    const newEntryState = newState.entries[entryId];

    if (newEntryState?.isSolved) {
      // Move to next unsolved entry after a short delay
      setTimeout(() => {
        const nextEntry = findNextUnsolvedEntry(entryId);
        if (nextEntry) {
          setActiveEntryId(nextEntry);
        } else {
          setActiveEntryId(null); // All done
        }
      }, 300);
    } else {
      // Wrong answer - show error state
      setWrongEntryId(entryId);
      setTimeout(() => {
        setWrongEntryId(null);
      }, 1000);
    }
  };

  const handleHint = (entryId: string) => {
    dispatch({ type: 'HINT', entryId });
  };

  if (loading || !puzzleData) {
    return (
      <div className="puzzle-screen">
        <div className="puzzle-loading">Loading puzzle...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="puzzle-screen">
        <div className="puzzle-error">Error: {error}</div>
        <button className="back-button" onClick={onBack}>
          Back to Catalog
        </button>
      </div>
    );
  }

  const { model, state } = puzzleData;

  return (
    <div className="puzzle-screen">
      <header className="puzzle-header">
        <button className="back-button" onClick={onBack} aria-label="Back to catalog">
          ←
        </button>
        <div className="header-title">
          <span className="header-subtitle">Daily Keysmash</span>
          <span className="header-main">{model.title || 'Daily Keysmash'}</span>
        </div>
        <button className="settings-button" aria-label="Settings">
          ⚙
        </button>
      </header>

      <main className="puzzle-content">
        {state.completed && model.themeReveal && (
          <div className="theme-reveal">
            <h2 className="theme-headline">{model.themeReveal.headline || 'Puzzle Complete!'}</h2>
          </div>
        )}

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
                isActive={activeEntryId === entry.entryId}
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

      {!state.completed && (
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
        </footer>
      )}
    </div>
  );
}
