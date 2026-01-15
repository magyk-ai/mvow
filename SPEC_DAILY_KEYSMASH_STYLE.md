# Specification: Daily Keysmash UI Styling

This document specifies the UI/UX changes needed to transform the current Missing Vowel Quiz into a "Daily Keysmash" style interface based on the reference screenshots.

---

## 1. Design Overview

### 1.1 Visual Identity

| Aspect | Current | Target |
|--------|---------|--------|
| **Background** | Light gray (#F5F7FA) | Dark teal gradient (#1a3a3a → #0d2626) |
| **Cards** | White with subtle shadow | Dark purple/slate (#3d3a4f) with rounded corners |
| **Typography** | Mixed case | Bold uppercase for puzzle text |
| **Vowel Display** | Underscores `_` with spaces | **No placeholders** - only consonants shown |
| **Input Field** | Modal popup | Inline within card |
| **Feedback** | Badge icons | Color-coded states + letter highlighting |

### 1.2 Color Palette

```css
:root {
  /* Background */
  --bg-gradient-start: #1a4a4a;
  --bg-gradient-end: #0d2626;

  /* Cards */
  --card-default: #3d3a4f;
  --card-active: #4a4660;
  --card-correct: #2d5a4a;
  --card-wrong: #6b2a2a;

  /* Text */
  --text-primary: #ffffff;
  --text-secondary: rgba(255, 255, 255, 0.7);
  --text-muted: rgba(255, 255, 255, 0.5);

  /* Accents */
  --accent-highlight: #d4a844;     /* Yellow/gold for consonant match */
  --accent-vowel-hint: #e88744;    /* Orange for revealed vowels */
  --accent-success: #4ade80;       /* Green checkmark */
  --accent-error: #ef4444;         /* Red X */

  /* Input */
  --input-bg: #5a5670;
  --input-border: #6b6580;
}
```

---

## 2. Screen-by-Screen Specification

### 2.1 Start Screen (CatalogScreen / Tile)

**Reference:** `01_start.PNG`

#### Layout
```
┌─────────────────────────────────────┐
│              [X close]              │
│                                     │
│     ┌─────────────────────┐         │
│     │      MISSING        │  ← Tag  │
│     └─────────────────────┘         │
│                                     │
│     ┌─────────────────────┐         │
│     │  LTTRS              │         │
│     │  ┌───────────────┐  │         │
│     │  │   LETTERS   > │  │         │
│     │  └───────────────┘  │         │
│     └─────────────────────┘         │
│                                     │
│  ◇ DAILY KEYSMASH · JANUARY 15      │
│                                     │
│  Daily Keysmash                     │
│  Just add vowels.                   │
│                                     │
│     ┌─────────────────────┐         │
│     │    ▶ Play           │         │
│     └─────────────────────┘         │
│                                     │
└─────────────────────────────────────┘
```

#### Specifications
- **Background**: Gradient from teal to dark
- **"MISSING" tag**: White background, rounded, bold sans-serif
- **Example card**: Shows puzzle preview (consonants-only → answer)
- **Date line**: Diamond icon + "DAILY KEYSMASH · {DATE}" in small caps, coral/salmon color
- **Title**: Large bold "Daily Keysmash" or puzzle title
- **Subtitle**: Muted "Just add vowels."
- **Play button**: White rounded pill, black text with play icon

---

### 2.2 Puzzle Screen (All Entries View)

**Reference:** `02_puzzle.PNG`

#### Layout
```
┌─────────────────────────────────────┐
│  ←    Daily Keysmash Jan 15    ⚙   │
│       Daily Keysmash               │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐    │
│  │  RSN                        │    │  ← Entry 1 (active)
│  │  Justification              │    │
│  │  ┌───────────────────────┐  │    │
│  │  │ Your answer...        │  │    │
│  │  └───────────────────────┘  │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  RTNL                       │    │  ← Entry 2
│  │  Basis in logic             │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  PLG                        │    │  ← Entry 3
│  │  An insincere one might...  │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  XCS                        │    │  ← Entry 4
│  │  Doctor's note, maybe       │    │
│  └─────────────────────────────┘    │
│                                     │
├─────────────────────────────────────┤
│  [Keyboard]                 💡Hint  │
└─────────────────────────────────────┘
```

#### Entry Card States

| State | Background | Puzzle Text | Other Elements |
|-------|------------|-------------|----------------|
| **Default** | `--card-default` | White uppercase consonants | Clue in muted text |
| **Active/Focus** | `--card-active` | White consonants | Input field visible |
| **Typing** | `--card-active` | Matched consonants in **yellow** | Partial answer in input |
| **Correct** | `--card-correct` | Full answer, vowels in **orange** | Checkmark ✓ |
| **Wrong** | `--card-wrong` | Consonants white | X icon, red border |

#### Key Design Points
1. **No vowel placeholders**: Show only consonants (RSN, not R_S_N)
2. **Inline input**: Input appears within the card, not in modal
3. **Consonant highlighting**: As user types, matched consonants turn yellow
4. **All entries visible**: No modal - work through entries sequentially
5. **Auto-focus next**: After correct answer, focus moves to next unsolved entry

---

### 2.3 While Entry State (Typing)

**Reference:** `03_whileentry.PNG`

#### Consonant Feedback Behavior

When user types "REAS" for puzzle "RSN" (answer: REASON):

```
Puzzle display:  R S N
                 ↓ ↓
User input:      R E A S

Result:          R is yellow (matched)
                 S is yellow (matched)
                 N remains white (not yet reached)
```

**Algorithm:**
1. Extract consonants from user input: "REAS" → "RS"
2. Compare against skeleton: "RSN"
3. Find matching prefix length: 2 ("RS")
4. Highlight first 2 consonants in puzzle display as yellow

#### Input Field Design
- **Background**: Darker purple (`--input-bg`)
- **Border**: Subtle lighter border
- **Text**: White, same size as puzzle text
- **Chevron**: Right arrow indicator (›) at end
- **Placeholder**: "Your answer..." in muted gray

---

### 2.4 Using Clue/Hint

**Reference:** `04_useclue.PNG`

#### Hint Reveal Behavior

When hint is used on "RTNL" (answer: RATIONALE):

```
Before hint:   RTNL
After 1 hint:  RTNLE    ← 'E' revealed in orange
After 2 hints: RATNLE   ← 'A' and 'E' in orange
...etc
```

**Specification:**
- Hints reveal vowels **one at a time**
- Revealed vowels display in **orange** (`--accent-vowel-hint`)
- Consonants remain white
- Vowels are revealed **left-to-right** in the answer

#### Visual Changes After Hint
- Puzzle text updates to show revealed vowel(s)
- Revealed vowels are colored orange
- Entry remains in "active" state if not yet solved
- Hint button shows remaining hints or becomes disabled

---

### 2.5 Wrong Answer

**Reference:** `05_wrongans.PNG`

#### Wrong Answer State

```
┌─────────────────────────────────────┐
│  XCS                                │
│  Doctor's note, maybe               │
│  ┌───────────────────────────┐      │
│  │ EXCES              [✕]   │      │
│  └───────────────────────────┘      │
└─────────────────────────────────────┘
```

**Specifications:**
- **Card background**: Changes to red (`--card-wrong`)
- **Input field**: Shows red border
- **X icon**: Appears at end of input
- **Behavior**:
  - Triggered on Enter key press
  - State persists briefly (500-1000ms)
  - User can continue editing
  - Clears when user modifies input

---

### 2.6 All Done / Completion

**Reference:** `06_alldone.PNG`

#### Completed Puzzle Layout

```
┌─────────────────────────────────────┐
│  ←    Daily Keysmash Jan 15    ⚙   │
│       Daily Keysmash               │
├─────────────────────────────────────┤
│                                     │
│       EXPLAIN YOURSELF!             │  ← Theme reveal
│                                     │
│  ┌─────────────────────────────┐    │
│  │     REASON              ✓  │    │  ← All correct
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │   RATIONALE             ✓  │    │  ← Vowel hint used
│  └─────────────────────────────┘    │       (E in orange)
│                                     │
│  ┌─────────────────────────────┐    │
│  │     APOLOGY             ✓  │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │     EXCUSE              ✓  │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │      ALIBI              ✓  │    │  ← Vowel hint used
│  └─────────────────────────────┘    │       (I in orange)
│                                     │
└─────────────────────────────────────┘
```

#### Completion Specifications
- **Theme reveal**: Large bold text showing the connection
- **Clues hidden**: Only answers shown (no clue text)
- **Cards simplified**:
  - Green background (`--card-correct`)
  - Full answer displayed
  - Vowels that were hinted shown in **orange**
  - Checkmark on right side
- **Layout**: Cards are pill-shaped, centered
- **No input fields**: Clean display of just answers

---

## 3. Component Changes Required

### 3.1 New/Modified Components

| Component | Changes |
|-----------|---------|
| **index.css** | New color variables, dark theme, gradient background |
| **PuzzleScreen.tsx** | Remove modal, add inline entry expansion, handle keyboard |
| **PuzzleScreen.css** | Dark theme styling, new layout |
| **EntryCard.tsx** | Major rewrite: inline input, state colors, consonant highlighting |
| **EntryCard.css** | Complete restyling |
| **CatalogScreen.tsx** | New tile design with preview |
| **CatalogScreen.css** | Dark theme, new card design |
| **EntryFocusModal.tsx** | **DELETE** - no longer needed |
| **EntryFocusModal.css** | **DELETE** |

### 3.2 Engine Changes

| File | Changes |
|------|---------|
| **selectors.ts** | New `maskedDisplay` mode: consonants-only (no underscores) |
| **types.ts** | Add `displayMode: 'consonants-only' | 'with-placeholders'` option |

---

## 4. Typography Specification

### 4.1 Font Stack

```css
--font-display: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
--font-mono: 'SF Mono', 'Monaco', 'Consolas', monospace;
```

### 4.2 Text Styles

| Element | Size | Weight | Style |
|---------|------|--------|-------|
| **Header title** | 18px | 700 | Normal |
| **Header subtitle** | 12px | 400 | Normal |
| **Puzzle text** | 24px | 700 | Uppercase, letter-spacing: 0.1em |
| **Clue text** | 14px | 400 | Normal |
| **Input text** | 18px | 500 | Uppercase |
| **Theme reveal** | 28px | 700 | Uppercase |
| **Button text** | 16px | 600 | Normal |

---

## 5. Animation Specification

### 5.1 State Transitions

| Transition | Duration | Easing |
|------------|----------|--------|
| Card expand (show input) | 200ms | ease-out |
| Card collapse | 150ms | ease-in |
| Background color change | 300ms | ease |
| Wrong answer shake | 400ms | ease-in-out |
| Correct answer pulse | 500ms | ease |
| Focus ring | 150ms | ease |

### 5.2 Keyframe Animations

```css
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-4px); }
  40%, 80% { transform: translateX(4px); }
}

@keyframes correctPulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.02); }
  100% { transform: scale(1); }
}
```

---

## 6. Interaction Specification

### 6.1 Keyboard Handling

| Key | Action |
|-----|--------|
| **Enter** | Submit current answer |
| **Tab** | Move to next entry (skip solved) |
| **Shift+Tab** | Move to previous entry |
| **Escape** | Blur current input |

### 6.2 Touch/Click Handling

| Action | Result |
|--------|--------|
| Tap unsolved entry | Focus that entry, show input |
| Tap solved entry | No action (or show details) |
| Tap outside entries | Blur current input |
| Tap Hint button | Reveal next vowel |

### 6.3 Focus Management

1. On page load, auto-focus first unsolved entry
2. After correct answer, auto-focus next unsolved entry
3. After wrong answer, keep focus on current entry
4. Only one entry can be focused at a time

---

## 7. Responsive Behavior

### 7.1 Mobile (< 768px)

- Full-width cards with padding
- Keyboard takes bottom portion of screen
- Hint button integrated with keyboard area
- Entries stack vertically with gap

### 7.2 Desktop (>= 768px)

- Centered content (max-width: 480px)
- Cards have more prominent shadows
- Hint button in fixed position or with entries
- Larger text sizes (+2px on all)

---

## 8. Accessibility Requirements

### 8.1 ARIA Labels

```html
<input
  aria-label="Answer for: {clue}"
  aria-describedby="entry-{id}-puzzle"
  aria-invalid="{isWrong}"
/>

<div role="status" aria-live="polite">
  {feedbackMessage}
</div>
```

### 8.2 Focus Indicators

- All interactive elements must have visible focus state
- Focus ring: 2px solid white with 2px offset
- High contrast mode: 3px solid outline

### 8.3 Screen Reader Announcements

- Announce when answer is correct
- Announce when answer is wrong
- Announce puzzle completion
- Announce hint usage and revealed letter

---

## 9. Data Model Additions

### 9.1 EntryRenderModel Extensions

```typescript
interface EntryRenderModel {
  // Existing fields...

  // New fields for display
  consonantsOnly: string;           // "RSN" (no placeholders)
  revealedDisplay: string;          // "RTNLE" (with hint vowels)
  vowelPositions: number[];         // Positions of revealed vowels
  matchedConsonantIndices: number[]; // Which consonants to highlight
}
```

### 9.2 UI State Extensions

```typescript
interface EntryUIState {
  isWrong: boolean;          // Show wrong answer state
  wrongTimestamp?: number;   // When wrong state started (for auto-clear)
}
```

---

## 10. Migration Notes

### 10.1 Breaking Changes

- Modal-based entry is removed entirely
- CSS variable names change (need to update any custom themes)
- Entry card component API changes significantly

### 10.2 Backwards Compatibility

- Existing puzzle JSON format unchanged
- LocalStorage state format unchanged
- Engine API unchanged (only selector additions)

---

## Appendix A: Screenshot Reference Summary

| Screenshot | Key Features to Implement |
|------------|---------------------------|
| 01_start.PNG | Dark gradient bg, white pill buttons, preview card |
| 02_puzzle.PNG | All entries visible, inline input, consonants-only display |
| 03_whileentry.PNG | Yellow consonant highlighting during typing |
| 04_useclue.PNG | Orange vowel reveal, green success state |
| 05_wrongans.PNG | Red error state, X icon, visible wrong answer |
| 06_alldone.PNG | Theme reveal, simplified answer cards, hidden clues |
