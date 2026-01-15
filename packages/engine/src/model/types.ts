// Content types (authoring format)
export type CatalogIndexJSON = {
  version: 1;
  language: 'en';
  puzzles: Array<{
    puzzle_id: string;
    title?: string;
    path: string;
    tags?: string[];
  }>;
};

export type PuzzleJSON = {
  version: 1;
  puzzle_id: string;
  language: 'en';
  title?: string;
  theme_reveal?: {
    headline?: string;
    body?: string;
    meta?: Record<string, unknown>;
  };
  entries: Array<{
    entry_id: string;
    clue: string;
    answer: string;
  }>;
};

// Language configuration
export type LanguageConfig = {
  id: 'en';
  vowels: readonly string[];  // includes Y
  stripDiacritics: true;
};

// Derived models (computed at load)
export type EntryDerived = {
  answerCanonical: string;
  // Indices into answerOriginal string positions (0..len-1)
  // for each vowel char in the authored answer, left-to-right
  vowelCharIndices: number[];
  // Skeleton built from canonical answer: consonants only, vowels (including Y) removed
  skeleton: string;
};

export type EntryModel = {
  entryId: string;
  clue: string;
  answerOriginal: string;  // as authored
  derived: EntryDerived;
};

export type PuzzleModel = {
  puzzleId: string;
  language: 'en';
  title?: string;
  themeReveal?: PuzzleJSON['theme_reveal'];
  entries: EntryModel[];
  entryById: Record<string, EntryModel>;
};

// Runtime state (serializable)
export type EntryState = {
  entryId: string;
  isSolved: boolean;
  hintIndex: number;     // how many vowels revealed so far (L->R)
  guessText: string;     // raw user input from single text box
};

export type PuzzleState = {
  puzzleId: string;
  focusedEntryId?: string;
  entries: Record<string, EntryState>;
  completed: boolean;
};

// Actions (reducer inputs)
export type Action =
  | { type: 'FOCUS_ENTRY'; entryId: string }
  | { type: 'UPDATE_GUESS'; entryId: string; guessText: string }
  | { type: 'HINT'; entryId: string }
  | { type: 'SUBMIT_ENTRY'; entryId: string }
  | { type: 'RESET_ENTRY'; entryId: string }
  | { type: 'RESET_PUZZLE' };

// Character type for display rendering
export type DisplayCharacter = {
  char: string;
  type: 'consonant' | 'vowel' | 'separator';
  isRevealed: boolean;  // true if vowel was revealed by hint
  isMatched: boolean;   // true if consonant matches user input
};

// Render model (UI-facing)
export type EntryRenderModel = {
  entryId: string;
  clue: string;
  isSolved: boolean;
  // Mask is driven by answer + hintIndex
  maskedDisplay: string;  // e.g. 'F_M_LY TR__' (Y treated as vowel)
  // What the player has typed
  guessText: string;
  // Live consonant feedback from the typed guess
  consonantHighlight: {
    skeleton: string;             // consonants-only target
    matchedPrefixLen: number;     // longest prefix match between typed consonants and skeleton
  };
  // New fields for Daily Keysmash style display
  consonantsOnly: string;         // e.g. 'FMLY TR' - consonants + separators, no vowels
  displayCharacters: DisplayCharacter[];  // per-character data for highlighting
  hintIndex: number;              // how many vowels have been revealed
};

// Storage adapter interface
export interface StorageAdapter {
  loadPuzzleState(puzzleId: string): Promise<PuzzleState | null>;
  savePuzzleState(puzzleId: string, state: PuzzleState): Promise<void>;
  clearPuzzleState(puzzleId: string): Promise<void>;
}
