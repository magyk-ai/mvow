import { describe, it, expect } from 'vitest';
import {
  isLetter,
  isVowel,
  isConsonant,
  isSeparator,
  extractConsonants,
} from '../src/rules/characters.js';
import { EN_V1 } from '../src/config.js';

describe('isLetter', () => {
  it('should identify letters', () => {
    expect(isLetter('a')).toBe(true);
    expect(isLetter('Z')).toBe(true);
  });

  it('should reject non-letters', () => {
    expect(isLetter('1')).toBe(false);
    expect(isLetter(' ')).toBe(false);
    expect(isLetter('-')).toBe(false);
  });
});

describe('isVowel', () => {
  it('should identify standard vowels', () => {
    expect(isVowel('a', EN_V1)).toBe(true);
    expect(isVowel('E', EN_V1)).toBe(true);
    expect(isVowel('i', EN_V1)).toBe(true);
    expect(isVowel('O', EN_V1)).toBe(true);
    expect(isVowel('u', EN_V1)).toBe(true);
  });

  it('should identify Y as vowel', () => {
    expect(isVowel('y', EN_V1)).toBe(true);
    expect(isVowel('Y', EN_V1)).toBe(true);
  });

  it('should reject consonants', () => {
    expect(isVowel('b', EN_V1)).toBe(false);
    expect(isVowel('Z', EN_V1)).toBe(false);
  });

  it('should reject non-letters', () => {
    expect(isVowel('1', EN_V1)).toBe(false);
    expect(isVowel(' ', EN_V1)).toBe(false);
  });
});

describe('isConsonant', () => {
  it('should identify consonants', () => {
    expect(isConsonant('b', EN_V1)).toBe(true);
    expect(isConsonant('Z', EN_V1)).toBe(true);
  });

  it('should reject vowels', () => {
    expect(isConsonant('a', EN_V1)).toBe(false);
    expect(isConsonant('Y', EN_V1)).toBe(false);
  });

  it('should reject non-letters', () => {
    expect(isConsonant('1', EN_V1)).toBe(false);
    expect(isConsonant('-', EN_V1)).toBe(false);
  });
});

describe('isSeparator', () => {
  it('should identify spaces', () => {
    expect(isSeparator(' ')).toBe(true);
  });

  it('should identify punctuation', () => {
    expect(isSeparator('-')).toBe(true);
    expect(isSeparator("'")).toBe(true);
    expect(isSeparator('.')).toBe(true);
  });

  it('should reject letters', () => {
    expect(isSeparator('a')).toBe(false);
  });
});

describe('extractConsonants', () => {
  it('should extract only consonants', () => {
    expect(extractConsonants('family', EN_V1)).toBe('fml');
    expect(extractConsonants('mother-in-law', EN_V1)).toBe('mthrnlw');
  });

  it('should treat Y as vowel (not consonant)', () => {
    expect(extractConsonants('myth', EN_V1)).toBe('mth');
    // rhythm = r-h-y-t-h-m, removing y gives r-h-t-h-m
    expect(extractConsonants('rhythm', EN_V1)).toBe('rhthm');
  });

  it('should handle empty string', () => {
    expect(extractConsonants('', EN_V1)).toBe('');
  });

  it('should handle strings with no consonants', () => {
    expect(extractConsonants('aeiou', EN_V1)).toBe('');
  });
});
