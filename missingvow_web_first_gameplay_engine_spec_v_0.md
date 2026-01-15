# Keysmash-Style Vowel-Restoration Puzzle — Web-First Spec (v0.1)

> **Purpose**: A single, self-contained spec that a dev team can start building immediately.  
> **Scope**: Game mechanics + implementation-ready architecture.  
> **Out of scope**: Daily streaks / daily scheduling / content strategy details.

---

## 0) Product constraints (explicit)

- **Web-first**: Primary delivery is a static website deployable to **GitHub Pages** (no server required for core gameplay).
- **Mobile form factor first**: UX optimized for small touch screens; desktop is supported.
- **Always-available puzzles**: No daily gating. Puzzle selection is catalog-based.
- **Portable to mobile later**: Core gameplay logic must be **platform-agnostic** and reusable in a native wrapper (e.g., Capacitor).
- **Offline-friendly**: Should work fully offline once the site is cached (PWA recommended). (Cloud sync is optional later.)

---

## 1) Technology baseline

### 1.1 Runtime + language
- **Node.js**: Target **Node 24 (Active LTS)** as baseline for tooling and engine tests.
  - Repo should set `"engines": { "node": ">=24" }`.
- **TypeScript**: Latest stable TS compatible with Node 24 toolchain.
- **Module system**: **ESM-first** (`"type": "module"`).

### 1.2 Build + tooling (web)
- **Vite** (recommended) for a small, fast, static build output.
- **PWA**: Vite PWA plugin (or Workbox) to cache assets + puzzle catalog.
- **Testing**: **Vitest** for unit tests (engine) + basic UI tests.
- **CLI harness**: `tsx` for running engine from Node without bundling.

### 1.3 Frontend framework decision
This game is UI-light (forms + list + state), so a **web game engine is unnecessary**.

**Recommended default**: **React + TypeScript + Vite** (or **Preact** if you want smaller bundle).
- Pros: huge ecosystem, easy to hire, easy state patterns, straightforward mobile-first UI.
- Cons: a bit heavier than vanilla.

**Viable alternative**: **SvelteKit (static adapter)** or **Solid** if you prefer smaller runtime.

**Do NOT use** Phaser/Unity/WebGL engines: the mechanics are text + form input; engine overhead adds risk with little value.

**Portability path** (later): wrap the built web app with **Capacitor** (keeps HTML/CSS/JS UI), while reusing the same engine package.

---

## 2) Repository layout (monorepo; static deploy friendly)

Use npm workspaces (or pnpm) for clean separation.

```
repo/
  package.json              # workspaces + scripts
  tsconfig.base.json
  apps/
    web/
      index.html
      vite.config.ts
      src/
        main.tsx
        ui/
        screens/
        components/
      public/
        catalog/            # static JSON content (stub)
  packages/
    engine/
      package.json
      src/
        index.ts
        model/
        rules/
        reducers/
        render/
        persistence/
      test/
    tools/
      cli/
        src/
          ks-run.ts         # node/tsx runnable demo
```

### 2.1 Deployment requirement
- `apps/web` must build to `dist/` with static assets only.
- Must support GitHub Pages base path (Vite `base: '/<repo-name>/'`).

---

## 3) Game definition (mechanics)

### 3.1 Player fantasy
"Restore missing vowels in themed answers using clues."

### 3.2 What the player sees
- Puzzle Set screen: a list/grid of entries.
- Each entry shows:
  - clue
  - masked answer display (consonants + separators shown; vowels hidden)
  - solved status
- Entry screen/panel:
  - focused clue
  - masked answer display
  - input interaction
  - **Hint** (reveal next vowel) and **Submit**

### 3.3 Win condition
- Puzzle Set is complete when **all entries are solved**.
- Completion reveals a **Theme panel** (simple content object).

---

## 4) Content contract (stub; authoring format)

> Content strategy is separate; this spec defines contracts and stubs.

