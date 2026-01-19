import type { PlayerGameResult, LeaderboardEntry } from './multiplayer.js';

/** Scoring constants */
export const SCORING = {
  /** Points awarded per correct answer */
  POINTS_PER_CORRECT: 1000,
  /** Points deducted per second taken */
  TIME_PENALTY_PER_SECOND: 1,
  /** Points deducted per hint used */
  HINT_PENALTY: 50,
  /** Maximum game duration in milliseconds (10 minutes) */
  GAME_TIMEOUT_MS: 10 * 60 * 1000,
  /** Countdown duration before game starts */
  COUNTDOWN_SECONDS: 3,
  /** Maximum players per lobby */
  MAX_PLAYERS: 10,
} as const;

/**
 * Calculate the score for a player's game result.
 *
 * Formula: (correct × 1000) - (seconds × 1) - (hints × 50)
 *
 * @param result - The player's game result
 * @returns The calculated score (minimum 0)
 */
export function calculateScore(result: PlayerGameResult): number {
  const correctPoints = result.correctCount * SCORING.POINTS_PER_CORRECT;
  const timePenalty =
    Math.floor(result.totalTimeMs / 1000) * SCORING.TIME_PENALTY_PER_SECOND;
  const hintPenalty = result.hintsUsed * SCORING.HINT_PENALTY;

  return Math.max(0, correctPoints - timePenalty - hintPenalty);
}

/**
 * Sort leaderboard entries by rank.
 *
 * Tiebreaker order:
 * 1. DNF players always last
 * 2. Higher score first
 * 3. More correct answers first
 * 4. Faster time first
 * 5. Fewer hints first
 *
 * @param entries - Array of leaderboard entries to sort
 * @returns New sorted array (does not mutate input)
 */
export function sortLeaderboard(
  entries: LeaderboardEntry[]
): LeaderboardEntry[] {
  return [...entries].sort((a, b) => {
    // DNF always last
    if (a.isDNF !== b.isDNF) {
      return a.isDNF ? 1 : -1;
    }

    // Higher score first
    if (a.score !== b.score) {
      return b.score - a.score;
    }

    // More correct answers first
    if (a.correctCount !== b.correctCount) {
      return b.correctCount - a.correctCount;
    }

    // Faster time first
    if (a.totalTimeMs !== b.totalTimeMs) {
      return a.totalTimeMs - b.totalTimeMs;
    }

    // Fewer hints first
    return a.hintsUsed - b.hintsUsed;
  });
}

/**
 * Assign ranks to sorted leaderboard entries.
 * Mutates the entries in place.
 *
 * @param entries - Pre-sorted array of leaderboard entries
 */
export function assignRanks(entries: LeaderboardEntry[]): void {
  entries.forEach((entry, index) => {
    entry.rank = index + 1;
  });
}

/**
 * Build a leaderboard entry from a player's game result.
 *
 * @param result - The player's game result
 * @param displayName - The player's display name
 * @returns A leaderboard entry (rank will be 0, assign later)
 */
export function buildLeaderboardEntry(
  result: PlayerGameResult,
  displayName: string
): LeaderboardEntry {
  return {
    playerId: result.playerId,
    displayName,
    rank: 0, // Will be assigned after sorting
    score: calculateScore(result),
    correctCount: result.correctCount,
    totalCount: result.totalCount,
    totalTimeMs: result.totalTimeMs,
    hintsUsed: result.hintsUsed,
    isDNF: false,
  };
}

/**
 * Build a DNF (Did Not Finish) leaderboard entry for a disconnected player.
 *
 * @param playerId - The player's ID
 * @param displayName - The player's display name
 * @param totalCount - Total number of entries in the puzzle
 * @returns A DNF leaderboard entry
 */
export function buildDNFEntry(
  playerId: string,
  displayName: string,
  totalCount: number
): LeaderboardEntry {
  return {
    playerId,
    displayName,
    rank: 0,
    score: 0,
    correctCount: 0,
    totalCount,
    totalTimeMs: 0,
    hintsUsed: 0,
    isDNF: true,
  };
}
