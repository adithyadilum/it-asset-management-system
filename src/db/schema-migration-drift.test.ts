/**
 * @vitest-environment node
 *
 * Structural guard for CQ-A / NEW-5.
 *
 * `schema.ts` is the model the application queries through; the files in
 * `migrations/` are what actually builds a database. When they disagree,
 * `npm run db:migrate` produces a database the app cannot run on.
 *
 * CI now applies the migrations to a real PostgreSQL on every run, which is the
 * authoritative check. This test is the fast one: it catches the common mistake
 * -- editing `schema.ts` and forgetting `npm run db:generate` -- in
 * milliseconds, without a database.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const DB_DIR = join(process.cwd(), 'src', 'db');
const MIGRATIONS_DIR = join(DB_DIR, 'migrations');

const schemaSource = readFileSync(join(DB_DIR, 'schema.ts'), 'utf8');

/**
 * Every `.sql` the journal will apply, concatenated, with `--` comments
 * stripped. Those comments describe the DDL using the same words as the DDL, so
 * leaving them in makes every pattern below match its own documentation.
 */
function migrationSql(): string {
  return readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .map((file) => readFileSync(join(MIGRATIONS_DIR, file), 'utf8'))
    .join('\n')
    .replace(/^[ \t]*--.*$/gm, '');
}

const sql = migrationSql();

const schemaTables = new Set(
  [...schemaSource.matchAll(/pgTable\(\s*'([^']+)'/g)].map((m) => m[1])
);

const migrationTables = new Set(
  [
    ...sql.matchAll(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?"?([a-z0-9_]+)"?/gi),
  ].map((m) => m[1])
);

describe('schema and migration drift', () => {
  it('parses both sources', () => {
    expect(schemaTables.size).toBeGreaterThan(20);
    expect(migrationTables.size).toBeGreaterThan(20);
  });

  it('no table is declared in schema.ts without a migration', () => {
    const missing = [...schemaTables]
      .filter((table) => !migrationTables.has(table))
      .sort();

    // Run `npm run db:generate` and commit the result.
    expect(missing).toEqual([]);
  });

  it('no table is left behind in the migrations', () => {
    const orphaned = [...migrationTables]
      .filter((table) => !schemaTables.has(table))
      .sort();

    expect(orphaned).toEqual([]);
  });

  it('every index declared in schema.ts is created by a migration', () => {
    const declared = [
      ...schemaSource.matchAll(/(?:^|[^a-zA-Z])index\(\s*'([^']+)'/g),
    ].map((m) => m[1]);

    const created = new Set(
      [
        ...sql.matchAll(
          /CREATE (?:UNIQUE )?INDEX\s+(?:IF NOT EXISTS\s+)?"([^"]+)"/gi
        ),
      ].map((m) => m[1])
    );

    // An index Drizzle knows about but no migration creates exists only on
    // databases that were built with `db:push`.
    expect(declared.filter((name) => !created.has(name)).sort()).toEqual([]);
  });

  it('creates the pg_trgm extension the trigram indexes depend on', () => {
    // drizzle-kit does not manage extensions, so regenerating the baseline
    // silently drops this line and every `gin_trgm_ops` index below it then
    // fails on a database that does not already have the extension.
    expect(sql).toMatch(/CREATE EXTENSION IF NOT EXISTS "pg_trgm"/i);
    expect(sql).toMatch(/gin_trgm_ops/);
    expect(
      sql.search(/CREATE EXTENSION IF NOT EXISTS "pg_trgm"/i)
    ).toBeLessThan(sql.search(/gin_trgm_ops/));
  });

  it('is safe to re-apply to an already-provisioned database', () => {
    // The deployed databases were built by `db:push`, so they already carry
    // every object and the baseline has to no-op across all of them.
    const creates = [
      ...sql.matchAll(/^[ \t]*CREATE (?:TABLE|(?:UNIQUE )?INDEX)\b.*$/gim),
    ].map((m) => m[0].trim());

    expect(creates.length).toBeGreaterThan(50);
    expect(creates.filter((line) => !/IF NOT EXISTS/i.test(line))).toEqual([]);

    // Enums and constraints have no IF NOT EXISTS form, so each one is wrapped
    // in an exception handler instead.
    const guardable = [
      ...sql.matchAll(
        /^[ \t]*(?:CREATE TYPE|ALTER TABLE "[a-z_]+" ADD CONSTRAINT)\b/gim
      ),
    ];
    const handlers = [...sql.matchAll(/WHEN duplicate_object THEN NULL;/gi)];

    expect(guardable.length).toBeGreaterThan(40);
    expect(handlers.length).toBe(guardable.length);
  });

  it('never drops anything', () => {
    // A squashed baseline re-runs against live databases, so nothing in it may
    // destroy data.
    const destructive = sql
      .split('\n')
      .filter((line) =>
        /^\s*(?:DROP|TRUNCATE|DELETE FROM|ALTER TABLE .*DROP COLUMN)\b/i.test(
          line
        )
      );

    expect(destructive).toEqual([]);
  });
});
