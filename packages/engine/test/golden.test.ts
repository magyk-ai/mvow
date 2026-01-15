import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  derivePuzzleModel,
  createInitialState,
  reduce,
  selectEntryRenderModel,
  EN_V1,
} from '../src/index.js';
import type { PuzzleJSON, PuzzleModel, PuzzleState, Action } from '../src/model/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

type GoldenStep = {
  action: Action;
  expect: {
    maskedDisplay?: string;
    matchedPrefixLen?: number;
    skeleton?: string;
    guessText?: string;
    hintIndex?: number;
    isSolved?: boolean;
    completed?: boolean;
  };
};

type GoldenFile = {
  puzzle: string;
  entry: string;
  steps: GoldenStep[];
};

function loadFixture(filename: string): any {
  const path = join(__dirname, 'fixtures', filename);
  const content = readFileSync(path, 'utf-8');
  return JSON.parse(content);
}

function runGoldenTest(goldenFilename: string) {
  const golden: GoldenFile = loadFixture(goldenFilename);
  const puzzleJSON: PuzzleJSON = loadFixture(golden.puzzle);

  const model: PuzzleModel = derivePuzzleModel(puzzleJSON, EN_V1);
  let state: PuzzleState = createInitialState(model);

  for (let i = 0; i < golden.steps.length; i++) {
    const step = golden.steps[i];

    // Apply action
    state = reduce(model, state, step.action, EN_V1);

    // Get render model
    const renderModel = selectEntryRenderModel(model, state, golden.entry, EN_V1);

    // Assert expectations
    const expectations = step.expect;

    if (expectations.maskedDisplay !== undefined) {
      expect(renderModel.maskedDisplay).toBe(
        expectations.maskedDisplay,
        `Step ${i}: maskedDisplay mismatch`
      );
    }

    if (expectations.matchedPrefixLen !== undefined) {
      expect(renderModel.consonantHighlight.matchedPrefixLen).toBe(
        expectations.matchedPrefixLen,
        `Step ${i}: matchedPrefixLen mismatch`
      );
    }

    if (expectations.skeleton !== undefined) {
      expect(renderModel.consonantHighlight.skeleton).toBe(
        expectations.skeleton,
        `Step ${i}: skeleton mismatch`
      );
    }

    if (expectations.guessText !== undefined) {
      expect(renderModel.guessText).toBe(
        expectations.guessText,
        `Step ${i}: guessText mismatch`
      );
    }

    if (expectations.hintIndex !== undefined) {
      expect(state.entries[golden.entry].hintIndex).toBe(
        expectations.hintIndex,
        `Step ${i}: hintIndex mismatch`
      );
    }

    if (expectations.isSolved !== undefined) {
      expect(renderModel.isSolved).toBe(
        expectations.isSolved,
        `Step ${i}: isSolved mismatch`
      );
    }

    if (expectations.completed !== undefined) {
      expect(state.completed).toBe(
        expectations.completed,
        `Step ${i}: completed mismatch`
      );
    }
  }
}

describe('golden tests', () => {
  it('should pass golden_basic test', () => {
    runGoldenTest('golden_basic.steps.json');
  });

  it('should pass golden_punctuation test', () => {
    runGoldenTest('golden_punctuation.steps.json');
  });

  it('should pass golden_y_vowel test', () => {
    runGoldenTest('golden_y_vowel.steps.json');
  });
});
