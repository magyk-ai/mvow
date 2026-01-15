import type { LanguageConfig } from '../model/types.js';

/**
 * Check if a character is a Unicode letter
 */
export function isLetter(ch: string): boolean {
  if (ch.length !== 1) return false;
  // Unicode letter categories: L (all letter categories)
  return /\p{L}/u.test(ch);
}

/**
 * Check if a character is a vowel per the language config
 * Case-insensitive check
 */
export function isVowel(ch: string, cfg: LanguageConfig): boolean {
  if (!isLetter(ch)) return false;
  const upper = ch.toUpperCase();
  return cfg.vowels.includes(upper);
}

/**
 * Check if a character is a consonant (letter but not vowel)
 */
export function isConsonant(ch: string, cfg: LanguageConfig): boolean {
  return isLetter(ch) && !isVowel(ch, cfg);
}

/**
 * Check if a character is a separator (space, punctuation, hyphen, apostrophe)
 */
export function isSeparator(ch: string): boolean {
  if (ch.length !== 1) return false;
  // Match whitespace, punctuation, or common separators
  return /[\s\p{P}]/u.test(ch);
}

/**
 * Extract consonants from a canonical string (vowels and non-letters removed)
 * Includes Y as vowel (removed from consonants)
 */
export function extractConsonants(canonical: string, cfg: LanguageConfig): string {
  let result = '';
  for (const ch of canonical) {
    if (isConsonant(ch, cfg)) {
      result += ch;
    }
  }
  return result;
}
