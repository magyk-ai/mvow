import type { LanguageConfig } from '../model/types.js';

/**
 * Strip diacritics (combining marks) from a string
 * Uses NFD normalization to separate base characters from diacritics,
 * then removes combining marks (Unicode category M)
 */
function stripDiacritics(s: string): string {
  // Normalize to NFD (decomposed form - separates base chars from diacritics)
  const decomposed = s.normalize('NFD');
  // Remove combining marks (category M)
  const stripped = decomposed.replace(/\p{M}/gu, '');
  // Normalize back to NFC (composed form)
  return stripped.normalize('NFC');
}

/**
 * Canonicalize a string per spec §6.3
 *
 * Steps:
 * 1. Unicode normalize NFKC
 * 2. Trim
 * 3. Collapse whitespace runs to single space
 * 4. Convert to lowercase (for English v1)
 * 5. Strip diacritics if cfg.stripDiacritics === true
 */
export function canonicalize(input: string, cfg: LanguageConfig): string {
  // 1. NFKC normalization (compatibility composition)
  let result = input.normalize('NFKC');

  // 2. Trim
  result = result.trim();

  // 3. Collapse whitespace runs to single space
  result = result.replace(/\s+/g, ' ');

  // 4. Lowercase (for English v1)
  result = result.toLowerCase();

  // 5. Strip diacritics if configured
  if (cfg.stripDiacritics) {
    result = stripDiacritics(result);
  }

  return result;
}