### 4.1 Catalog structure (static)
- A **catalog index** lists available puzzles.
- Each puzzle is a JSON file.

**Example**:
```
/public/catalog/index.json
/public/catalog/puzzles/ks_set_000142.json
```

### 4.2 Catalog index schema
```json
{
  "version": 1,
  "language": "en",
  "puzzles": [
    {
      "puzzle_id": "ks_set_000142",
      "title": "Optional",
      "path": "/catalog/puzzles/ks_set_000142.json",
      "tags": ["movies", "animals"]
    }
  ]
}
```

### 4.3 Puzzle schema (authoring)
```json
{
  "version": 1,
  "puzzle_id": "ks_set_000142",
  "language": "en",
  "title": "Optional",
  "theme_reveal": {
    "headline": "Theme",
    "body": "Optional",
    "meta": {}
  },
  "entries": [
    {
      "entry_id": "e1",
      "clue": "Clue text",
      "answer": "Correct Answer Here"
    }
  ]
}
```

### 4.4 Authoring constraints
- Answers may include **spaces**, **hyphens**, **apostrophes**, and punctuation.
- Case in `answer` is for display only; engine canonicalizes for comparison.

---

## 5) Engine package (`@ks/engine`) — design goals

### 5.1 Non-negotiable properties
- **Pure TypeScript**: no DOM APIs, no framework imports.
- **Deterministic**: hint reveals are predictable; same inputs yield same outputs.
- **Serializable state**: game state can be saved/restored with JSON.
- **Testable from Node**: unit tests and CLI demo run without browser.

### 5.2 Engine responsibilities
- Parse puzzle content.
- Compute derived fields (mask tokens, skeleton, vowel positions).
- Maintain entry/puzzle state.
- Apply actions (input, hint, submit).
- Provide render models for the UI (strings + highlight ranges).

### 5.3 UI responsibilities (web app)
- Navigation and screens.
- Keyboard/touch UX.
- Visual rendering and accessibility.
- Persistence adapter selection (localStorage/IndexedDB) using engine’s state shape.

---

## 6) Canonicalization + language rules (v1 locked)

### 6.1 v1 scope
- **Language**: **English only** for v1.
- **Accents/diacritics**: **accent-insensitive** (diacritics are ignored for matching).
- **Y rule**: **treat Y as a vowel** for the game.

### 6.2 Config object
Engine accepts a `LanguageConfig` (but v1 ships with exactly one default config).

```ts
export type LanguageConfig = {
  id: 'en';
  // IMPORTANT: includes Y
  vowels: readonly string[];      // ['A','E','I','O','U','Y']
  stripDiacritics: true;          // v1 locked
};

export const EN_V1: LanguageConfig = {
  id: 'en',
  vowels: ['A','E','I','O','U','Y'],
  stripDiacritics: true,
} as const;
```

### 6.3 Canonicalization
Define `canonicalize(s, cfg)`:
1. Unicode normalize **NFKC**.
2. Trim.
3. Collapse whitespace runs to a single space.
4. Convert to case-insensitive form:
   - Use `toLowerCase()` (English v1).
5. If `cfg.stripDiacritics === true`:
   - Normalize to **NFD** and remove combining marks (Unicode `\p{M}`), then normalize back to NFC (optional).

**Reasoning (mechanics)**: v1 content may include accented characters but players aren’t required to enter them; matching must succeed without accents.

### 6.4 Character classification
Define helpers:
- `isLetter(ch)` (Unicode letter)
- `isVowel(ch, cfg)` (letter and its uppercase form in cfg.vowels)
- `isConsonant(ch, cfg)` (letter and not vowel)
- `isSeparator(ch)` (space, punctuation, hyphen, apostrophe)

---

## 7) Derived model (computed at load)

### 7.1 MaskToken
```ts
export type MaskToken =
  | { kind: 'consonant'; answerChar: string }
  | { kind: 'vowel'; answerChar: string; revealed: boolean; typed?: string }
  | { kind: 'separator'; answerChar: string };
```

