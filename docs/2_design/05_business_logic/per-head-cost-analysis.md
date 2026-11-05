# Per-head cost analysis: implementation audit and integration plan

Date: 2026-11-05. Status: implemented and verified in code; application-database migration deployment remains pending.

## Confirmed requirements

The module belongs under Financials and must show both the cost attributable to a person's period of use and the value of their currently assigned assets. Reporting must support months, custom date ranges, and history across physical assets, shared equipment, and software licences.

The following decisions were confirmed during planning:

| Topic                      | Agreed behavior                                                                                                                                   |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared equipment           | Split equally among people in the asset's department or location, prorated for membership dates.                                                  |
| Repairs                    | Treat as department or location overhead and split using the shared-cost rule. Do not charge the previous custodian directly.                     |
| Subscription seats         | Divide licence cost by purchased seats, allocate occupied seats to their users, and show unused seats as overhead.                                |
| Membership history         | Maintain effective membership dates within this system. Reliable shared-cost history starts at rollout.                                           |
| Perpetual software         | Spread purchase cost over a configurable useful life for each licence.                                                                            |
| Historical corrections     | Recalculate historical reports when inputs are corrected and display the generation time. No monthly close or locked report workflow is required. |
| Custody start and timezone | Personal usage begins at acceptance; reporting uses Asia/Colombo.                                                                                 |
| Partial months             | Prorate the monthly physical depreciation pool by the time the asset was owned.                                                                   |

This is management cost allocation based on recorded custody and membership. The application does not record actual device activity, software login activity, or hours of use. Allocation must not imply employee liability for damage or repairs.

## Audit snapshot before implementation

| Area             | Existing implementation                                                                                                                                                                                                                | Integration consequence                                                                                                  |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Financials       | Depreciation, TCO, and salvage pages backed by server actions in [financials.ts](../../../src/actions/financials.ts).                                                                                                                  | Add a fourth ledger; reuse the page, table, filter, summary, and chart conventions.                                      |
| Access           | The [Financials layout](<../../../src/app/(app-shell)/(management)/financials/layout.tsx>) and actions restrict access to GlobalAdmin and FinancialAuditor. A shared [role predicate](../../../src/lib/auth/roles.ts) already exists.  | Enforce the same access on list, detail, summary, and export actions.                                                    |
| People           | `users` has name, email, current department, role, active flag, and creation time. `departments` has a cost-center identifier.                                                                                                         | Use user IDs as identities; people holding assets can have any role. User creation time is not an employment start date. |
| Physical custody | `assetAssignments` retains assigned, accepted, and returned timestamps, user/location targets, and workflow state. [Transfers](../../../src/lib/data/operations-assignments-repo.ts) close the previous assignment and create another. | Existing history can support direct allocations, subject to completeness checks.                                         |
| Purchases        | `assetPurchases` records acquisition amount, purchase date, currency, and a stored conversion rate to LKR.                                                                                                                             | Acquisition inputs and recorded FX can be reused after checking their validity.                                          |
| Depreciation     | [depreciation.ts](../../../src/lib/depreciation.ts) centralizes straight-line calculations and whole calendar-month stepping. Software is normally carried at cost.                                                                    | Reuse its policy inputs; define period allocation explicitly without changing existing software book valuation.          |
| Maintenance      | Completed tickets have actual cost, their own currency, and a completion date. Dispatch into repair ends open assignments.                                                                                                             | Allocate repair events through a dated overhead group rather than searching for an assignee at completion.               |
| Software         | `softwareAllocations` records allocation and revocation timestamps; licences have seats and current term dates.                                                                                                                        | Seat occupancy history exists, but financial term and seat-capacity history must be added.                               |
| Exports          | Ledger clients fetch a large page and construct CSV in the browser.                                                                                                                                                                    | Reuse appearance, but implement a complete export path rather than copying the single-page approach.                     |

Schema references: [schema.ts](../../../src/db/schema.ts). Software mutations: [software.ts](../../../src/actions/software.ts).

## Audit findings affecting this feature

These are source-code findings. No production database was queried, so the actual frequency of inconsistent or missing records is unknown.

