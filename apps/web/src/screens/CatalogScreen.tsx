import { useState, useEffect } from 'react';
import type { CatalogIndexJSON } from '@ks/engine';
import { isPuzzleCompleted } from '../lib/storage';
import './CatalogScreen.css';

type Props = {
  onSelectPuzzle: (puzzleId: string) => void;
  onHostGame?: (puzzleId: string) => void;
};

type PuzzleEntry = CatalogIndexJSON['puzzles'][0] & {
  isCompleted: boolean;
};

export default function CatalogScreen({ onSelectPuzzle, onHostGame }: Props) {
  const [puzzles, setPuzzles] = useState<PuzzleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCatalog() {
      try {
        const response = await fetch('/mvow/catalog/index.json');
        if (!response.ok) throw new Error('Failed to load catalog');

        const catalog: CatalogIndexJSON = await response.json();

        // Check completion status for each puzzle
        const puzzlesWithStatus = await Promise.all(
          catalog.puzzles.map(async (puzzle) => ({
            ...puzzle,
            isCompleted: await isPuzzleCompleted(puzzle.puzzle_id),
          }))
        );

        setPuzzles(puzzlesWithStatus);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    loadCatalog();
  }, []);

  if (loading) {
    return (
      <div className="catalog-screen">
        <div className="catalog-loading">Loading puzzles...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="catalog-screen">
        <div className="catalog-error">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="catalog-screen">
      <header className="catalog-header">
        <h1>Missing Vowels</h1>
      </header>

      <main className="catalog-content">
        <div className="puzzle-list">
          {puzzles.map((puzzle) => (
            <div key={puzzle.puzzle_id} className="puzzle-tile">
              <div className="puzzle-tile-content">
                <h2 className="puzzle-title">{puzzle.title || 'Puzzle'}</h2>
                <p className="puzzle-tagline">Just add vowels.</p>
              </div>

              <div className="puzzle-tile-actions">
                <button
                  className="play-button"
                  onClick={() => onSelectPuzzle(puzzle.puzzle_id)}
                  aria-label={`Play ${puzzle.title || puzzle.puzzle_id}${puzzle.isCompleted ? ' (completed)' : ''}`}
                >
                  <span className="play-icon">▶</span>
                  <span className="play-text">{puzzle.isCompleted ? 'Play Again' : 'Play'}</span>
                </button>

                {onHostGame && (
                  <button
                    className="host-button"
                    onClick={() => onHostGame(puzzle.puzzle_id)}
                    aria-label={`Host multiplayer game for ${puzzle.title || puzzle.puzzle_id}`}
                  >
                    <span className="host-icon">👥</span>
                    <span className="host-text">Host</span>
                  </button>
                )}

                {puzzle.isCompleted && (
                  <div className="completed-indicator">
                    <span className="check-icon">✓</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