### 7.2 EntryDerived
```ts
export type EntryDerived = {
  answerCanonical: string;
  mask: MaskToken[];
  skeleton: string;          // consonants only, in order
  vowelIndices: number[];    // indices into mask[] for vowels, L->R
};
```

### 7.3 Computation rules
- From `answerCanonical`, scan left→right.
- For each char:
  - vowel → `MaskToken(vowel, revealed=false)`
  - consonant → `MaskToken(consonant)` and append to `skeleton`
  - separator → `MaskToken(separator)`
- `vowelIndices` is the list of mask indices with `kind='vowel'`.

---

## 8) Runtime state model (serializable)

### 8.1 EntryState
```ts
export type EntryState = {
  entryId: string;
  isSolved: boolean;
  hintIndex: number;     // how many vowels revealed so far (L->R)
  guessText: string;     // raw user input from single text box
};
```

### 8.2 PuzzleState
```ts
export type PuzzleState = {
  puzzleId: string;
  focusedEntryId?: string;
  entries: Record<string, EntryState>;
  completed: boolean;
};
```

---

## 9) Action/reducer API (engine core)

### 9.1 Actions
```ts
export type Action =
  | { type: 'FOCUS_ENTRY'; entryId: string }
  | { type: 'UPDATE_GUESS'; entryId: string; guessText: string }
  | { type: 'HINT'; entryId: string }
  | { type: 'SUBMIT_ENTRY'; entryId: string }
  | { type: 'RESET_ENTRY'; entryId: string }
  | { type: 'RESET_PUZZLE' };
```

### 9.2 Reducer signature
```ts
export function reduce(
  puzzle: PuzzleModel,      // content + derived
  state: PuzzleState,
  action: Action,
  cfg: LanguageConfig
): PuzzleState;
```

### 9.3 Determinism rules
- Reducer must be pure: no time, randomness, or IO.
- `UPDATE_GUESS` stores text verbatim; canonicalization happens during validation/render selectors.

---

## 10) Input model (mobile-first, **single text box**)

### 10.1 Requirement (locked)
- UI uses **one text input** where the player types the **full answer/phrase**.
- Engine must support live consonant feedback and hint reveals without requiring per-vowel-slot input.

### 10.2 Engine representation
Per entry, store a single `guessText` string (raw user input).
- Engine does **not** attempt to auto-map typed characters into vowel slots.
- The masked display is derived from the answer + hint reveals (not from the typed guess).

**Why this is correct**: It keeps the engine deterministic and the UX familiar on mobile (a standard keyboard). It avoids fragile alignment logic for multi-word phrases and punctuation.

### 10.3 Allowed characters
- Accept any characters in the input box.
- Canonicalization will normalize whitespace, case, and strip diacritics.
- Validation compares canonicalized guess to canonicalized answer.

### 10.4 Cursor behavior
- Cursor behavior is delegated to the browser (standard text input).
- Engine does not manage cursor position.

---

## 11) Hint system (unlimited, deterministic)

### 11.1 State
- `hintIndex` per entry: starts at 0.

### 11.2 Behavior
On `HINT`:
- if `hintIndex >= vowelCount`: no-op.
- else reveal the vowel at **vowel slot = hintIndex** (left-to-right in the answer):
  - reveal is represented in the entry’s **rendered mask**, not by mutating guess text.
  - increment `hintIndex`.

### 11.3 Interaction with input box
- Hints **do not auto-insert** into `guessText`.
- Player uses revealed vowels visually to update their guess.

**Reasoning**: Auto-inserting characters into a mobile text box can feel disruptive (cursor jumps, autocorrect conflicts). Keeping hints visual is simpler and consistent.

---

## 12) Rendering model (engine → UI)

Engine provides a **render snapshot** per entry that UI can display without duplicating rules.

