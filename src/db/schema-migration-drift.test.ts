/**
 * @vitest-environment node
 *
 * Structural guard for CQ-A / NEW-5.
 *
 * `schema.ts` is the model the application queries through; the files in
 * `migrations/` are what actually builds a database. When they disagree,
 * `npm run db:migrate` produces a database the app cannot run on — and nothing
 * else in CI notices, because migrating only executes SQL without comparing the
 * result to the model.
 *
 * This test pins the drift that exists today. It is expected to fail the moment
 * a new table is added to `schema.ts` without a migration, and the allowlists
 * below should shrink to empty as NEW-5 is remediated.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const DB_DIR = join(process.cwd(), 'src', 'db');
const MIGRATIONS_DIR = join(DB_DIR, 'migrations');

/**
 * Tables declared in `schema.ts` that no migration creates.
 *
 * Empty, and it must stay that way. Migration 0007 reconciled the nine tables
 * that were only ever created by `drizzle-kit push`. A new entry here means a
 * from-zero database would be missing that table — which is how migration 0002
 * came to fail in CI.
 */
const KNOWN_MISSING_FROM_MIGRATIONS: string[] = [];

/**
 * Tables a migration creates that `schema.ts` no longer declares.
 *
 * Empty. `sessions` predates the move to Keycloak and nothing reads it, but it
 * exists in every deployed database, so the model declares it rather than
 * pretending otherwise. Dropping it is a separate, reviewed migration.
 */
const KNOWN_ORPHANED_IN_MIGRATIONS: string[] = [];

function schemaTables(): Set<string> {
  const source = readFileSync(join(DB_DIR, 'schema.ts'), 'utf8');
  return new Set(
    [...source.matchAll(/pgTable\(\s*'([^']+)'/g)].map((match) => match[1])
  );
}

function migrationTables(): Set<string> {
  const names = new Set<string>();
  for (const file of readdirSync(MIGRATIONS_DIR)) {
    if (!file.endsWith('.sql')) continue;
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
    for (const match of sql.matchAll(
      /CREATE TABLE\s+(?:IF NOT EXISTS\s+)?"?([a-z0-9_]+)"?/gi
    )) {
      names.add(match[1]);
    }
  }
  return names;
}

describe('schema and migration drift', () => {
  const inSchema = schemaTables();
  const inMigrations = migrationTables();

  it('parses both sources', () => {
    expect(inSchema.size).toBeGreaterThan(20);
    expect(inMigrations.size).toBeGreaterThan(15);
  });

  it('no new table is added to schema.ts without a migration', () => {
    const missing = [...inSchema]
      .filter((table) => !inMigrations.has(table))
      .sort();

    expect(missing).toEqual(KNOWN_MISSING_FROM_MIGRATIONS);
  });

  it('no new orphan is left behind in migrations', () => {
    const orphaned = [...inMigrations]
      .filter((table) => !inSchema.has(table))
      .sort();

    expect(orphaned).toEqual(KNOWN_ORPHANED_IN_MIGRATIONS);
  });

  it('the performance indexes from migration 0006 are declared in schema.ts', () => {
    const schemaSource = readFileSync(join(DB_DIR, 'schema.ts'), 'utf8');
    const migrationSource = readFileSync(
      join(MIGRATIONS_DIR, '0006_security_performance_indexes.sql'),
      'utf8'
    );

    const declaredNames = new Set(
      [...schemaSource.matchAll(/index\(\s*'([^']+)'/g)].map((m) => m[1])
    );
    const migrationIndexNames = [
      ...migrationSource.matchAll(/CREATE INDEX IF NOT EXISTS "([^"]+)"/g),
    ].map((m) => m[1]);

    const undeclared = migrationIndexNames
      .filter((name) => !declaredNames.has(name))
      .sort();

    // An index Drizzle does not know about is one `db:push` will drop.
    expect(undeclared).toEqual([]);
  });
});