1. **High: TCO combines monetary amounts before normalizing their currencies.** The repair CTE in `getTCOLedger` sums `maintenanceTickets.actualCost` without currency grouping. Rows and summary then treat that sum as the asset's purchase currency. The trend instead converts each ticket using its own currency, so its ending total can disagree with the summary. Cost filters also compare unconverted amounts against thresholds labelled in dollars. Normalize each source event before adding or filtering; do not reuse current TCO totals as per-person inputs.

2. **High: acquisition FX is not used consistently.** Financial ledger totals use the fixed fallback rates in [currency.ts](../../../src/lib/currency.ts), whereas dashboard KPI queries use stored purchase exchange rates. This can produce different totals for the same estate. Establish one reporting FX policy: use recorded transaction rates for normalized historical cost, preserve original amounts/currencies, and distinguish display conversion from cost recognition. Maintenance and future renewal expenses need equivalent recorded rates. Flag missing or suspect legacy rates rather than silently substituting current rates.

3. **High: the registration salvage estimate does not reach the depreciation input.** [Asset registration](../../../src/actions/assets.ts) writes `assetPurchases.estimatedSalvageValue`; depreciation and disposal valuation read `assets.salvageValue`. Registration does not populate that second field. Agree on one canonical residual value and reconcile existing records before deriving usage costs. Preserve finalized disposal values. Do not overwrite conflicting values automatically.

4. **High: shared-cost attribution lacks its required population and history.** There is no dated user-to-location membership, dated department membership, or explicit asset-to-financial-group policy. Authentication can overwrite a user's department. A current join would retrospectively move old costs into a person's new department. Add effective memberships and cost-group policies; record the shared-history coverage start at rollout.

5. **High: software has occupancy history but insufficient financial history.** Renewal updates current expiry and seat count without recording a renewal amount or historical seat capacity. The dashboard's software optimization query derives a seat amount from acquisition cost, supplies a fallback of 10, and labels it USD/monthly without establishing the original currency or paid coverage period. These estimates cannot become actual per-person costs. Record paid terms, amendments, seat capacity, currency, and useful allocation life for perpetual licences.

6. **Medium: custody eligibility needs explicit rules.** Pending, rejected, and cancelled assignments must not incur personal usage costs. Transfers overwrite `acceptanceStatus` with `transferred`, even for a previously accepted assignment. Several maintenance/status/disposal paths set `returnedDate` without changing assignment state. Calculate from eligible intervals and timestamps, not a current state or `acceptanceStatus === 'accepted'` filter. The unused repository acceptance helper also sets state without `acceptedAt`; standardize that path before it is reused.

7. **Medium: schema joins can multiply costs or hide unpriced assets.** Purchase asset IDs have an ordinary index, not a uniqueness constraint; the schema permits multiple purchase rows for one asset. Assignment indexes do not enforce one open assignment. Existing financial queries use purchase inner joins, omitting assets with no purchase row. Profile existing data, define acquisition cardinality, validate nonoverlapping custody, and retain missing-cost assets as explicitly unpriced in the new report.

8. **Medium: CSV exports can silently stop at 1,000 records.** The TCO client asks for 5,000 rows, but query validation clamps page size to 1,000. Provide an authorized export that traverses every matching result. Escape CSV values, including quotes and spreadsheet formula prefixes in person/asset names.

9. **Medium: timestamp and historical input semantics are inconsistent.** Assignment/allocation timestamps lack timezone metadata, while user creation timestamps include it. Existing depreciation uses local calendar months. Define the organization's reporting timezone before converting intervals; do not blindly reinterpret legacy timestamps. Historical recalculation also requires knowing whether edited costs and useful lives apply retrospectively or from an effective date.

## Proposed calculation contract

### Separate period expense from current asset value

Return two independent sections:

- **Period usage cost:** direct physical depreciation, shared physical depreciation, allocated software expense, and allocated repair overhead during the selected interval.
- **Current assigned asset value:** acquisition cost and current book/carrying value of assets allocated to the person at the report's current `asOf` time, broken down by direct assets, shared shares, and software seats.

Show both acquisition and book/carrying value with explicit labels. They describe different things and neither is added to period expense. For historical periods, label the second section as current; any later historical valuation view must take a separate explicit valuation date.

For shared equipment and software, show the person's share alongside the whole asset/licence value. Each asset must have exactly one allocation path for a given expense component and instant. A directly assigned laptop must not also enter a shared equipment pool.

