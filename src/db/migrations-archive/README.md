# Archived migrations

These are the migrations that existed before the chain was squashed on
2026-08-19. **Nothing reads them.** drizzle-kit applies whatever the journal in
`../migrations/meta/_journal.json` lists, and this directory is not it.

## Why they were retired

The chain could not run from an empty database, and had not been able to for
some time. It was written against a schema that `drizzle-kit push` had already
moved on from, so files referenced objects that arrived later or never:

- `0002` deduplicates `notification_queue` and indexes it. No migration creates
  that table — it only ever existed because of `push`.
- `0006` builds an index on `software_licenses.asset_id`. No migration adds that
  column until `0007`, one file too late. This is what CI reported as
  `column "asset_id" does not exist`.

Both are the same defect, and fixing them one at a time cost a CI cycle each to
discover the next one. `../migrations/0000_baseline_schema.sql` replaces all
eight files with a single idempotent baseline generated from `schema.ts`, which
is the only artifact that describes the schema correctly.

Deployed databases are unaffected: the baseline carries a newer journal
timestamp, so it is applied on top of whatever was already there, and every
statement in it no-ops when the object exists.

## If you need something from here

Read them. Do not re-add them to the journal, and do not use them as a template
— generate from `schema.ts` instead:

```
npm run db:generate
```
