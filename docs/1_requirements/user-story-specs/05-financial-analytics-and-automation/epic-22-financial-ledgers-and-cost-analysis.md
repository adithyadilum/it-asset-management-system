# Epic 22: Financial Ledgers & Cost Analysis

## Summary

This epic builds a highly secured, dedicated sandbox for the Finance department. It automates the complex math required to track the true financial state of corporate hardware. It introduces a Straight-Line Depreciation engine to calculate real-time "Current Book Value," a Total Cost of Ownership (TCO) aggregator that factors in the cost of vendor repairs, and a Write-Offs ledger to reconcile e-waste salvage payouts.

## In Scope

- Role-Based Access Control (RBAC) specifically locking the `Financials` module to `FinanceAuditor` and `GlobalAdmin` roles.
- The `Depreciation Ledger` data grid and backend calculation engine.
- The `Total Cost of Ownership` (TCO) aggregation ledger.
- The `Salvage & Write-Offs` ledger for finalized asset reconciliation.
- Global CSV Export capabilities across all financial grids.

## Out of Scope / Limitations

- Complex Tax Integration: The system will not automatically push these ledgers into external corporate accounting software (like QuickBooks or SAP) in this phase.
- Non-Linear Depreciation: The calculation engine strictly uses Straight-Line depreciation based on project assumptions. Alternative models (like double-declining balance) are out of scope.

### User Stories