### Time and physical depreciation

- Use half-open intervals `[start, end)` internally. Convert an inclusive end date in the UI into the following local midnight. Calculate in a configured reporting timezone; Asia/Colombo is the proposed initial setting, subject to confirming the organization's timezone.
- Proposed personal custody starts at acceptance and ends at the earliest recorded return, transfer, repair dispatch, or disposal handover. Pending, cancelled, and rejected intervals contribute no personal allocation. Accepted transfers remain eligible before their end. Overdue or return-requested status does not itself stop custody.
- Keep the existing straight-line monthly depreciation schedule as the monthly source pool. For allocation, distribute each month's eligible expense over its eligible in-service duration, then intersect it with report, custody, and membership intervals. Specify purchase-month and disposal-month treatment with fixtures before implementation; do not derive arbitrary-range usage by simply subtracting two rounded book values.
- Stop physical depreciation at its useful-life/residual limit. A fully depreciated asset can still incur repairs. Preserve historical expense for assets now archived or disposed; do not filter historical reports by today's active asset status.
- Time without a qualifying custodian or shared policy belongs to unallocated organizational cost. Missing required inputs belong to an exception list rather than becoming a zero-price assumption.

Example: an eligible full month has LKR 3,000 depreciation and 30 days. Person A holds the asset for the first 10 days and person B for the next 20: allocate LKR 1,000 and LKR 2,000 respectively. A mid-day transfer must also preserve the total without overlapping charges.

### Shared assets and repairs

- Map every shared asset to one explicit department or location group for each effective interval. Where both are possible, require a selected group; do not implicitly split through both.
- Split each time segment equally among eligible members of that group. A person joining or leaving changes the denominator from that effective instant, so split the segment at each membership change.
- Attribute a repair to a dated overhead group recorded when the expense is recognized. Proposed recognition is completion date for completed tickets only. Preserve the group's identity even if the asset later moves.
- Split recognized repair overhead among the group's members using the same membership rule. Do not spread it to unrelated departments or charge the last custodian.
- Empty groups, missing group mappings, and gaps in reliable membership history remain visible as unallocated/unknown costs. Do not distribute their costs among unrelated people.

### Software

- Subscription expense comes from the paid amount and coverage interval for a specific term. Allocate over that coverage interval; divide by purchased seats effective during each segment; intersect each seat's share with its user's allocation interval.
- Preserve seat-capacity changes as effective amendments. Revoking a seat stops its personal cost; it does not remove the expense of the purchased seat.
- Keep unused-seat expense as a separate software overhead category. Do not redistribute it into occupied seats or the repair/shared-equipment pools.
- Perpetual licence usage cost follows a separately configured allocation life. This management expense schedule must not silently change the existing financial book-value policy that carries software at cost. Free licences contribute zero known licence expense.
- Prevent duplicate counting of the initial purchase and its linked first software term. Software usage expense must not also enter physical depreciation.
- Missing renewal prices or perpetual useful lives are incomplete data, not guessed amounts. End personal software allocation at the applicable revocation, term expiry, or licence termination.

### Totals, currency, and headcount

- Normalize every monetary source into LKR using its recorded rate before aggregation. Preserve source currency, amount, rate, and rate date for drill-down. Select one dated display conversion for a response/export and expose that basis; changing the display currency must not change the underlying allocations.
- Use PostgreSQL numeric calculations or exact decimal/minor-unit arithmetic with sufficient intermediate precision. Round at presentation, allocate rounding residuals deterministically, and reconcile exported detail to totals.
- Default average: known allocated period cost divided by the number of distinct people with eligible custody, software allocation, or shared membership during the selected period. Include eligible people with known zero expense; display the population and incompleteness count. Label this as the average for included people, not company-wide cost per employee or a monthly rate for a partial range.
- For every source component and covered interval, enforce `source expense = allocated personal expense + overhead/unallocated expense`, with incomplete amounts reported separately. Do not add the full acquisition price to depreciation or net salvage proceeds against usage costs by default.

## Data and workflow additions

Add incremental, non-destructive Drizzle migrations after profiling the existing data:

