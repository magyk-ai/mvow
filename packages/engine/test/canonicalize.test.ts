import { describe, it, expect } from 'vitest';
import { canonicalize } from '../src/rules/canonicalize.js';
import { EN_V1 } from '../src/config.js';

describe('canonicalize', () => {
  it('should normalize to NFKC and trim', () => {
    // Non-breaking space normalizes to space, then gets trimmed to empty
    const result = canonicalize('\u00A0', EN_V1);
    expect(result).toBe('');

    // Non-breaking space in middle preserved as regular space
    const result2 = canonicalize('hello\u00A0world', EN_V1);
    expect(result2).toBe('hello world');
  });

  it('should trim whitespace', () => {
    expect(canonicalize('  hello  ', EN_V1)).toBe('hello');
  });

  it('should collapse whitespace runs to single space', () => {
    expect(canonicalize('hello    world', EN_V1)).toBe('hello world');
    expect(canonicalize('a  \t  b', EN_V1)).toBe('a b');
  });

  it('should convert to lowercase', () => {
    expect(canonicalize('FAMILY', EN_V1)).toBe('family');
    expect(canonicalize('FaMiLy', EN_V1)).toBe('family');
  });

  it('should strip diacritics when configured', () => {
    expect(canonicalize('café', EN_V1)).toBe('cafe');
    expect(canonicalize('naïve', EN_V1)).toBe('naive');
    expect(canonicalize('Ñoño', EN_V1)).toBe('nono');
  });

  it('should handle combined transformations', () => {
    expect(canonicalize('  CAFÉ  NAÏVE  ', EN_V1)).toBe('cafe naive');
  });

  it('should handle empty string', () => {
    expect(canonicalize('', EN_V1)).toBe('');
  });

  it('should preserve punctuation', () => {
    expect(canonicalize("DON'T STOP", EN_V1)).toBe("don't stop");
    expect(canonicalize('MOTHER-IN-LAW', EN_V1)).toBe('mother-in-law');
  });
});
