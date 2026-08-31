/**
 * Splits an omni-search query into the terms every result must match.
 *
 * The search used to wrap the whole query in one `%...%`, so it only ever
 * matched a substring that appeared verbatim in a single column. "dell xps"
 * found nothing, because no column holds both words: the brand is on `brands`
 * and the model on `models`. Matching each term separately, and requiring all
 * of them, lets a query span columns and stops word order mattering.
 */

/** More terms than this and the user is pasting, not searching. */
const MAX_TERMS = 6;

/** Below this a term matches most of the fleet and is not worth a clause. */
const MIN_TERM_LENGTH = 1;

export function parseSearchTerms(query: string): string[] {
  const seen = new Set<string>();

  for (const raw of query.trim().split(/\s+/)) {
    const term = raw.trim();
    if (term.length < MIN_TERM_LENGTH) continue;

    // Case-insensitive de-duplication: "Dell dell" is one clause, not two.
    const key = term.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    if (seen.size >= MAX_TERMS) break;
  }

  return [...seen];
}

/**
 * Escapes the characters ILIKE treats as wildcards.
 *
 * Without this a query containing `%` matches everything and one containing
 * `_` matches any character in that position, so searching for a serial like
 * `SN_0042` quietly returned the wrong rows.
 */
export function escapeLikePattern(value: string): string {
  return value.replace(/([\\%_])/g, '\\$1');
}

/** `%term%`, safe to hand to ILIKE. */
export function containsPattern(term: string): string {
  return `%${escapeLikePattern(term)}%`;
}

/** `term%`, safe to hand to ILIKE. */
export function startsWithPattern(term: string): string {
  return `${escapeLikePattern(term)}%`;
}
