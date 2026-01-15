# Missing Vowel - Web-First Puzzle Game

A vowel restoration puzzle game built with TypeScript, React, and a pure TypeScript game engine. Players restore missing vowels (including Y) in themed word puzzles using clues and hints.

## Features

- **Pure TypeScript Engine**: Platform-agnostic game logic with no DOM dependencies
- **Mobile-First Design**: Optimized for touch screens with 44px+ tap targets
- **Offline-Capable PWA**: Service worker caching for offline gameplay
- **Y as Vowel**: Treats Y as a vowel per spec requirements
- **Accent-Insensitive Matching**: Diacritics stripped for flexible input
- **Live Consonant Feedback**: Real-time validation of consonant sequences
- **LocalStorage Persistence**: Auto-save puzzle progress
- **Comprehensive Testing**: Unit tests and golden tests for engine correctness

## Project Structure

```
mvow/
├── packages/
│   ├── engine/          # Core game engine (pure TypeScript)
│   │   ├── src/
│   │   │   ├── model/       # Type definitions
│   │   │   ├── rules/       # Canonicalization & character classification
│   │   │   ├── core/        # Derivation, reducer, selectors
│   │   │   └── config.ts    # Language configuration (EN_V1)
│   │   └── test/            # Unit tests & fixtures
│   └── tools/
│       └── cli/         # Node.js CLI for testing engine
├── apps/
│   └── web/             # React + Vite web application
│       ├── src/
│       │   ├── screens/     # Catalog, Puzzle, EntryFocusModal
│       │   ├── components/  # Reusable UI components
│       │   └── lib/         # Storage adapter
│       └── public/
│           └── catalog/     # Puzzle JSON files
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 24+ (target version; Node 20+ works)
- npm 10+

### Installation

```bash
npm install
```

### Running Tests

```bash
# Run all tests
npm test

# Run engine tests only
npm run test:engine
```

### Development

```bash
# Start development server
npm run dev

# Navigate to http://localhost:5173/mvow/
```

### Build for Production

```bash
# Build static site
npm run build

# Preview production build
npm run preview
```

### CLI Tool (Testing Engine)

```bash
# Run CLI with a puzzle file
npm run cli packages/engine/test/fixtures/puzzle_basic.json

# Commands:
# h or hint     - Reveal next vowel
# g <text>      - Update guess
# s or submit   - Submit answer
# r or reset    - Reset entry
# q or quit     - Exit
```

## Game Mechanics

### Core Rules

1. **Vowel Definition**: A, E, I, O, U, and **Y** are treated as vowels
2. **Canonicalization**: Answers are matched case-insensitively with stripped diacritics
3. **Hints**: Unlimited hints reveal vowels left-to-right deterministically
4. **Input**: Single text box for full answer (no per-vowel-slot input)
5. **Feedback**: Live consonant matching shows progress

### Example Puzzle Flow

```
Clue: "Genealogy group"
Answer: "FAMILY"

Initial State:
  Masked: F_M_L_
  Hints Used: 0

After 1 Hint:
  Masked: FAM_L_  (A revealed)
  Hints Used: 1

After 2 Hints:
  Masked: FAMIL_  (A, I revealed)
  Hints Used: 2

Player Types: "family"
  Consonants Matched: 3/3 (fml)

Submit → SOLVED! ✅
```

## Deployment

### GitHub Pages

The app is configured for GitHub Pages deployment with base path `/mvow/`.

1. Push to GitHub
2. Enable GitHub Pages (Settings → Pages)
3. Configure to deploy from `dist` folder or use GitHub Actions

The build output in `apps/web/dist/` is fully static and can be deployed anywhere.

## Technology Stack

- **TypeScript 5.7+**: Type-safe development
- **React 18**: UI framework
- **Vite 5**: Build tool and dev server
- **Vitest 2**: Testing framework
- **Vite PWA Plugin**: Service worker generation
- **CSS Variables**: Theming and responsive design

## Engine API

The `@ks/engine` package exports:

### Types
- `PuzzleJSON`, `CatalogIndexJSON`
- `PuzzleModel`, `EntryModel`, `EntryDerived`
- `PuzzleState`, `EntryState`
- `Action`, `EntryRenderModel`

### Functions
- `derivePuzzleModel(puzzle, cfg)`: Parse and derive puzzle
- `createInitialState(model)`: Initialize state
- `reduce(model, state, action, cfg)`: Pure reducer
- `selectEntryRenderModel(model, state, entryId, cfg)`: Compute render data
- `canonicalize(input, cfg)`: Normalize text
- `extractConsonants(canonical, cfg)`: Extract consonant skeleton

### Constants
- `EN_V1`: English language config with Y as vowel

## Testing

The engine includes comprehensive test coverage:

- **Unit Tests**: Canonicalization, derivation, reducer, selectors
- **Golden Tests**: End-to-end gameplay scenarios with expected outputs
- **Fixtures**: Test puzzles for basic, punctuation, and Y-vowel cases

All tests verify:
- Y is treated as a vowel
- Accent-insensitive matching works correctly
- Hint progression is deterministic
- Consonant feedback is accurate

## Accessibility

- Semantic HTML with proper ARIA labels
- Keyboard navigation support
- Focus-visible styles
- High contrast mode compatible
- Screen reader friendly
- Minimum 44px tap targets

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- PWA installable on supported platforms

## License

MIT (not specified - add as needed)

## Contributing

This project was built following the spec in [missingvow_web_first_gameplay_engine_spec_v_0.md](missingvow_web_first_gameplay_engine_spec_v_0.md).

To add new puzzles:
1. Create puzzle JSON in `apps/web/public/catalog/puzzles/`
2. Add entry to `apps/web/public/catalog/index.json`
3. Follow the schema defined in the spec

## Notes

- Node 20 works but Node 24 is the target per spec
- Security audit warnings are expected (dev dependencies)
- PWA requires HTTPS in production (or localhost for testing)
