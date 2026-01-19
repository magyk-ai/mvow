import { customAlphabet } from 'nanoid';

/**
 * Alphanumeric characters for lobby codes.
 * Excludes ambiguous characters: 0/O, 1/I/L
 */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Generate a 6-character lobby code */
const generateCode = customAlphabet(ALPHABET, 6);

/**
 * Generate a unique lobby code.
 *
 * @returns A 6-character alphanumeric string (e.g., "ABC123")
 */
export function generateLobbyCode(): string {
  return generateCode();
}
