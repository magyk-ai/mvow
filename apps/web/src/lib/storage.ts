import type { PuzzleState, StorageAdapter } from '@ks/engine';

const STORAGE_KEY_PREFIX = 'ks_puzzle_state_';

/**
 * LocalStorage-based storage adapter for puzzle state
 */
export const localStorageAdapter: StorageAdapter = {
  async loadPuzzleState(puzzleId: string): Promise<PuzzleState | null> {
    try {
      const key = STORAGE_KEY_PREFIX + puzzleId;
      const data = localStorage.getItem(key);
      if (!data) return null;
      return JSON.parse(data) as PuzzleState;
    } catch (error) {
      console.error('Failed to load puzzle state:', error);
      return null;
    }
  },

  async savePuzzleState(puzzleId: string, state: PuzzleState): Promise<void> {
    try {
      const key = STORAGE_KEY_PREFIX + puzzleId;
      localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save puzzle state:', error);
    }
  },

  async clearPuzzleState(puzzleId: string): Promise<void> {
    try {
      const key = STORAGE_KEY_PREFIX + puzzleId;
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to clear puzzle state:', error);
    }
  },
};

/**
 * Check if a puzzle has been completed
 */
export async function isPuzzleCompleted(puzzleId: string): Promise<boolean> {
  const state = await localStorageAdapter.loadPuzzleState(puzzleId);
  return state?.completed ?? false;
}
