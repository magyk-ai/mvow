import { useRef, useEffect } from 'react';
import type { EntryRenderModel, DisplayCharacter } from '@ks/engine';
import './EntryCard.css';

type Props = {
  renderModel: EntryRenderModel;
  isActive: boolean;
  isWrong: boolean;
  isCompleted: boolean;
  onFocus: () => void;
  onGuessChange: (text: string) => void;
  onSubmit: () => void;
  onHint: () => void;
};

function PuzzleText({
  characters,
  isSolved,
  showOnlyConsonants,
}: {
  characters: DisplayCharacter[];
  isSolved: boolean;
  showOnlyConsonants: boolean;
}) {
  return (
    <span className="puzzle-text">
      {characters.map((char, idx) => {
        // Skip unrevealed vowels when showing consonants only
        if (showOnlyConsonants && char.type === 'vowel' && !char.isRevealed) {
          return null;
        }

        let className = 'puzzle-char';
        if (char.type === 'consonant') {
          className += ' consonant';
          if (char.isMatched && !isSolved) {
            className += ' matched';
          }
        } else if (char.type === 'vowel') {
          className += ' vowel';
          if (char.isRevealed) {
            className += ' revealed';
          }
        } else {
          className += ' separator';
        }

        return (
          <span key={idx} className={className}>
            {char.char}
          </span>
        );
      })}
    </span>
  );
}

export default function EntryCard({
  renderModel,
  isActive,
  isWrong,
  isCompleted,
  onFocus,
  onGuessChange,
  onSubmit,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when this card becomes active
  useEffect(() => {
    if (isActive && !renderModel.isSolved && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isActive, renderModel.isSolved]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit();
    }
  };

  const handleCardClick = () => {
    if (!renderModel.isSolved) {
      onFocus();
    }
  };

  // Build class names
  let cardClass = 'entry-card';
  if (renderModel.isSolved) cardClass += ' solved';
  if (isActive && !renderModel.isSolved) cardClass += ' active';
  if (isWrong) cardClass += ' wrong';
  if (isCompleted) cardClass += ' completed-view';

  // In completed view, show full answer with revealed vowels highlighted
  const showOnlyConsonants = !renderModel.isSolved && !isCompleted;

  return (
    <div
      className={cardClass}
      onClick={handleCardClick}
      role={renderModel.isSolved ? 'article' : 'button'}
      tabIndex={renderModel.isSolved ? undefined : 0}
      aria-label={`${renderModel.clue}${renderModel.isSolved ? ' (solved)' : ''}`}
    >
      <div className="entry-card-content">
        <div className="puzzle-display">
          <PuzzleText
            characters={renderModel.displayCharacters}
            isSolved={renderModel.isSolved}
            showOnlyConsonants={showOnlyConsonants}
          />
          {renderModel.isSolved && (
            <span className="solved-badge" aria-label="Solved">
              ✓
            </span>
          )}
        </div>

        {!isCompleted && (
          <div className="entry-clue">{renderModel.clue}</div>
        )}

        {isActive && !renderModel.isSolved && (
          <div className="input-container">
            <input
              ref={inputRef}
              type="text"
              className={`guess-input ${isWrong ? 'wrong' : ''}`}
              value={renderModel.guessText}
              onChange={(e) => onGuessChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Your answer..."
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-label={`Answer for: ${renderModel.clue}`}
              aria-invalid={isWrong}
              aria-describedby={isWrong ? `error-${renderModel.entryId}` : undefined}
            />
            {isWrong && (
              <>
                <span className="wrong-icon" aria-hidden="true">
                  ✕
                </span>
                <span
                  id={`error-${renderModel.entryId}`}
                  className="sr-only"
                  role="alert"
                >
                  Incorrect answer. Try again.
                </span>
              </>
            )}
            {!isWrong && renderModel.guessText && (
              <span
                className="submit-icon"
                onClick={onSubmit}
                role="button"
                tabIndex={0}
                aria-label="Submit answer"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSubmit();
                  }
                }}
              >
                ›
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
