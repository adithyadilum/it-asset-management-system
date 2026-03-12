# Epic 22: Financial Ledgers & Cost Analysis

## Summary

This epic builds a highly secured, dedicated sandbox for the Finance department. It automates the complex math required to track the true financial state of corporate hardware. It introduces a Straight-Line Depreciation engine to calculate real-time "Current Book Value," a Total Cost of Ownership (TCO) aggregator that factors in the cost of vendor repairs, and a Write-Offs ledger to reconcile e-waste salvage payouts.

## In Scope

- Role-Based Access Control (RBAC) specifically locking the `Financials` module to Finance and Global Admin roles.
- The `Depreciation Ledger` data grid and backend calculation engine.
- The `Total Cost of Ownership` (TCO) aggregation ledger.
- The `Salvage & Write-Offs` ledger for finalized asset reconciliation.
- Global CSV Export capabilities across all financial grids.

## Out of Scope / Limitations

- Complex Tax Integration: The system will not automatically push these ledgers into external corporate accounting software (like QuickBooks or SAP) in this phase.
- Non-Linear Depreciation: The calculation engine strictly uses Straight-Line depreciation based on project assumptions. Alternative models (like double-declining balance) are out of scope.

### User Stories

- [US-22.1 — Financial Module Security (RBAC)](https://app.clickup.com/t/86ewvyf4e)
- [US-22.2 — The Depreciation Ledger](https://app.clickup.com/t/86ewvyf6p)
- [US-22.3 — Total Cost of Ownership (TCO)](https://app.clickup.com/t/86ewvyfx7)
- [US-22.4 — Write-Offs & Salvage Ledger](https://app.clickup.com/t/86ewvyfzf)

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
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/c17c3572-f753-40d1-8973-2e26d44e2d53/IT%20operator%20Error%20403%20Screen-%20Desktop.png)
- Scenario: Authorized Access
  - Given I log in as a `Finance Manager` or `Global Admin`
  - When I look at the sidebar
  - Then the `Financials` module is fully visible and accessible.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/3b7f9479-b107-4d4c-8422-bb09d754b0c3/Depreciation%20Ledger%20-%20Desktop1.png)

### Technical Implementation Tasks

- [ ] Update the global Sidebar layout component with conditional rendering logic checking the user's JWT role payload.
- [ ] Write robust middleware on the backend to reject any API requests to financial ledger endpoints from non-authorized roles.

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
  - And the columns strictly display: `Asset ID`, `Category`, `Purchase Date`, `Original Purchase Price`, `Expected Lifespan`, and `Current Book Value`.
- Scenario: Automated Depreciation Calculation
  - Given a laptop was purchased for $1,400 with a 5-year expected lifespan
  - When I view its row in the grid
  - Then the backend automatically calculates and displays the active `Current Book Value` (e.g., $800) based on the time elapsed since the Purchase Date.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/6c325020-f8f3-408d-9cde-86850c1b85f0/Depreciation%20Ledger%20-%20Desktop.png)

### UI/UX Specifications & Constraints

- Financial Toolbar: The top of the grid must include a unified search bar, a `Filters` dropdown, and a prominent dark-blue `Export Log (CSV)` button aligned to the right.

### Technical Implementation Tasks

- [ ] Build the `Depreciation Ledger` data grid UI matching the specified columns.
- [ ] Write a dynamic SQL View or backend aggregation logic that calculates `Current Book Value` based on `(Original Purchase Price / Expected Lifespan) * Remaining Lifespan` relative to `CURRENT_DATE`.
- [ ] Wire the `Export Log (CSV)` button to the Epic 21 CSV generation engine.

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
  - When it accumulates $300 in vendor repair tickets over its lifecycle
  - Then the Financials TCO Engine instantly aggregates these records.
  - And displays $300 under `Total Repair Costs` and dynamically updates the `Total TCO` column to $1,700.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/d33a0ffa-13d3-47f9-9985-27997767fddf/Total%20Cost%20of%20Ownership%20(TCO)%20-%20Desktop.png)

### Technical Implementation Tasks

- [ ] Create the `Total Cost of Ownership (TCO)` UI tab with the search, filter, and export toolbar.
- [ ] Write a backend SQL aggregation query joining the `Assets` table (`Original Purchase Price`) with a `SUM(FinalCost)` from all `MaintenanceTickets` linked to that specific `asset_id` to generate the `Total Repair Costs` and `Total TCO` fields.

---

## User Story: US-22.4 — Write-Offs & Salvage Ledger

- As a Finance Director,
- I want to view a ledger of all permanently disposed assets alongside any cash recouped from e-waste recycling,
- So that I can accurately report write-offs and asset valuations at the time of disposal during corporate tax audits.

### Acceptance Criteria (Gherkin)

- Scenario: Viewing the Salvage Ledger
  - Given I navigate to `Financials > Salvage & Write-Offs`
  - Then I see a read-only grid listing only assets with a `Disposed` status.
  - And the columns strictly display: `Asset ID`, `Category`, `Disposal Date`, `Original Purchase Price`, `Book Value at Time of Disposal`, and `Salvage Value`.
- Scenario: Reconciling Salvage Value
  - Given an asset was disposed of, locking its `Book Value at Time of Disposal` at $300
  - When the IT team logged an $800 `Salvage Value` paid by the vendor or buyer during the disposal workflow
  - Then I can review these values side-by-side in the grid to calculate the final financial impact of the retirement.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/5af369c5-c595-4d57-ba07-1ffe9e900810/Write-Offs%20%26%20Salvage%20-%20Desktop.png)

### Technical Implementation Tasks

- [ ] Create the `Write-Offs & Salvage` UI tab with the search, filter, and export toolbar.
- [ ] Add a `salvage_value` numeric column to the Epic 18 Disposal payload and database schema.
- [ ] Write a backend query fetching only assets with the `Disposed` status, joining their locked depreciation value at the time of disposal and the `salvage_value`.