### 12.1 EntryRenderModel
```ts
export type EntryRenderModel = {
  entryId: string;
  clue: string;
  isSolved: boolean;
  // Mask is driven by answer + hintIndex.
  maskedDisplay: string;          // e.g. 'F_M_LY TR__' (Y treated as vowel)
  // What the player has typed.
  guessText: string;
  // Live consonant feedback from the typed guess.
  consonantHighlight: {
    skeleton: string;             // consonants-only target
    matchedPrefixLen: number;     // longest prefix match between typed consonants and skeleton
  };
};
```

### 12.2 maskedDisplay construction
- Walk the answer (display casing preserved as authored).
- For each character:
  - consonant: show it
  - vowel (A/E/I/O/U/Y): show it **only if** its vowel-slot index `< hintIndex`, else show `_`
  - separator/punctuation: show as-is

> This exactly implements “reveal next vowel” deterministically.

### 12.3 Consonant highlight algorithm (live)
- `typedCanon = canonicalize(guessText, cfg)`
- `typedConsonants = extractConsonants(typedCanon)`
- Compare `typedConsonants` to `skeleton` to compute `matchedPrefixLen`.

---

## 13) Validation + submission

### 13.1 Submit behavior
On `SUBMIT_ENTRY`:
1. `guessCanon = canonicalize(state.entries[entryId].guessText, cfg)`
2. Compare to `answerCanonical`.
3. If equal: set `isSolved = true`.
4. Else: state unchanged (UI may show error feedback).

### 13.2 Puzzle completion
After a successful solve:
- recompute `completed = all entries solved`.

### 13.3 Strictness (v1)
- Matching is **accent-insensitive**, **case-insensitive**, and whitespace-normalized.
- Everything else must match exactly (including punctuation and spacing after normalization).

---

## 14) Persistence (static web)

### 14.1 Storage requirements
- Must save and restore `PuzzleState` keyed by `puzzleId`.
- Must be resilient to catalog updates (versioning).

### 14.2 Storage adapter interface
```ts
export interface StorageAdapter {
  loadPuzzleState(puzzleId: string): Promise<PuzzleState | null>;
  savePuzzleState(puzzleId: string, state: PuzzleState): Promise<void>;
  clearPuzzleState(puzzleId: string): Promise<void>;
}
```

### 14.3 Web implementation
- Start with **localStorage** (simple).
- If state grows, migrate to **IndexedDB** (adapter swap; no engine changes).

---

## 15) Web UX requirements (mobile-first)

### 15.1 Layout
- Single-column layout by default.
- Entry list uses tappable cards.
- Entry focus is a full-screen sheet/modal on mobile.

### 15.2 Input UX
- Large tap targets (>=44px).
- Prevent viewport zoom issues (use correct meta viewport; avoid tiny font sizes).
- Support soft keyboard “done/enter” to submit.

### 15.3 Accessibility
- All actions reachable by keyboard.
- ARIA labels for hint/submit.
- High-contrast mode friendly.

### 15.4 PWA
- Add manifest + service worker to cache:
  - app shell
  - catalog index
  - puzzle JSON files
- Offline: allow opening previously visited puzzles; optional full pre-cache.

---

## 16) Web app screens (minimum)

1. **Home / Catalog**
   - Lists puzzles from `index.json`
   - Search/filter optional (nice-to-have)
2. **Puzzle Set**
   - Shows entries
   - Tap to focus an entry
3. **Entry Focus** (mobile sheet or route)
   - Clue + masked display
   - Vowel-slot input
   - Hint + Submit
4. **Completion**
   - Theme reveal
   - Back to catalog

---

## 17) Engine API surface (day-1 implementable)

This section defines the concrete **TypeScript API** for `@ks/engine`, including models, selectors, and fixtures for golden tests.

### 17.1 Public exports (index)
`packages/engine/src/index.ts` MUST export:

- Types:
  - `LanguageConfig`, `PuzzleJSON`, `CatalogIndexJSON`
  - `PuzzleModel`, `EntryModel`, `EntryDerived`
  - `PuzzleState`, `EntryState`
  - `Action`
  - `EntryRenderModel`
