/**
 * Player identity management using localStorage.
 * Provides frictionless login-free identification.
 */

const PLAYER_ID_KEY = 'ks_player_id';
const PLAYER_NAME_KEY = 'ks_player_name';

/**
 * Generate a random player ID (UUID v4 format).
 */
function generatePlayerId(): string {
  // Simple UUID v4 generator without external dependency
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get the player's persistent ID, creating one if it doesn't exist.
 */
export function getPlayerId(): string {
  let id = localStorage.getItem(PLAYER_ID_KEY);
  if (!id) {
    id = generatePlayerId();
    localStorage.setItem(PLAYER_ID_KEY, id);
  }
  return id;
}

/**
 * Get the player's last used display name.
 */
export function getPlayerName(): string {
  return localStorage.getItem(PLAYER_NAME_KEY) || '';
}

/**
 * Save the player's display name for future sessions.
 */
export function setPlayerName(name: string): void {
  localStorage.setItem(PLAYER_NAME_KEY, name.trim());
}
