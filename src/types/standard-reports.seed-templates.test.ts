import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { REPORT_FIELD_OPTIONS_BY_SOURCE } from '@/types/standard-reports';

/**
 * The demo seed lists report-template fields by name.
 *
 * It cannot import this map: the seed is a `.mts` run directly by node, which
 * needs a `.ts` extension on the import, and `tsc` rejects that without
 * `allowImportingTsExtensions`. So the names are duplicated there, and this
 * test is what stops the copy drifting -- a renamed field would otherwise
 * leave a saved template quietly producing an empty column.
 */
const SEED = readFileSync(
  join(process.cwd(), 'scripts', 'seed-demo-data.mts'),
  'utf8'
);

/** Pulls `source` and `fields` out of each template literal in the seed. */
function parseSeedTemplates() {
  const templates: Array<{ source: string; fields: string[] }> = [];
  const blocks = SEED.matchAll(
    /source: '([^']+)',\s*\n\s*filters: \{[^}]*\},\s*\n\s*fields: \[([\s\S]*?)\],/g
  );
  for (const [, source, raw] of blocks) {
    const fields = [...raw.matchAll(/'([^']+)'/g)].map((m) => m[1]);
    templates.push({ source, fields });
  }
  return templates;
}

describe('demo seed report templates', () => {
  const templates = parseSeedTemplates();

  it('parses every template the seed declares', () => {
    // Counted independently off the report codes: a parser that silently
    // matched only some templates would leave the rest unguarded while this
    // suite still passed.
    const declared = [...SEED.matchAll(/code: 'RPT-[0-9-]+'/g)].length;
    expect(declared).toBeGreaterThanOrEqual(10);
    expect(templates.length).toBe(declared);
  });

  it('only names data sources the report builder knows', () => {
    const known = Object.keys(REPORT_FIELD_OPTIONS_BY_SOURCE);
    for (const t of templates) expect(known).toContain(t.source);
  });

  it('only names fields the builder offers for that source', () => {
    for (const t of templates) {
      const allowed = REPORT_FIELD_OPTIONS_BY_SOURCE[t.source];
      for (const field of t.fields) {
        expect(allowed, `"${field}" is not a field of ${t.source}`).toContain(
          field
        );
      }
    }
  });

  it('gives every template at least one field', () => {
    for (const t of templates) expect(t.fields.length).toBeGreaterThan(0);
  });
});
