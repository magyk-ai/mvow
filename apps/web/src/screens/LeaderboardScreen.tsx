import { useMultiplayer } from '../context/MultiplayerContext';
import './LeaderboardScreen.css';

type Props = {
  lobbyCode: string;
  onPlayAgain: (puzzleId: string) => void;
  onBackToCatalog: () => void;
};

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function LeaderboardScreen({
  onPlayAgain,
  onBackToCatalog,
}: Props) {
  const { leaderboard, playerId, leaveLobby } = useMultiplayer();

  if (!leaderboard) {
    return (
      <div className="leaderboard-screen">
        <div className="leaderboard-loading">Loading results...</div>
      </div>
    );
  }

  const handlePlayAgain = () => {
    leaveLobby();
    onPlayAgain(leaderboard.puzzleId);
  };

  const handleBackToCatalog = () => {
    leaveLobby();
    onBackToCatalog();
  };

  // Filter out "still playing" entries for the podium
  const finishedEntries = leaderboard.entries.filter((e) => !e.isPlaying);
  const topThree = finishedEntries.slice(0, 3);
  const rest = leaderboard.entries.slice(3);
  const isIntermediate = !leaderboard.isFinal;

  return (
    <div className="leaderboard-screen">
      <header className="leaderboard-header">
        <h1>{isIntermediate ? 'Results' : 'Game Over!'}</h1>
        <p className="puzzle-title">{leaderboard.puzzleTitle || 'Quiz'}</p>
        {isIntermediate && (
          <p className="waiting-notice">Waiting for other players to finish...</p>
        )}
      </header>

      <main className="leaderboard-content">
        {/* Podium for top 3 */}
        {topThree.length > 0 && (
          <div className="podium">
            {topThree.map((entry, idx) => (
              <div
                key={entry.playerId}
                className={`podium-place place-${idx + 1} ${entry.playerId === playerId ? 'is-you' : ''}`}
              >
                <div className="podium-medal">
                  {idx === 0 && '🥇'}
                  {idx === 1 && '🥈'}
                  {idx === 2 && '🥉'}
                </div>
                <div className="podium-name">{entry.displayName}</div>
                <div className="podium-score">
                  {entry.isPlaying ? 'Playing...' : entry.isDNF ? '-' : entry.score.toLocaleString()}
                </div>
                {entry.isDNF && <div className="dnf-badge">DNF</div>}
                {entry.isPlaying && <div className="playing-badge">Playing</div>}
              </div>
            ))}
          </div>
        )}

        {/* Full results table */}
        <div className="results-table">
          <div className="results-header">
            <span className="col-rank">Rank</span>
            <span className="col-name">Player</span>
            <span className="col-score">Score</span>
            <span className="col-correct">Correct</span>
            <span className="col-time">Time</span>
            <span className="col-hints">Hints</span>
          </div>

          {leaderboard.entries.map((entry) => (
            <div
              key={entry.playerId}
              className={`results-row ${entry.playerId === playerId ? 'is-you' : ''} ${entry.isDNF ? 'is-dnf' : ''} ${entry.isPlaying ? 'is-playing' : ''}`}
            >
              <span className="col-rank">
                {entry.isPlaying ? '-' : entry.isDNF ? '-' : `#${entry.rank}`}
              </span>
              <span className="col-name">
                {entry.displayName}
                {entry.playerId === playerId && <span className="you-tag">(You)</span>}
              </span>
              <span className="col-score">
                {entry.isPlaying ? '-' : entry.isDNF ? '-' : entry.score.toLocaleString()}
              </span>
              <span className="col-correct">
                {entry.isPlaying ? '-' : entry.isDNF ? '-' : `${entry.correctCount}/${entry.totalCount}`}
              </span>
              <span className="col-time">
                {entry.isPlaying ? 'Playing...' : entry.isDNF ? 'DNF' : formatTime(entry.totalTimeMs)}
              </span>
              <span className="col-hints">
                {entry.isPlaying ? '-' : entry.isDNF ? '-' : entry.hintsUsed}
              </span>
            </div>
          ))}
        </div>

        <div className="leaderboard-actions">
          <button className="play-again-button" onClick={handlePlayAgain}>
            Play Again
          </button>
          <button className="back-button-text" onClick={handleBackToCatalog}>
            Back to Catalog
          </button>
        </div>
      </main>
    </div>
  );
}