| Addition                            | Required information and behavior                                                                                                                                                                                                                                         |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Financial allocation groups         | Department/location identity, active dates, and clear mapping to existing cost centers.                                                                                                                                                                                   |
| Effective group memberships         | Person, group, valid-from, valid-to, change reason, and actor. Prevent duplicate overlapping membership within a group. Preserve department and location histories independently.                                                                                         |
| Effective asset allocation policies | Asset, direct/shared treatment, selected shared/overhead group, and effective interval. Direct custody is derived from assignments rather than entered again. Store an explicit overhead group for direct assets too.                                                     |
| Software financial terms            | Licence, paid amount, currency, recorded FX, coverage dates, purchased seats, amendments, and source purchase/renewal reference. Perpetual licences also need an allocation life and start date.                                                                          |
| Normalized cost inputs              | Purchase and completed-repair adapters plus software-term expense schedules, carrying source IDs and effective policy versions. If persisted as a projection, enforce unique source/revision keys and transactional refresh so purchases/repairs are never counted twice. |
| Historical coverage metadata        | Reliable-from dates and legacy-data exception reasons. Distinguish available direct assignment history from shared history starting at rollout.                                                                                                                           |

Do not add locked monthly report snapshots: the confirmed requirement allows recalculation. Return `generatedAt`, `asOf`, reporting timezone, policy version, FX basis, and coverage warnings so the result can be interpreted. Existing exports remain records of what was generated at that time.

Membership and group configuration should initially be administered by GlobalAdmin. Keep FinancialAuditor read-only. Preserve existing permissions for operational maintenance and software assignment workflows; new financial input/configuration writes need their own explicit server-side guard and audit entries.

Update department synchronization so it appends effective membership changes rather than destroying history. Location membership needs a new management interface because the current user schema has no location field. Audit membership, group, cost, and useful-life corrections. Never manufacture pre-rollout memberships from a user's current department.

For existing data, profile duplicate purchases, overlapping assignments, missing acceptance/return dates, invalid useful lives/residuals, missing currencies/rates, and software terms without prices. Resolve duplicates before adding uniqueness constraints. Historical timestamp conversion must use an established source timezone and be reversible. Do not treat default foreign-currency exchange rates of 1 as proven historical rates.

## Application integration

| Layer            | Proposed changes                                                                                                                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Route            | Add `src/app/(app-shell)/(management)/financials/per-head/page.tsx` under the existing Financials guard, with a Suspense loading state.                                                                |
| Navigation       | Add Per-head Cost Analysis in `app-sidebar.tsx` and its title in `top-header.tsx`.                                                                                                                     |
| Validation       | Add `src/lib/validations/per-head-costs.ts` for bounded dates, person/group/category/pillar filters, sorting, and pagination. Validate identifiers and prohibit unbounded interactive queries.         |
| Calculation      | Add `src/lib/per-head-costs.ts` as a deterministic, clock-injected engine for intervals, allocation, rounding, and reconciliation.                                                                     |
| Repository       | Add `src/lib/data/per-head-costs-repo.ts` for source queries and group/person aggregation. Keep server-only data access out of client components.                                                      |
| Actions          | Add `src/actions/per-head-costs.ts` with `getPerHeadCostLedger`, `getPersonCostBreakdown`, `getPerHeadCostFilterOptions`, and a complete filtered export. Enforce Finance access on every entry point. |
| Types            | Extend `src/types/financials.ts` with person rows, component details, summary totals, source lineage, data-quality exceptions, and report metadata.                                                    |
| UI               | Add a financials feature component with period picker, summary cards, server-paginated people table, monthly trend, person drill-down, and export.                                                     |
| Source workflows | Capture financial term data during software registration/renewal, preserve membership changes, and record effective overhead groups for assets/repair expenses.                                        |

Suggested table columns: person, department/location, directly assigned assets, shared assets, software seats, physical depreciation, software usage cost, repair overhead, total period usage cost, current acquisition-value share, current book/carrying-value share, and data-quality status. Use drill-down or column visibility to keep the default table readable.

Summary cards should show allocated usage cost, overhead/unallocated cost, included people, average cost for included people, and current assigned value. Separate missing-data warnings from known zero cost. All filters apply on the server before grouping and pagination; summaries and exports use exactly the same filtered scope. Compute allocation denominators before applying person search/filtering, so searching for one employee cannot increase that employee's share. Fetch person detail lazily and avoid a query per person.

