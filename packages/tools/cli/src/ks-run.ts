#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import {
  derivePuzzleModel,
  createInitialState,
  reduce,
  selectEntryRenderModel,
  EN_V1,
  type PuzzleJSON,
  type PuzzleModel,
  type PuzzleState,
} from '@ks/engine';

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: tsx ks-run.ts <puzzle-json-path>');
    process.exit(1);
  }

  const puzzlePath = args[0];

  // Load puzzle
  const puzzleJSON: PuzzleJSON = JSON.parse(readFileSync(puzzlePath, 'utf-8'));
  const model: PuzzleModel = derivePuzzleModel(puzzleJSON, EN_V1);
  let state: PuzzleState = createInitialState(model);

  console.log(`\nLoaded puzzle: ${model.title || model.puzzleId}`);
  console.log(`Entries: ${model.entries.length}\n`);

  // Focus first entry
  const entryId = model.entries[0].entryId;
  state = reduce(model, state, { type: 'FOCUS_ENTRY', entryId }, EN_V1);

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  function displayEntry() {
    const renderModel = selectEntryRenderModel(model, state, entryId, EN_V1);

    console.log('\n' + '='.repeat(60));
    console.log(`Clue: ${renderModel.clue}`);
    console.log(`Answer: ${renderModel.maskedDisplay}`);
    console.log(`Skeleton: ${renderModel.consonantHighlight.skeleton}`);
    console.log(
      `Your guess: "${renderModel.guessText}" (matched consonants: ${renderModel.consonantHighlight.matchedPrefixLen})`
    );
    if (renderModel.isSolved) {
      console.log('✅ SOLVED!');
    }
    console.log('='.repeat(60));
  }

  displayEntry();

  while (true) {
    console.log('\nCommands: (h)int, (g)uess, (s)ubmit, (r)eset, (q)uit');
    const command = await rl.question('> ');

    const cmd = command.trim().toLowerCase();

    if (cmd === 'q' || cmd === 'quit') {
      console.log('Goodbye!');
      rl.close();
      break;
    } else if (cmd === 'h' || cmd === 'hint') {
      state = reduce(model, state, { type: 'HINT', entryId }, EN_V1);
      displayEntry();
    } else if (cmd === 'r' || cmd === 'reset') {
      state = reduce(model, state, { type: 'RESET_ENTRY', entryId }, EN_V1);
      displayEntry();
    } else if (cmd.startsWith('g ') || cmd.startsWith('guess ')) {
      const guessText = command.substring(command.indexOf(' ') + 1);
      state = reduce(
        model,
        state,
        { type: 'UPDATE_GUESS', entryId, guessText },
        EN_V1
      );
      displayEntry();
    } else if (cmd === 's' || cmd === 'submit') {
      const oldState = state;
      state = reduce(model, state, { type: 'SUBMIT_ENTRY', entryId }, EN_V1);
      displayEntry();

      if (state.entries[entryId].isSolved && !oldState.entries[entryId].isSolved) {
        console.log('🎉 Correct!');

        if (state.completed) {
          console.log('\n🎊 PUZZLE COMPLETE! 🎊');
          if (model.themeReveal) {
            console.log(`\nTheme: ${model.themeReveal.headline || ''}`);
            if (model.themeReveal.body) {
              console.log(model.themeReveal.body);
            }
          }
          rl.close();
          break;
        }
      } else if (!state.entries[entryId].isSolved) {
        console.log('❌ Incorrect. Try again!');
      }
    } else {
      console.log('Unknown command.');
    }
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
