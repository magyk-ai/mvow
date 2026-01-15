import type {
  PuzzleModel,
  PuzzleState,
  EntryState,
  Action,
  LanguageConfig,
} from '../model/types.js';
import { canonicalize } from '../rules/canonicalize.js';

/**
 * Create initial puzzle state for a given model
 */
export function createInitialState(model: PuzzleModel): PuzzleState {
  const entries: Record<string, EntryState> = {};

  for (const entry of model.entries) {
    entries[entry.entryId] = {
      entryId: entry.entryId,
      isSolved: false,
      hintIndex: 0,
      guessText: '',
    };
  }

  return {
    puzzleId: model.puzzleId,
    focusedEntryId: model.entries.length > 0 ? model.entries[0].entryId : undefined,
    entries,
    completed: false,
  };
}

/**
 * Pure reducer for puzzle state transitions
 * Returns new state object (immutable update)
 */
export function reduce(
  model: PuzzleModel,
  state: PuzzleState,
  action: Action,
  cfg: LanguageConfig
): PuzzleState {
  switch (action.type) {
    case 'FOCUS_ENTRY': {
      return {
        ...state,
        focusedEntryId: action.entryId,
      };
    }

    case 'UPDATE_GUESS': {
      const entryState = state.entries[action.entryId];
      if (!entryState) return state;

      return {
        ...state,
        entries: {
          ...state.entries,
          [action.entryId]: {
            ...entryState,
            guessText: action.guessText,
          },
        },
      };
    }

    case 'HINT': {
      const entryState = state.entries[action.entryId];
      if (!entryState || entryState.isSolved) return state;

      const entryModel = model.entryById[action.entryId];
      if (!entryModel) return state;

      const vowelCount = entryModel.derived.vowelCharIndices.length;

      // Cap hintIndex at vowel count
      if (entryState.hintIndex >= vowelCount) return state;

      return {
        ...state,
        entries: {
          ...state.entries,
          [action.entryId]: {
            ...entryState,
            hintIndex: entryState.hintIndex + 1,
          },
        },
      };
    }

    case 'SUBMIT_ENTRY': {
      const entryState = state.entries[action.entryId];
      if (!entryState) return state;

      const entryModel = model.entryById[action.entryId];
      if (!entryModel) return state;

      // Canonicalize guess and compare
      const guessCanon = canonicalize(entryState.guessText, cfg);
      const isCorrect = guessCanon === entryModel.derived.answerCanonical;

      if (!isCorrect) {
        // No state change if incorrect
        return state;
      }

      // Mark as solved
      const newEntries = {
        ...state.entries,
        [action.entryId]: {
          ...entryState,
          isSolved: true,
        },
      };

      // Recompute completion status
      const allSolved = Object.values(newEntries).every((e) => e.isSolved);

      return {
        ...state,
        entries: newEntries,
        completed: allSolved,
      };
    }

    case 'RESET_ENTRY': {
      const entryState = state.entries[action.entryId];
      if (!entryState) return state;

      return {
        ...state,
        entries: {
          ...state.entries,
          [action.entryId]: {
            ...entryState,
            isSolved: false,
            hintIndex: 0,
            guessText: '',
          },
        },
        completed: false,
      };
    }

    case 'RESET_PUZZLE': {
      return createInitialState(model);
    }

    default:
      return state;
  }
}