The external financial API currently returns asset-level purchase/depreciation information. Do not expose person-level financial information through it automatically. A future external endpoint requires an explicit scope and API contract.

## Delivery sequence and acceptance gates

1. **Financial correctness and data profiling.** Fix event currency normalization, establish a consistent recorded-FX policy, reconcile salvage inputs, and decide acquisition cardinality. Add regressions for mixed-currency repairs and missing/duplicate purchase rows. Exit when supported source expenses can be reconciled independently of this feature.
2. **Historical foundations.** Add effective memberships, asset cost-group policies, software terms/amendments, perpetual allocation life, audited configuration, and rollout coverage metadata. Bootstrap current memberships with an explicit rollout date and require administrators to review group mappings and prices. Exit when each supported source has dated allocation inputs or a visible exception.
3. **Allocation service.** Implement physical, shared, software, and repair calculations plus current value shares, metadata, and reconciliation. Compare deterministic fixtures and representative database queries. Exit when every known source amount balances and transfers/membership changes do not duplicate charges.
4. **Financials integration.** Build the people ledger, filters, trends, drill-down, complete CSV export, navigation, and access checks. Exit when detail, filtered summaries, and exports agree and unauthorized callers cannot access person costs.
5. **Rollout verification.** Exercise realistic datasets, inspect query plans, verify historical coverage messaging, and validate sample reports with Finance. Release the agreed full scope after all four cost paths work; intermediate development phases are not a reduced feature scope.

## Verification plan

- Physical intervals: transfers within a day, partial months, leap years, report boundaries, accepted/pending/rejected/cancelled assignments, actual returns, overdue assets, repair dispatch, disposal, and fully depreciated assets.
- Shared allocation: joins/leaves during a month, department/location changes, overlapping memberships, empty groups, cross-group memberships, missing mappings, and no usable history before rollout. Every expense takes one allocation path.
- Repairs: completed versus active/cancelled tickets, expense currency different from purchase currency, asset movement after the repair, and missing recognition/group/FX data.
- Software: monthly/annual terms, partial-seat allocation, revocation, expiry, renewal, price/seat-capacity amendments, unused-seat overhead, perpetual-life completion, free licences, and prevention of initial-purchase double counting.
- Reconciliation: exact source-to-allocation totals, deterministic rounding, no negative charges, known zero versus unknown, and stable allocation shares when narrowing person filters.
- Queries and access: real database integration tests for joins, constraints, and grouping; permission checks for every action/export; deterministic sorting and summaries across pages; complete exports beyond 1,000 rows; escaped names/emails.
- UI/workflow: monthly/custom ranges, current-value labels on historical reports, missing-data states, membership editing, software financial term entry, recalculation after corrections, and current Financials regressions.

Audit baseline executed successfully with `npm.cmd run test:run -- src/actions/financials.test.ts src/lib/depreciation.test.ts src/actions/assignments.test.ts src/actions/software.test.ts src/lib/auth/roles.test.ts src/components/features/financials/tco-ledger.test.tsx`: **6 test files, 81 tests passed**. These are existing unit/component tests with mocked data; they do not establish production data quality or validate the planned allocation engine.

## Defaults and the remaining data decision

The original planning questions have been answered. Acceptance-based custody, Asia/Colombo, and ownership-time proration were confirmed before implementation. Repair completion is the recognition date. Current values show both acquisition and book/carrying shares, separately from period expense. Average usage cost includes only people eligible during the selected period, even when another person currently holds the same asset.

A later read-only data audit found **162 assets** where the existing depreciation residual differs from the purchase salvage estimate. These values have not been overwritten. The existing asset residual remains the calculation input, and discrepancies are surfaced for review. A question was presented about whether the purchase estimate should remain historical information, become the authoritative residual, or be reviewed individually. No automatic reconciliation of these conflicts has been applied.

## Implemented behavior

