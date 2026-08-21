# Epic 15: Maintenance & Repair

## Summary

This epic governs the lifecycle of broken or defective hardware. Accessed via a dedicated `Operations > Maintenance & Repairs` dashboard, it provides a 3-tab ledger system (`Pending Review`, `Active Repairs`, `Repair History`) to triage issues. It allows IT Operators to quickly resolve minor issues internally to return assets to the active pool, or formally dispatch assets to third-party vendors, logging RMAs, estimated costs, and final resolution notes to automatically aggregate the true Total Cost of Ownership (TCO).

## In Scope

- A dedicated `Maintenance & Repairs` dashboard with 3 distinct tabs.
- An "Issue Review" slide-out panel for triaging assets flagged from the registry or returns process.
- Dynamic Server-Side Financials (Current Book Value using Straight-Line Depreciation and TCO calculation).
- A "Resolve Internally" fast-track workflow returning assets to `Available`.
- An "Initiate Repair" workflow (Dispatch to Vendor) creating `VENDOR` tickets.
- A "Log Completed Repair" workflow that automatically updates the asset's active status (`Available` or `Disposed`), logs the actual cost, and dispatches webhooks.
- Read-only historical repair ledger globally and integrated into the Asset Details panel.

## Out of Scope / Limitations

- Employee Ticketing: Standard employees submitting the initial "Report Issue" tickets will be out of scope. For now, assets arrive in the `Pending Review` queue when manually flagged by Admins in the Registries or during the Epic 14 Return Triage.
- Predictive AI: The system does not automatically predict when an asset will break.

---

### User Stories