- [US-22.1 — Financial Module Security (RBAC)](#user-story-us-221--financial-module-security-rbac)
- [US-22.2 — The Depreciation Ledger](#user-story-us-222--the-depreciation-ledger)
- [US-22.3 — Total Cost of Ownership (TCO)](#user-story-us-223--total-cost-of-ownership-tco)
- [US-22.4 — Write-Offs & Salvage Ledger](#user-story-us-224--write-offs--salvage-ledger)

---

## User Story: US-22.1 — Financial Module Security (RBAC)

- As a System Architect,
- I want to strictly restrict access to the Financial Ledgers,
- So that standard IT Operators or basic users cannot view sensitive corporate capital expenditure and depreciation data.

### Acceptance Criteria (Gherkin)

- Scenario: Unauthorized Access Prevention
  - Given I am logged in as a standard `IT Operator`
  - When I look at the left-hand navigation sidebar
  - Then the `Financials` accordion menu (containing Depreciation Ledger, Total Cost of Ownership, and Salvage & Write-Offs) is completely hidden from the DOM.
  - And if I attempt to manually navigate to the corresponding URLs, the backend strictly returns a `403 Forbidden` error.

- Scenario: Authorized Access
  - Given I log in as a `Finance Auditor` or `Global Admin`
  - When I look at the sidebar
  - Then the `Financials` module is fully visible and accessible.

### Technical Implementation Tasks

#### Frontend

- [x] Update the global Sidebar component with conditional rendering: hide the `Financials` accordion menu entirely when `user.role` is not `FinanceAuditor` or `GlobalAdmin`.
- [x] Wrap all Financial module routes with role guards, redirecting unauthorized users to the 403 page.

#### Backend

- [x] Implement an `enforceFinanceAccess()` guard in the server actions (`getDepreciationLedger`, `getTCOLedger`, `getWriteOffsLedger`, `getAssetFinancialVitals`) to reject requests from non-authorized roles.

---

## User Story: US-22.2 — The Depreciation Ledger

- As a Finance Director,
- I want to view a ledger that automatically calculates the "Current Book Value" of all active hardware,
- So that I don't have to manually run straight-line depreciation formulas in Excel for thousands of assets during corporate tax reporting.

_Note: The depreciation calculations must be validated with the Finance Department before final implementation to ensure tax compliance._

### Acceptance Criteria (Gherkin)

- Scenario: Ledger Interface & Data Presentation
  - Given I navigate to `Financials > Depreciation Ledger`
  - Then I see a paginated data grid tailored for accountants.
  - And the columns display: `Asset ID`, `Category`, `Purchase Date`, `Original Purchase Price`, `Expected Lifespan`, and `Current Book Value`.

- Scenario: Automated Depreciation Calculation
  - Given a laptop was purchased for $1,400 with a 5-year expected lifespan
  - When I view its row in the grid
  - Then the backend automatically calculates and displays the active `Current Book Value` (e.g., $800) based on the time elapsed since the Purchase Date using Straight-Line Depreciation.

### Technical Implementation Tasks

#### Frontend

- [x] Build the `Depreciation Ledger` data grid UI with the specified columns and the financial toolbar.
- [x] Format financial values as localized currency strings in the grid cells.

#### Backend

- [x] Create a `getDepreciationLedger` server action with pagination, search, and category/age filters.
- [x] Exclude disposed assets (`status != 'Disposed'`) from active depreciation calculations.
- [x] Implement the Straight-Line Depreciation calculation (`calculateStraightLineDepreciation` math utility).

---

## User Story: US-22.3 — Total Cost of Ownership (TCO)

- As a Global Admin,
- I want to view the true cost of an asset (Base Cost + all historical Maintenance Costs),
- So that I can identify hardware models that cost more to fix than they are worth.

### Acceptance Criteria (Gherkin)

- Scenario: Accessing the TCO Ledger
  - Given I navigate to `Financials > Total Cost of Ownership`
  - Then I see a data grid with the following columns: `Asset ID`, `Category`, `Purchase Date`, `Original Purchase Price`, `Total Repair Costs`, and `Total TCO`.

- Scenario: TCO Mathematical Aggregation
  - Given an asset has an Original Purchase Price of $1,400
  - When it accumulates $300 in completed vendor repair tickets over its lifecycle
  - Then the Financials TCO Engine instantly aggregates these records.
  - And displays $300 under `Total Repair Costs` and dynamically updates the `Total TCO` column to $1,700.

### Technical Implementation Tasks

#### Frontend

- [x] Build the `Total Cost of Ownership` data grid UI with the specified columns and the financial toolbar.

#### Backend

- [x] Create a `getTCOLedger` endpoint that executes a SQL aggregation query joining the `assetPurchases.totalCost` with `SUM(maintenanceTickets.actualCost)` where ticket status is `COMPLETED`.
- [x] Support pagination, search, and filter (by cost ranges) on the TCO endpoint.

---

## User Story: US-22.4 — Write-Offs & Salvage Ledger

- As a Finance Director,
- I want to view a ledger of all permanently disposed assets alongside any cash recouped from e-waste recycling,
- So that I can accurately report write-offs and asset valuations at the time of disposal during corporate tax audits.

### Acceptance Criteria (Gherkin)

- Scenario: Viewing the Salvage Ledger
  - Given I navigate to `Financials > Salvage & Write-Offs`
  - Then I see a read-only grid listing only assets with a completed disposal.
  - And the columns strictly display: `Asset ID`, `Category`, `Disposal Date`, `Original Purchase Price`, `Book Value at Time of Disposal`, and `Salvage Value`.

- Scenario: Reconciling Salvage Value
  - Given an asset was disposed of, locking its `Book Value at Time of Disposal` at $300
  - When the IT team logged an $800 `Salvage Value` paid by the vendor or buyer during the disposal workflow
  - Then I can review these values side-by-side in the grid to calculate the final financial impact of the retirement.

### Technical Implementation Tasks

#### Frontend

- [x] Build the `Write-Offs & Salvage` data grid UI with the specified columns and the financial toolbar.

#### Backend

- [x] Create a `getWriteOffsLedger` endpoint fetching only assets where `assetDisposals.status === 'Completed'`.
- [x] Join the disposal record for `disposalDate` (`resolvedAt`), the locked `bookValueAtDisposal`, and the `actualSalvageValue`.

#### Database

- [x] Add the `actualSalvageValue` and `bookValueAtDisposal` decimal columns to the `assetDisposals` table to persist historical values at the exact moment of finalization.