- Constants:
  - `EN_V1`
- Functions:
  - `canonicalize`
  - `derivePuzzleModel`
  - `createInitialState`
  - `reduce`
  - `selectEntryRenderModel`
  - `selectPuzzleCompletion`
  - `extractConsonants`

### 17.2 Content types
```ts
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
```

### 17.3 Runtime models (engine internal, serializable or derived)

#### 17.3.1 PuzzleModel
```ts
export type EntryModel = {
  entryId: string;
  clue: string;
  answerOriginal: string;      // as authored
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
```

#### 17.3.2 EntryDerived (expanded)
```ts
export type EntryDerived = {
  answerCanonical: string;
  // indices into answerOriginal string positions (0..len-1)
  // for each vowel char in the authored answer, left-to-right
  vowelCharIndices: number[];
  // skeleton built from canonical answer: consonants only, vowels include Y removed
  skeleton: string;
};
```

**Note**: We do not store a full MaskToken array in v1; masked display is computed by walking `answerOriginal` and using `vowelCharIndices`.

### 17.4 Canonicalization + helpers

#### 17.4.1 canonicalize
```ts
export function canonicalize(input: string, cfg: LanguageConfig): string;
```
Must implement §6.3 exactly.

#### 17.4.2 extractConsonants
```ts
export function extractConsonants(canonical: string, cfg: LanguageConfig): string;
```
Rules:
- Iterate over characters.
- Keep letters that are **not vowels** (`A,E,I,O,U,Y`), discard vowels.
- Discard separators and punctuation.

### 17.5 Derivation

#### 17.5.1 derivePuzzleModel
```ts
export function derivePuzzleModel(puzzle: PuzzleJSON, cfg: LanguageConfig): PuzzleModel;
```
Must:
- Validate `version === 1` and `language === cfg.id`.
- Build `EntryDerived`:
  - `answerCanonical = canonicalize(answerOriginal, cfg)`
  - `vowelCharIndices`: positions in `answerOriginal` where char is vowel per cfg (case-insensitive), **including Y**.
  - `skeleton = extractConsonants(answerCanonical, cfg)`
- Build `entryById` map.

### 17.6 State init

#### 17.6.1 createInitialState
```ts
export function createInitialState(model: PuzzleModel): PuzzleState;
```
Must:
- Create `EntryState` for each entry:
  - `isSolved=false`, `hintIndex=0`, `guessText=''`
- Set `completed=false`
- Optionally set `focusedEntryId` to the first entry.

### 17.7 Reducer (pure)

#### 17.7.1 reduce
```ts
export function reduce(
  model: PuzzleModel,
  state: PuzzleState,
  action: Action,
  cfg: LanguageConfig
): PuzzleState;
```
Rules:
- Never mutate inputs; return new state objects.
- `FOCUS_ENTRY`: set `focusedEntryId`.
- `UPDATE_GUESS`: set `guessText` for that entry (raw).
- `HINT`: if not solved, increment `hintIndex` up to vowelCount.
  - `vowelCount = model.entryById[entryId].derived.vowelCharIndices.length`
- `SUBMIT_ENTRY`: if `canonicalize(guessText)==answerCanonical`, mark solved.
- `RESET_ENTRY`: clears guessText, hintIndex, isSolved.
- `RESET_PUZZLE`: reset all entries.
- After any action, recompute `completed = all isSolved`.

### 17.8 Selectors (UI-facing)

#### 17.8.1 selectEntryRenderModel
```ts
export function selectEntryRenderModel(
  model: PuzzleModel,
  state: PuzzleState,
  entryId: string,
  cfg: LanguageConfig
): EntryRenderModel;
```
Must compute:
- `maskedDisplay` from `answerOriginal`, `vowelCharIndices`, and `hintIndex`.
  - Replace vowels at indices >= hintIndex with `_`.
  - Keep consonants, punctuation, and spaces as authored.
