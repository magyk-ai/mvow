import type {
  PuzzleModel,
  PuzzleState,
  EntryRenderModel,
  LanguageConfig,
  DisplayCharacter,
} from '../model/types.js';
import { canonicalize } from '../rules/canonicalize.js';
import { extractConsonants, isVowel, isLetter, isSeparator } from '../rules/characters.js';

/**
 * Build masked display string from answer and hint reveals
 * Walks the original answer and replaces vowels at indices >= hintIndex with '_'
 */
function buildMaskedDisplay(
  answerOriginal: string,
  vowelCharIndices: number[],
  hintIndex: number
): string {
  // Create a set of vowel positions that should still be hidden
  const hiddenVowelPositions = new Set<number>();
  for (let i = hintIndex; i < vowelCharIndices.length; i++) {
    hiddenVowelPositions.add(vowelCharIndices[i]);
  }

  let result = '';
  for (let i = 0; i < answerOriginal.length; i++) {
    const ch = answerOriginal[i];
    if (hiddenVowelPositions.has(i)) {
      result += '_';
    } else {
      result += ch;
    }
  }

  return result;
}

/**
 * Compute longest prefix match between typed consonants and skeleton
 */
function computeMatchedPrefixLen(
  typedConsonants: string,
  skeleton: string
): number {
  let matchedLen = 0;
  const minLen = Math.min(typedConsonants.length, skeleton.length);

  for (let i = 0; i < minLen; i++) {
    if (typedConsonants[i] === skeleton[i]) {
      matchedLen++;
    } else {
      break;
    }
  }

  return matchedLen;
}

/**
 * Build consonants-only display (no vowels, keep separators)
 * "FAMILY" → "FMLY", "FAMILY TREE" → "FMLY TR"
 */
function buildConsonantsOnlyDisplay(
  answerOriginal: string,
  cfg: LanguageConfig
): string {
  let result = '';
  for (const ch of answerOriginal) {
    if (isSeparator(ch)) {
      result += ch;
    } else if (isLetter(ch) && !isVowel(ch, cfg)) {
      result += ch;
    }
    // vowels are omitted entirely
  }
  return result;
}

/**
 * Build display characters array with per-character metadata for highlighting
 */
function buildDisplayCharacters(
  answerOriginal: string,
  vowelCharIndices: number[],
  hintIndex: number,
  matchedPrefixLen: number,
  cfg: LanguageConfig
): DisplayCharacter[] {
  const characters: DisplayCharacter[] = [];

  // Create a set of revealed vowel positions (vowels at indices < hintIndex)
  const revealedVowelPositions = new Set<number>();
  for (let i = 0; i < hintIndex && i < vowelCharIndices.length; i++) {
    revealedVowelPositions.add(vowelCharIndices[i]);
  }

  let consonantIndex = 0; // Track which consonant we're on for matching

  for (let i = 0; i < answerOriginal.length; i++) {
    const ch = answerOriginal[i];

    if (isSeparator(ch)) {
      characters.push({
        char: ch,
        type: 'separator',
        isRevealed: false,
        isMatched: false,
      });
    } else if (isVowel(ch, cfg)) {
      characters.push({
        char: ch,
        type: 'vowel',
        isRevealed: revealedVowelPositions.has(i),
        isMatched: false,
      });
    } else if (isLetter(ch)) {
      // Consonant
      const isMatched = consonantIndex < matchedPrefixLen;
      characters.push({
        char: ch,
        type: 'consonant',
        isRevealed: false,
        isMatched,
      });
      consonantIndex++;
    }
  }

  return characters;
}

/**
 * Select the render model for a specific entry
 * Computes masked display and consonant feedback
 */
export function selectEntryRenderModel(
  model: PuzzleModel,
  state: PuzzleState,
  entryId: string,
  cfg: LanguageConfig
): EntryRenderModel {
  const entryModel = model.entryById[entryId];
  const entryState = state.entries[entryId];

  if (!entryModel || !entryState) {
    throw new Error(`Entry not found: ${entryId}`);
  }

  // Build masked display
  const maskedDisplay = buildMaskedDisplay(
    entryModel.answerOriginal,
    entryModel.derived.vowelCharIndices,
    entryState.hintIndex
  );

  // Compute consonant feedback
  const typedCanon = canonicalize(entryState.guessText, cfg);
  const typedConsonants = extractConsonants(typedCanon, cfg);
  const matchedPrefixLen = computeMatchedPrefixLen(
    typedConsonants,
    entryModel.derived.skeleton
  );

  // Build consonants-only display (no underscores for vowels)
  const consonantsOnly = buildConsonantsOnlyDisplay(
    entryModel.answerOriginal,
    cfg
  );

  // Build per-character display data for highlighting
  const displayCharacters = buildDisplayCharacters(
    entryModel.answerOriginal,
    entryModel.derived.vowelCharIndices,
    entryState.hintIndex,
    matchedPrefixLen,
    cfg
  );

  return {
    entryId,
    clue: entryModel.clue,
    isSolved: entryState.isSolved,
    maskedDisplay,
    guessText: entryState.guessText,
    consonantHighlight: {
      skeleton: entryModel.derived.skeleton,
      matchedPrefixLen,
    },
    consonantsOnly,
    displayCharacters,
    hintIndex: entryState.hintIndex,
  };
}

/**
 * Check if puzzle is completed
 */
export function selectPuzzleCompletion(state: PuzzleState): boolean {
  return state.completed;
}
