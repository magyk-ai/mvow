import type {
  PuzzleJSON,
  PuzzleModel,
  EntryModel,
  EntryDerived,
  LanguageConfig,
} from '../model/types.js';
import { canonicalize } from '../rules/canonicalize.js';
import { extractConsonants, isVowel } from '../rules/characters.js';

/**
 * Derive the EntryDerived model from an entry's answer
 */
function deriveEntry(
  entryId: string,
  clue: string,
  answerOriginal: string,
  cfg: LanguageConfig
): EntryModel {
  // Canonicalize the answer
  const answerCanonical = canonicalize(answerOriginal, cfg);

  // Find vowel positions in the original answer (0-indexed)
  const vowelCharIndices: number[] = [];
  for (let i = 0; i < answerOriginal.length; i++) {
    const ch = answerOriginal[i];
    if (isVowel(ch, cfg)) {
      vowelCharIndices.push(i);
    }
  }

  // Extract consonant skeleton from canonical answer
  const skeleton = extractConsonants(answerCanonical, cfg);

  const derived: EntryDerived = {
    answerCanonical,
    vowelCharIndices,
    skeleton,
  };

  return {
    entryId,
    clue,
    answerOriginal,
    derived,
  };
}

/**
 * Derive a PuzzleModel from puzzle JSON content
 * Validates version and language, computes derived fields for each entry
 */
export function derivePuzzleModel(
  puzzle: PuzzleJSON,
  cfg: LanguageConfig
): PuzzleModel {
  // Validate version
  if (puzzle.version !== 1) {
    throw new Error(`Unsupported puzzle version: ${puzzle.version}`);
  }

  // Validate language
  if (puzzle.language !== cfg.id) {
    throw new Error(
      `Language mismatch: puzzle is ${puzzle.language}, config is ${cfg.id}`
    );
  }

  // Derive entries
  const entries: EntryModel[] = puzzle.entries.map((entry) =>
    deriveEntry(entry.entry_id, entry.clue, entry.answer, cfg)
  );

  // Build entryById map
  const entryById: Record<string, EntryModel> = {};
  for (const entry of entries) {
    entryById[entry.entryId] = entry;
  }

  return {
    puzzleId: puzzle.puzzle_id,
    language: puzzle.language,
    title: puzzle.title,
    themeReveal: puzzle.theme_reveal,
    entries,
    entryById,
  };
}
