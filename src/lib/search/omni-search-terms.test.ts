import { describe, expect, it } from 'vitest';

import {
  containsPattern,
  escapeLikePattern,
  parseSearchTerms,
  startsWithPattern,
} from './omni-search-terms';

describe('parseSearchTerms', () => {
  it('splits a query into one term per word', () => {
    // The whole point: "dell xps" spans two tables, so it can only match if
    // the terms are applied separately.
    expect(parseSearchTerms('dell xps')).toEqual(['dell', 'xps']);
  });

  it('collapses runs of whitespace', () => {
    expect(parseSearchTerms('  dell   xps  ')).toEqual(['dell', 'xps']);
  });

  it('de-duplicates terms case-insensitively', () => {
    expect(parseSearchTerms('Dell dell DELL')).toEqual(['dell']);
  });

  it('returns nothing for an empty or whitespace-only query', () => {
    expect(parseSearchTerms('')).toEqual([]);
    expect(parseSearchTerms('   ')).toEqual([]);
  });

  it('caps the number of terms so one query cannot build an unbounded clause', () => {
    const terms = parseSearchTerms('a b c d e f g h i j');
    expect(terms.length).toBeLessThanOrEqual(6);
  });

  it('keeps a single-character term, which is a valid prefix search', () => {
    expect(parseSearchTerms('a')).toEqual(['a']);
  });
});

describe('escapeLikePattern', () => {
  it('escapes the ILIKE wildcards', () => {
    // Unescaped, "%" matches the whole fleet and "_" matches any character,
    // so a serial like SN_0042 silently returned the wrong rows.
    expect(escapeLikePattern('100%')).toBe('100\\%');
    expect(escapeLikePattern('SN_0042')).toBe('SN\\_0042');
    expect(escapeLikePattern('back\\slash')).toBe('back\\\\slash');
  });

  it('leaves ordinary text alone', () => {
    expect(escapeLikePattern('XPS 15 9520')).toBe('XPS 15 9520');
  });
});

describe('pattern builders', () => {
  it('wraps a contains search on both sides', () => {
    expect(containsPattern('dell')).toBe('%dell%');
  });

  it('anchors a starts-with search at the front only', () => {
    expect(startsWithPattern('LAP')).toBe('LAP%');
  });

  it('escapes wildcards inside the pattern it builds', () => {
    expect(containsPattern('50%')).toBe('%50\\%%');
    expect(startsWithPattern('SN_')).toBe('SN\\_%');
  });
});
