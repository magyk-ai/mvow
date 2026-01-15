import { describe, it, expect, beforeEach } from 'vitest';
import {
  derivePuzzleModel,
  createInitialState,
  reduce,
  EN_V1,
} from '../src/index.js';
import type { PuzzleModel, PuzzleState, PuzzleJSON } from '../src/model/types.js';

describe('reducer', () => {
  let model: PuzzleModel;
  let initialState: PuzzleState;

  beforeEach(() => {
    const puzzleJSON: PuzzleJSON = {
      version: 1,
      puzzle_id: 'test_reducer',
      language: 'en',
      entries: [
        { entry_id: 'e1', clue: 'Clue 1', answer: 'FAMILY' },
        { entry_id: 'e2', clue: 'Clue 2', answer: 'MYTH' },
      ],
    };

    model = derivePuzzleModel(puzzleJSON, EN_V1);
    initialState = createInitialState(model);
  });

  describe('createInitialState', () => {
    it('should create initial state with all entries', () => {
      expect(initialState.puzzleId).toBe('test_reducer');
      expect(initialState.completed).toBe(false);
      expect(initialState.focusedEntryId).toBe('e1');
      expect(Object.keys(initialState.entries)).toHaveLength(2);

      const e1State = initialState.entries['e1'];
      expect(e1State.isSolved).toBe(false);
      expect(e1State.hintIndex).toBe(0);
      expect(e1State.guessText).toBe('');
    });
  });

  describe('FOCUS_ENTRY', () => {
    it('should update focused entry', () => {
      const newState = reduce(model, initialState, {
        type: 'FOCUS_ENTRY',
        entryId: 'e2',
      }, EN_V1);

      expect(newState.focusedEntryId).toBe('e2');
    });
  });

  describe('UPDATE_GUESS', () => {
    it('should update guess text', () => {
      const newState = reduce(model, initialState, {
        type: 'UPDATE_GUESS',
        entryId: 'e1',
        guessText: 'family',
      }, EN_V1);

      expect(newState.entries['e1'].guessText).toBe('family');
    });

    it('should not mutate original state', () => {
      const newState = reduce(model, initialState, {
        type: 'UPDATE_GUESS',
        entryId: 'e1',
        guessText: 'test',
      }, EN_V1);

      expect(initialState.entries['e1'].guessText).toBe('');
      expect(newState.entries['e1'].guessText).toBe('test');
    });
  });

  describe('HINT', () => {
    it('should increment hint index', () => {
      const newState = reduce(model, initialState, {
        type: 'HINT',
        entryId: 'e1',
      }, EN_V1);

      expect(newState.entries['e1'].hintIndex).toBe(1);
    });

    it('should cap hint index at vowel count', () => {
      let state = initialState;

      // MYTH has 1 vowel (Y at position 1)
      state = reduce(model, state, { type: 'HINT', entryId: 'e2' }, EN_V1);
      expect(state.entries['e2'].hintIndex).toBe(1);

      // Additional hints should not increase
      state = reduce(model, state, { type: 'HINT', entryId: 'e2' }, EN_V1);
      expect(state.entries['e2'].hintIndex).toBe(1);
    });

    it('should not provide hints for solved entries', () => {
      let state = initialState;

      // Mark as solved first
      state = {
        ...state,
        entries: {
          ...state.entries,
          e1: { ...state.entries['e1'], isSolved: true },
        },
      };

      const newState = reduce(model, state, { type: 'HINT', entryId: 'e1' }, EN_V1);

      expect(newState.entries['e1'].hintIndex).toBe(0);
    });
  });

  describe('SUBMIT_ENTRY', () => {
    it('should mark entry as solved on correct answer', () => {
      let state = reduce(model, initialState, {
        type: 'UPDATE_GUESS',
        entryId: 'e1',
        guessText: 'family',
      }, EN_V1);

      state = reduce(model, state, {
        type: 'SUBMIT_ENTRY',
        entryId: 'e1',
      }, EN_V1);

      expect(state.entries['e1'].isSolved).toBe(true);
    });

    it('should accept case-insensitive answers', () => {
      let state = reduce(model, initialState, {
        type: 'UPDATE_GUESS',
        entryId: 'e1',
        guessText: 'FAMILY',
      }, EN_V1);

      state = reduce(model, state, {
        type: 'SUBMIT_ENTRY',
        entryId: 'e1',
      }, EN_V1);

      expect(state.entries['e1'].isSolved).toBe(true);
    });

    it('should not change state on incorrect answer', () => {
      let state = reduce(model, initialState, {
        type: 'UPDATE_GUESS',
        entryId: 'e1',
        guessText: 'wrong',
      }, EN_V1);

      state = reduce(model, state, {
        type: 'SUBMIT_ENTRY',
        entryId: 'e1',
      }, EN_V1);

      expect(state.entries['e1'].isSolved).toBe(false);
    });

    it('should mark puzzle as completed when all entries solved', () => {
      let state = reduce(model, initialState, {
        type: 'UPDATE_GUESS',
        entryId: 'e1',
        guessText: 'family',
      }, EN_V1);

      state = reduce(model, state, {
        type: 'SUBMIT_ENTRY',
        entryId: 'e1',
      }, EN_V1);

      expect(state.completed).toBe(false);

      state = reduce(model, state, {
        type: 'UPDATE_GUESS',
        entryId: 'e2',
        guessText: 'myth',
      }, EN_V1);

      state = reduce(model, state, {
        type: 'SUBMIT_ENTRY',
        entryId: 'e2',
      }, EN_V1);

      expect(state.completed).toBe(true);
    });
  });

  describe('RESET_ENTRY', () => {
    it('should reset entry state', () => {
      let state = reduce(model, initialState, {
        type: 'UPDATE_GUESS',
        entryId: 'e1',
        guessText: 'test',
      }, EN_V1);

      state = reduce(model, state, {
        type: 'HINT',
        entryId: 'e1',
      }, EN_V1);

      state = reduce(model, state, {
        type: 'RESET_ENTRY',
        entryId: 'e1',
      }, EN_V1);

      expect(state.entries['e1'].guessText).toBe('');
      expect(state.entries['e1'].hintIndex).toBe(0);
      expect(state.entries['e1'].isSolved).toBe(false);
    });
  });

  describe('RESET_PUZZLE', () => {
    it('should reset entire puzzle state', () => {
      let state = reduce(model, initialState, {
        type: 'UPDATE_GUESS',
        entryId: 'e1',
        guessText: 'family',
      }, EN_V1);

      state = reduce(model, state, {
        type: 'SUBMIT_ENTRY',
        entryId: 'e1',
      }, EN_V1);

      state = reduce(model, state, {
        type: 'RESET_PUZZLE',
      }, EN_V1);

      expect(state.entries['e1'].isSolved).toBe(false);
      expect(state.entries['e1'].guessText).toBe('');
      expect(state.completed).toBe(false);
    });
  });
});
