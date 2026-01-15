import { describe, it, expect } from 'vitest';
import { derivePuzzleModel } from '../src/core/derive.js';
import { EN_V1 } from '../src/config.js';
import type { PuzzleJSON } from '../src/model/types.js';

describe('derivePuzzleModel', () => {
  it('should derive basic puzzle model', () => {
    const puzzleJSON: PuzzleJSON = {
      version: 1,
      puzzle_id: 'test_001',
      language: 'en',
      entries: [
        {
          entry_id: 'e1',
          clue: 'Test clue',
          answer: 'FAMILY',
        },
      ],
    };

    const model = derivePuzzleModel(puzzleJSON, EN_V1);

    expect(model.puzzleId).toBe('test_001');
    expect(model.language).toBe('en');
    expect(model.entries).toHaveLength(1);

    const entry = model.entries[0];
    expect(entry.entryId).toBe('e1');
    expect(entry.clue).toBe('Test clue');
    expect(entry.answerOriginal).toBe('FAMILY');
    expect(entry.derived.answerCanonical).toBe('family');
    expect(entry.derived.skeleton).toBe('fml');
    // FAMILY: vowels at positions 1 (A), 3 (I), 5 (Y)
    expect(entry.derived.vowelCharIndices).toEqual([1, 3, 5]);
  });

  it('should handle Y as vowel', () => {
    const puzzleJSON: PuzzleJSON = {
      version: 1,
      puzzle_id: 'test_y',
      language: 'en',
      entries: [
        {
          entry_id: 'e1',
          clue: 'Test',
          answer: 'MYTH',
        },
      ],
    };

    const model = derivePuzzleModel(puzzleJSON, EN_V1);
    const entry = model.entries[0];

    // MYTH: vowel Y at position 1
    expect(entry.derived.vowelCharIndices).toEqual([1]);
    expect(entry.derived.skeleton).toBe('mth');
  });

  it('should handle punctuation and spaces', () => {
    const puzzleJSON: PuzzleJSON = {
      version: 1,
      puzzle_id: 'test_punct',
      language: 'en',
      entries: [
        {
          entry_id: 'e1',
          clue: 'Test',
          answer: "DON'T STOP",
        },
      ],
    };

    const model = derivePuzzleModel(puzzleJSON, EN_V1);
    const entry = model.entries[0];

    expect(entry.derived.answerCanonical).toBe("don't stop");
    // DON'T STOP: vowels O at position 1 and position 8
    expect(entry.derived.vowelCharIndices).toEqual([1, 8]);
    expect(entry.derived.skeleton).toBe('dntstp');
  });

  it('should build entryById map', () => {
    const puzzleJSON: PuzzleJSON = {
      version: 1,
      puzzle_id: 'test_map',
      language: 'en',
      entries: [
        { entry_id: 'e1', clue: 'C1', answer: 'AAA' },
        { entry_id: 'e2', clue: 'C2', answer: 'BBB' },
      ],
    };

    const model = derivePuzzleModel(puzzleJSON, EN_V1);

    expect(model.entryById['e1']).toBeDefined();
    expect(model.entryById['e2']).toBeDefined();
    expect(model.entryById['e1'].answerOriginal).toBe('AAA');
  });

  it('should throw on unsupported version', () => {
    const puzzleJSON = {
      version: 99,
      puzzle_id: 'test',
      language: 'en',
      entries: [],
    } as any;

    expect(() => derivePuzzleModel(puzzleJSON, EN_V1)).toThrow('version');
  });

  it('should throw on language mismatch', () => {
    const puzzleJSON: PuzzleJSON = {
      version: 1,
      puzzle_id: 'test',
      language: 'en',
      entries: [],
    };

    const fakeConfig = { ...EN_V1, id: 'fr' as const };

    expect(() => derivePuzzleModel(puzzleJSON, fakeConfig as any)).toThrow(
      'Language mismatch'
    );
  });
});