- `consonantHighlight`:
  - `typedCanon = canonicalize(guessText, cfg)`
  - `typedConsonants = extractConsonants(typedCanon, cfg)`
  - `matchedPrefixLen = longest i where typedConsonants[0..i) == skeleton[0..i)`

#### 17.8.2 selectPuzzleCompletion
```ts
export function selectPuzzleCompletion(state: PuzzleState): boolean;
```
Returns `state.completed`.

---

## 18) Fixtures + golden tests

This section defines the fixture format used by Vitest to prevent rule drift.

### 18.1 Fixture directory layout
```
packages/engine/test/fixtures/
  puzzle_basic.json
  puzzle_punctuation.json
  puzzle_y_vowel.json
  golden_basic.steps.json
  golden_punctuation.steps.json
  golden_y_vowel.steps.json
```

### 18.2 Step-runner format
A golden file is a sequence of actions with expected render snapshots.

```json
{
  "puzzle": "puzzle_basic.json",
  "entry": "e1",
  "steps": [
    {
      "action": { "type": "HINT", "entryId": "e1" },
      "expect": {
        "maskedDisplay": "F_A_LY",
        "matchedPrefixLen": 0
      }
    },
    {
      "action": { "type": "UPDATE_GUESS", "entryId": "e1", "guessText": "family" },
      "expect": {
        "matchedPrefixLen": 4
      }
    },
    {
      "action": { "type": "SUBMIT_ENTRY", "entryId": "e1" },
      "expect": {
        "isSolved": true
      }
    }
  ]
}
```

### 18.3 Required expectations per step
Each step may assert any subset of:
- `maskedDisplay`
- `matchedPrefixLen`
- `skeleton`
- `guessText`
- `hintIndex`
- `isSolved`
- `completed`

### 18.4 Canonical fixture puzzles (include these in-repo)

#### 18.4.1 `puzzle_basic.json`
- Purpose: whitespace + case-insensitive match.
- Entries:
  - e1: clue "Genealogy", answer "FAMILY"

#### 18.4.2 `puzzle_punctuation.json`
- Purpose: punctuation and spacing must match after normalization.
- Entries:
  - e1: answer "MOTHER-IN-LAW"
  - e2: answer "DON'T STOP"

#### 18.4.3 `puzzle_y_vowel.json`
- Purpose: enforce Y as vowel.
- Entries:
  - e1: answer "MYTH"
  - e2: answer "RHYTHM"

### 18.5 Golden test runner (engine test)
Vitest should:
1. Load puzzle JSON + derive model.
2. `createInitialState`.
3. For each step:
   - apply reducer
   - compute `selectEntryRenderModel`
   - assert expected fields.

---

## 17) Testing plan (day-1 sprintable)


### 17.1 Engine unit tests (Vitest)
- Derivation correctness:
  - mask tokens, vowel indices, skeleton
- Hint progression determinism
- Submission validation
- Multi-word and punctuation handling
- `yIsVowel` toggle behavior

### 17.2 Golden tests
- A set of fixtures:
  - puzzle JSON
  - expected derived outputs
  - expected render snapshots after sequences of actions

### 17.3 CLI harness (`packages/tools/cli`)
- Load a puzzle JSON from disk.
- Print masked display + allow simulated actions.
- Use to debug rules without UI.

---

## 18) Recommended day-1 implementation order

1. `@ks/engine`:
   - schemas + types
   - canonicalize + classifiers
   - derivePuzzleModel()
   - reducer + actions
   - renderModel selectors
   - tests + fixtures
2. `apps/web`:
   - catalog loader
   - puzzle screen + entry focus UI
   - persistence adapter (localStorage)
   - PWA caching
3. GitHub Pages deploy workflow

---

## 19) Locked decisions (v1)

- English only.
- Accent-insensitive matching (diacritics ignored).
- Treat **Y as a vowel**.
- **Single text box** input.

No remaining blocking questions for mechanics.

