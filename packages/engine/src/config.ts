import type { LanguageConfig } from './model/types.js';

/**
 * English v1 configuration
 * - Treats Y as a vowel (locked for v1)
 * - Strips diacritics for matching
 */
export const EN_V1: LanguageConfig = {
  id: 'en',
  vowels: ['A', 'E', 'I', 'O', 'U', 'Y'],
  stripDiacritics: true,
} as const;
