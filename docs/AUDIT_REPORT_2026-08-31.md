# Code audit — 31 August 2026

Scan of security, performance and code quality across `src/`, the proxy, the
migrations and the e2e suite. Each finding records what was checked, what was
found, and what was done about it.

Findings marked **Fixed** were implemented in the same change as this document.
Findings marked **Reported** were left alone deliberately — the reason is given.

---

## Security

### S1 — `/api-docs` bypasses authentication entirely — Reported

`src/proxy.ts` matcher:

```
'/((?!api|_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons).*)'
```

The `api` alternative is a prefix, not a path segment, so it also excludes
`/api-docs/*`. Verified:

```
/api-docs/index.html  -> proxy runs: false
```

The Swagger page is therefore reachable without a session. The spec it fetches
(`/api/openapi.json`) _is_ guarded by `withSessionAuth`, so an anonymous
visitor sees the page shell and an error, not the API surface. The exposure is
the page itself, not the documentation.

Not changed here because tightening the matcher to `api/` alters routing for
every request and deserves its own change with its own verification. The fix is
to anchor the alternative to a segment boundary:

```
'/((?!api/|_next/static|…).*)'
```

`isPublicAssetPath()` needs the same treatment — it uses
`!pathname.startsWith('/api')` for the same purpose.

### S2 — Assignment pillar rules are enforced only in the browser — Reported

`MultiAssetAssignmentModal` decides that software goes to a person and office
assets go to a location, and blocks a batch spanning both.
`validateAssetsForAssignment()` in `operations-assignments-repo.ts` checks
existence and status only — it never looks at the category pillar. A direct call
to `bulkAssignAssetsAction` can still assign a desk to a person.

Left for a separate change: adding the check means joining `models` →
`categories` inside the assignment path and deciding what to do with the
existing rows that already violate it. Worth doing, but not silently.

### S3 — `setPreferredCurrency` wrote an unvalidated, unhardened cookie — Fixed

`src/actions/currency.ts` accepted any string and stored it with only
`path: '/'`:

```ts
cookieStore.set('preferred_currency', currencyCode, { path: '/' });
```

Two problems. The value was never checked against `SUPPORTED_CURRENCIES`, so
arbitrary content could be written to a cookie the server later reads and passes
around as a currency code. And the cookie carried no `sameSite`, `httpOnly` or
`secure` flags.

Rendering never crashed on it — `resolveCurrencyCode()` falls back to `LKR` for
anything unrecognised — so this was defence in depth rather than a live bug.
Now the value is validated at the boundary and the cookie is hardened. It is
read only in server components (`layout.tsx`, `disposals/page.tsx`), never via
`document.cookie`, so `httpOnly` is safe.

---

## Performance

### P1 — Bulk import opens one transaction per row — Reported

`bulk-import.ts` wraps each row in its own `db.transaction`. For a large import
that is one round trip per row.

Deliberately left alone: the loop collects `failedRows` and continues past
individual failures, which is only possible because each row commits or rolls
back on its own. Batching would trade that per-row isolation for throughput, and
that is a product decision, not a cleanup.

### P2 — 23 unprojected `.select()` calls — Reported

`src/actions` and `src/lib/data` contain 23 `.select()` calls with no column
list, which fetch every column of the joined tables. Several feed views that use
two or three fields.

Not changed in bulk: each one needs checking against its consumers to avoid
dropping a field something reads, and a sweeping change here is a large diff
with a real regression surface for little measured gain. Worth doing per-query
when those paths are next touched, guided by a measurement rather than a grep.

---

## Code quality

### Q1 — e2e assertions could not fail — Fixed

`DashboardPage.expectToBeVisible()` asserted two things, neither of which tested
anything:

```ts
await expect(this.page).toHaveURL(/\/?$/);          // matches every string
await expect(...).toBeVisible().catch(() => {});     // failure swallowed
```

`/\/?$/` matches any input, because `\/?` is optional and `$` matches the end of
any string. The heading check discarded its own rejection. Both `auth.spec.ts`
tests using it passed regardless of what the app did — including for an
Employee, who has no dashboard at all and is redirected to `/my-assets`.

Replaced with `expectLandedOn(pathname, heading)`, which asserts the real
destination per role and a real heading. Navigations also moved to
`waitUntil: 'domcontentloaded'`; the app streams and holds connections open, and
waiting for full `load` was intermittently sitting until the 30s timeout — the
cause of the flaky Employee failures seen in CI.

### Q2 — `reportDefectiveFromPanel` is dead — Reported

Since the detail panel moved to `flagAssetForRepair`, the only remaining
references to `reportDefectiveFromPanel` are its own tests. It is still exported
from `src/actions/maintenance.ts`.

Left in place: deleting a server action and its tests is a separate, easily
reviewed change, and it is harmless where it sits.

### Q3 — `setState` inside effects — Fixed

Two components scheduled a render, then corrected themselves in an effect:

- `edit-user-role-modal.tsx` reset form state in a `useEffect`
- `use-assignment-modal-state.ts` corrected an invalid assignment mode

Both fail `react-hooks/set-state-in-effect`, which is an **error** in this
repo's config, so both broke `npm run check` in CI. Both now derive during
render — the modal by comparing against previous props, the hook by correcting
the mode as it is read.

### Q4 — Stale `react-hooks/exhaustive-deps` warning — Fixed

`use-registration-form.ts:231` omitted `MAX_INVOICE_FILE_SIZE` from a
`useCallback` dependency list. It is a module constant, so the behaviour was
never wrong, but it was the only lint warning left in the repo and it hid
anything new appearing beside it.

---

## Verified healthy

Checks that came back clean, recorded so the next audit need not redo them:

- No `dangerouslySetInnerHTML`, `eval()` or `new Function()` in application code.
  The one `redis.eval` in `bulk-import.ts` is a Redis Lua script, not JS eval.
- No `console.log` left in `src/actions` or `src/lib`.
- Every exported server action reaches an auth guard. Two files initially looked
  unguarded; both were false positives — `disposals/execute.ts` uses
  `enforceFormAccess`, and `currency.ts` sets a UI preference that needs no
  session.
- `npm audit --audit-level=high` is clean (5 moderate advisories, all
  `postcss` transitives).
- All SQL goes through Drizzle's parameterised builders. The `sql` template
  interpolations are column and table references, not user input.