- `/financials/per-head`: monthly/custom-range people ledger, asset/group filters, stable person search, sorting, server pagination, monthly cost chart, reconciliation totals, data-quality exceptions, and full filtered CSV export in LKR.
- Person drill-down: dated expense sources and currently allocated assets, including direct/shared/software shares and explicit unpriced current holdings.
- `/financials/per-head/configuration`: GlobalAdmin-only membership history, asset allocation policies, software coverage/pricing/seat terms, cost-basis corrections, and verified transaction-rate corrections. FinancialAuditor can read reports but cannot configure costs.
- Physical costs use monthly pools prorated by ownership/custody time. Software terms spread paid amounts across their dated coverage, with purchased-seat denominators. Perpetual software expense allocation does not alter its existing carried-at-cost book valuation.
- Shared group denominators are calculated before person filtering. The report separately exposes other people's allocations when searching, so the source total still reconciles.
- Recorded costs use LKR recognition and exact cent allocation in the per-head engine. Missing prices, rates, policy history, or ambiguous source records are surfaced rather than estimated.
- Software registration captures an initial priced term when coverage/life is available. Renewal preserves dated prices and seat counts. Missing perpetual life or legacy software prices require configuration rather than an invented default.
- Department synchronization preserves membership transitions. Disabling a user closes their open financial memberships. Reliable shared history begins at rollout; older direct custody can still be used when its timestamps are available.
- Report source reads use a repeatable-read, read-only database transaction. Detail lines are generated only for a requested person. Bulk reads avoid a query per employee.
- Existing financial ledgers now normalize repair currencies independently, use stored transaction FX for totals, avoid duplicate acquisition joins, and export every matching page with CSV escaping. Dashboard software estimates use paid terms; absent prices display as unknown. New asset registration persists the residual used by depreciation.
- The disposal review query now returns the model image and the wrapper forwards it to the review panel. Changing the selected request clears previously fetched details.

## Rollout and existing data

The application database was inspected using a PostgreSQL **read-only transaction**, which returned aggregate counts only. It had no duplicate purchase assets, assets without purchases, incomplete purchase dates/amounts, flagged purchase FX defaults, multiple open assignments, accepted assignments missing acceptance times, or incomplete completed-repair inputs. It did have the 162 residual/estimate discrepancies described above. The new maintenance FX column and membership-history tables were not yet present.

Before running this version against the application database:

1. Run `npm run financials:audit` to review the current source-data counts without changing data.
2. Apply migrations using `npm run db:migrate` through the normal deployment process. Migration `0004_financial_input_consistency` adds maintenance FX, fills LKR rates, and fills only unambiguous missing residuals. It preserves existing residuals and finalized disposal values. Migration `0005_per_head_financial_history` adds dated financial history and bootstraps current department memberships/location cost policies at rollout time.
3. Review asset group policies and add actual location memberships. No person-to-location history is inferred automatically.
4. Record legacy software paid terms and perpetual allocation lives. Verify historical non-LKR repair rates. Unknown inputs remain visible as incomplete until corrected.
5. Review representative reports with Finance before relying on their totals. Earlier shared-cost periods intentionally remain uncovered by newly created membership history.

Neither migration has been applied to the connected application database during this implementation. Additive migrations were applied and reapplied only to disposable local PostgreSQL clusters. No original conflict values or application records were changed by the read-only audit.

## Verification completed

- Full Vitest run: **229 files passed; 1,479 tests passed**. The seven database tests are skipped in the ordinary run unless an isolated test connection is supplied; they were executed successfully separately.
- Disposable PostgreSQL: **all six migrations applied twice successfully**, followed by **seven passing integration tests** covering mixed-currency TCO, source loading/allocation, dashboard consistency, overlap rejection, renewal history, missing prices, and department transitions.
- Production browser workflow: filtering, CSV download, person drill-down, actual admin cost correction, auditor read access, hidden configuration controls, and a 403 redirect for unauthorized configuration access all passed against isolated local data.
- `npm run check` passed, including repository lint and TypeScript. `npm run build` passed, including both new routes.
- Disposal regression tests: eight relevant action/component tests passed.

Reproduce the database checks with `npm run test:financial-db` using local PostgreSQL binaries on PATH (or set `POSTGRES_BIN`). After building, run `npm run test:financial-ui` for the browser workflow; it uses installed Edge on Windows by default, or `FINANCIAL_BROWSER_CHANNEL` to select an installed Playwright channel. Both commands create and remove their own temporary database and never use `DATABASE_URL`. Browser artifacts are written beneath the ignored `test-results/per-head/` directory.