- [US-15.1 — The Pending Review Tab & Triage Panel](#user-story-us-151--the-pending-review-tab--triage-panel)
- [US-15.2 — Fast-Track: Resolve Internally](#user-story-us-152--fast-track-resolve-internally)
- [US-15.3 — Initiating a Vendor Repair](#user-story-us-153--initiating-a-vendor-repair)
- [US-15.4 — Active Repairs Tab & Logging Completion](#user-story-us-154--active-repairs-tab--logging-completion)
- [US-15.5 — Repair History Tab & Asset Details Integration](#user-story-us-155--repair-history-tab--asset-details-integration)

---

## User Story: US-15.1 — The Pending Review Tab & Triage Panel

- **As an** IT Operator,
- **I want** to view a queue of all assets flagged as broken, and open a triage panel to review the damage,
- **So that** I can assess the reported issue alongside the asset's current warranty status and book value before spending money on a repair.

### Acceptance Criteria (Gherkin)

- **Scenario: The User Journey (Accessing Pending Reviews)**
  - **Given** I navigate to `Operations > Maintenance & Repairs`
  - **When** the page loads
  - **Then** the `Pending Review` tab is selected by default.
  - **And** the `getPendingMaintenanceTickets` query returns assets with an active `INTERNAL` maintenance ticket.

- **Scenario: Opening the Issue Review Panel & Dynamic Financials**
  - **Given** I am on the `Pending Review` tab
  - **When** I click a row to open the "Issue Review" slide-out panel
  - **Then** the system calls the `getTicketForIssueReview` action
  - **And** dynamically calculates the `Current Book Value` using a straight-line depreciation formula based on the purchase date and useful life.
  - **And** calculates the cumulative `Total TCO` by adding previous repair costs.
  - **And** explicitly flags the Warranty Status as `Active` or `Expired`.

### Technical Implementation Tasks

#### Frontend

- [x] Build the 3-tab `MaintenanceShell` layout component (`Pending Review`, `Active Repairs`, `Repair History`).
- [x] Configure the `Pending Review` data grid to filter tickets.
- [x] Build the "Issue Review" slide-out panel displaying: reported issue, Original Cost, Current Book Value, and Warranty Status badge.

#### Backend

- [x] Create the `getPendingMaintenanceTickets` endpoint.
- [x] Create the `getTicketForIssueReview` Server Action utilizing `calculateStraightLineDepreciation` and dynamic SUM queries for historical repair costs.

---

## User Story: US-15.2 — Fast-Track: Resolve Internally

- **As an** IT Operator,
- **I want** to resolve minor issues (like software glitches) immediately without logging a formal vendor repair ticket,
- **So that** I can put the asset straight back into the `Available` pool without bloating the financial repair ledgers.

### Acceptance Criteria (Gherkin)

- **Scenario: Quick Resolution Routing & Atomic Updates**
  - **Given** I have the "Issue Review" panel open for a laptop
  - **When** I submit a "Resolution Note" via the "Resolve Internally" workflow
  - **Then** the `resolveIssueInternally` Server Action executes inside an atomic transaction.
  - **And** the asset's status changes directly to `Available`.
  - **And** any lingering user assignments linked to the asset are forcefully terminated (`returnedDate = now()`).
  - **And** the internal triage ticket is marked as `COMPLETED`.
  - **And** an explicit Audit Log entry (`MAINTENANCE_RESOLVED_INTERNALLY`) is written.

### Technical Implementation Tasks

#### Frontend

- [x] Build a quick confirmation dialog for the "Resolve Internally" action with a mandatory Zod-validated resolution note text area.

#### Backend

- [x] Create the `resolveIssueInternally` Server Action handling the atomic multi-table updates (assets, assignments, maintenanceTickets, systemAuditLogs).

---

## User Story: US-15.3 — Initiating a Vendor Repair

- **As an** IT Operations Admin,
- **I want** to formally dispatch a broken item to a third-party vendor,
- **So that** the system tracks the RMA ticket, the estimated cost, and the expected return date while the asset is off-premises.

### Acceptance Criteria (Gherkin)

- **Scenario: The Dispatch Modal & Validation**
  - **Given** I have the "Issue Review" panel open
  - **When** I click the primary "Initiate Repair" button
  - **Then** a "Send Asset for Repair" modal opens.
  - **And** the `initiateVendorRepairSchema` enforces that Vendor selection is mandatory.

- **Scenario: Submitting the Repair Ticket & Webhooks**
  - **Given** I fill out the RMA, Est Cost, and Vendor
  - **When** I click "Confirm & Dispatch"
  - **Then** the `initiateVendorRepair` action creates a new `VENDOR` ticket
  - **And** updates the asset status to `In Repair`.
  - **And** automatically fires the `maintenance.created` Webhook to notify external systems.

### Technical Implementation Tasks

#### Frontend

- [x] Build the "Send Asset for Repair" modal with: Vendor dropdown (searchable), RMA/Ticket Number input, Estimated Cost, Expected Return Date.

#### Backend

- [x] Create the `initiateVendorRepair` Server Action.
- [x] Ensure the transaction closes the internal triage ticket and creates the new Vendor-facing ticket atomically.
- [x] Dispatch `maintenance.created` webhook.

#### Database

- [x] Create a `maintenance_tickets` table via Drizzle ORM tracking types (`VENDOR`, `INTERNAL`), costs, and dates.

---

## User Story: US-15.4 — Active Repairs Tab & Logging Completion

- **As a** Global Admin,
- **I want** to close a repair ticket once the item returns from the vendor and log the actual final cost,
- **So that** the true repair expense is added to the asset's Total Cost of Ownership (TCO) and the asset is routed back to active inventory.

### Acceptance Criteria (Gherkin)

- **Scenario: Accessing the Active Repairs Grid**
  - **Given** I am on the `Maintenance & Repairs` dashboard
  - **When** I click the `Active Repairs` tab
  - **Then** the `getActiveRepairTickets` query returns tickets where `status = 'ACTIVE'` and `ticketType = 'VENDOR'`.

- **Scenario: Finalizing the TCO & Status Routing**
  - **Given** I submit the "Log Completed Repair" modal with a Final Cost of $200 and choose the next status `Available`
  - **When** the `completeRepairTicket` action executes
  - **Then** the ticket is marked `COMPLETED` and records the $200.
  - **And** the asset's global status becomes `Available`.
  - **And** active user assignments are safely closed (`returnedDate = now()`).
  - **And** the backend dispatches the `maintenance.completed` Webhook.

### Technical Implementation Tasks

#### Frontend

- [x] Configure the `Active Repairs` grid to display data from `getActiveRepairTickets`.
- [x] Build the "Log Completed Repair" modal (`LogCompleteRepairDialog`) collecting Actual Cost, Notes, and the `Update Status To` decision.

#### Backend

- [x] Create the `completeRepairTicket` Server Action handling the final cost logging, status transition, assignment cleanup, and webhook dispatching.

---

## User Story: US-15.5 — Repair History Tab & Asset Details Integration

- **As an** Auditor or IT Manager,
- **I want** to view a read-only historical ledger of all completed repairs both globally and on individual asset panels,
- **So that** I can identify "lemon" devices that break constantly and avoid buying that model in the future.

### Acceptance Criteria (Gherkin)

- **Scenario: Global Repair History Tab**
  - **Given** I navigate to `Operations > Maintenance & Repairs`
  - **When** I click the `Repair History` tab
  - **Then** the `getRepairHistory` action returns a paginated list of all `COMPLETED` tickets across the entire organization.

- **Scenario: Syncing with Epic 8 Asset Details Panel**
  - **Given** I am viewing the Asset Details panel for a specific laptop from any grid in the system
  - **When** I scroll down to the "Maintenance Records" section
  - **Then** the system calls `getAssetMaintenanceHistory`
  - **And** renders a chronological summary of specifically the past repairs tied to this single asset.

### Technical Implementation Tasks

#### Frontend

- [x] Configure the `Repair History` data grid to fetch completed `MaintenanceTickets` records.
- [x] Update the Epic 8 Asset Details panel to fetch and display data using `getAssetMaintenanceHistory`.

#### Backend

- [x] Create the `getRepairHistory` action for the global table.
- [x] Create the `getAssetMaintenanceHistory` action scoped strictly to an individual asset UUID.
