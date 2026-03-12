# Epic 15: Maintenance & Repair

## Summary

This epic governs the lifecycle of broken or defective hardware. Accessed via a dedicated `Operations > Maintenance & Repairs` dashboard, it provides a 3-tab ledger system (`Pending Review`, `Active Repairs`, `Repair History`) to triage issues. It allows IT Operators to quickly resolve minor issues internally to return assets to the active pool, or formally dispatch assets to third-party vendors, logging RMAs, estimated costs, and final resolution notes to calculate the true Total Cost of Ownership.

## In Scope

- A dedicated `Maintenance & Repairs` dashboard with 3 distinct tabs.
- An "Issue Review" slide-out panel for triaging assets flagged from the registry or returns process.
- A "Resolve Internally" fast-track workflow.
- An "Initiate Repair" workflow (Dispatch to Vendor) with a dedicated data modal.
- A "Log Completed Repair" workflow that automatically updates the asset's active status and historical maintenance records.
- Read-only historical repair ledger.

## Out of Scope / Limitations

- Employee Ticketing: Standard employees submitting the initial "Report Issue" tickets will be out of scope. For now, assets arrive in the `Pending Review` queue when manually flagged by Admins in the Registries or during the Epic 14 Return Triage.
- Predictive AI: The system does not automatically predict when an asset will break.

### User Stories

- [US-15.1 — The Pending Review Tab & Triage Panel](https://app.clickup.com/t/86ewvp1bq)
- [US-15.2 — Fast-Track: Resolve Internally](https://app.clickup.com/t/86ewvp1bt)
- [US-15.3 — Initiating a Vendor Repair](https://app.clickup.com/t/86ewvp1bz)
- [US-15.4 — Active Repairs Tab & Logging Completion](https://app.clickup.com/t/86ewvp1c1)
- [US-15.5 — Repair History Tab & Asset Details Integration](https://app.clickup.com/t/86ewvp1c7)

---

## User Story: US-15.1 — The Pending Review Tab & Triage Panel

- As an IT Operator,
- I want to view a queue of all assets flagged as broken, and open a triage panel to review the damage,
- So that I can assess the reported issue alongside the asset's current warranty status before spending money on a repair.

### Acceptance Criteria (Gherkin)

- Scenario: The User Journey (Accessing Pending Reviews)
  - Given I navigate to `Operations > Maintenance & Repairs`
  - When the page loads
  - Then the `Pending Review` tab is selected by default.
  - And the grid displays all assets currently flagged as `Pending Maintenance` or `Defective`, including columns for `Reported By`, `Issue`, and `Date Reported`.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/2df9b20a-1bd1-4468-a1a5-7b506e565624/Maintenance%20and%20Repairs%20Pending%20-%20Desktop.png)
- Scenario: Opening the Issue Review Panel
  - Given I am on the `Pending Review` tab
  - When I click the row for a "MacBook Pro 16"
  - Then the 700px "Issue Review" panel slides out from the right.
  - And the panel displays the user's reported issue (e.g., "Screen flickering"), the Purchase Date, Original Cost, Current Book Value, and a highlighted Warranty Status badge.
  - And the footer contains two primary action buttons: `Resolve Internally` and `Initiate Repair`.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/092faa9b-af6d-4012-b8cc-3a63423b99d3/Maintenance%20and%20Repairs%20Pending%20-%20Desktop%20(1).png)

### UI/UX Specifications & Constraints

- Warranty Highlighting: The `Warranty Status` badge must use strong color coding (e.g., Red outline for "Expired", Green outline for "Active") so the operator knows immediately if the repair will cost the company money.

### Technical Implementation Tasks

#### Frontend

- [ ] Build the 3-tab `Maintenance & Repairs` layout component (Pending Review, Active Repairs, Repair History).
- [ ] Configure the `Pending Review` data grid to filter assets by `Pending Maintenance` / `Defective` status, displaying columns: Asset ID, Model, Reported By, Issue, Date Reported.
- [ ] Build the "Issue Review" slide-out panel displaying: reported issue, Purchase Date, Original Cost, Current Book Value, and Warranty Status badge (color-coded: Green=Active, Red=Expired).
- [ ] Add `Resolve Internally` and `Initiate Repair` action buttons to the panel footer.

#### Backend

- [ ] Create a `GET /api/v1/maintenance/pending` endpoint returning assets filtered by maintenance-related statuses, including aggregated financial and warranty data.

---

## User Story: US-15.2 — Fast-Track: Resolve Internally

- As an IT Operator,
- I want to resolve minor issues (like software glitches) immediately without logging a formal vendor repair ticket,
- So that I can put the asset straight back into the `Available` pool without bloating the financial repair ledgers.

### Acceptance Criteria (Gherkin)

- Scenario: Quick Resolution Routing
  - Given I have the "Issue Review" panel open for a laptop
  - When I click the "Resolve Internally" button in the footer
  - Then the system prompts me for a quick "Resolution Note" (e.g., "Reinstalled graphics driver").
  - And upon submission, the asset's status is immediately changed to `Available`.
  - And the asset is removed from the `Pending Review` queue entirely.
  - And the event is logged in the `System Audit Log` and the asset's `Maintenance Records` section.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/0546e31e-eb4a-4473-a3d8-d09eaf2e77cd/Maintenance%20and%20Repairs%20Pending%20-%20Desktop%20(2).png)

### Technical Implementation Tasks

#### Frontend

- [ ] Build a quick confirmation dialog for the "Resolve Internally" action with a mandatory resolution note text area.

#### Backend

- [ ] Create a `POST /api/v1/assets/{id}/resolve-internal` endpoint that: updates the asset status to `Available`, creates a maintenance record with `resolution_type: 'Internal'`, and writes an event to the System Audit Log.

---

## User Story: US-15.3 — Initiating a Vendor Repair

- As an IT Operations Admin,
- I want to formally dispatch a broken item to a third-party vendor,
- So that the system tracks the RMA ticket, the estimated cost, and the expected return date while the asset is off-premises.

### Acceptance Criteria (Gherkin)

- Scenario: The Dispatch Modal
  - Given I have the "Issue Review" panel open
  - When I click the primary "Initiate Repair" button
  - Then a "Send Asset for Repair" modal opens over the screen.
- Scenario: Submitting the Repair Ticket
  - Given the "Send Asset for Repair" modal is open
  - When I select a Vendor from the dropdown, enter an `RMA / Ticket Number`, an `Estimated Cost`, and an `Expected Return Date`
  - And I click "Confirm & Dispatch"
  - Then the asset's status updates to `In Repair`.
  - And it vanishes from the `Pending Review` tab and moves into the `Active Repairs` tab.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/276dea60-9908-4b60-a16a-659786812d11/Maintenance%20and%20Repairs%20Pending%20-%20Desktop%20(3).png)

### UI/UX Specifications & Constraints

- Mandatory Fields: Vendor selection and RMA/Ticket Number must be strictly required (`NOT NULL`) to prevent untrackable "ghost" hardware leaving the building.

### Technical Implementation Tasks

#### Frontend

- [ ] Build the "Send Asset for Repair" modal with: Vendor dropdown (searchable), RMA/Ticket Number input (required), Estimated Cost input, Expected Return Date picker.
- [ ] Implement form validation: `Confirm & Dispatch` button disabled until Vendor and RMA are filled.

#### Backend

- [ ] Create a `POST /api/v1/maintenance/dispatch` endpoint that: creates a `MaintenanceTicket` record, updates the asset status to `In Repair`, and writes an Audit Log entry.

#### Database

- [ ] Create a `MaintenanceTickets` table with columns: `id`, `asset_id` (FK → Assets), `ticket_type` (ENUM: VENDOR, INTERNAL), `vendor_name`, `rma_number`, `reported_issue`, `resolution_notes`, `estimated_cost`, `actual_cost`, `estimated_return_date`, `actual_completion_date`, `status` (ENUM: ACTIVE, COMPLETED, CANCELLED), `dispatched_by` (FK → Users), `created_at`, `updated_at`.

---

## User Story: US-15.4 — Active Repairs Tab & Logging Completion

- As a Global Admin,
- I want to close a repair ticket once the item returns from the vendor and log the actual final cost,
- So that the true repair expense is added to the asset's Total Cost of Ownership (TCO) and the asset is routed back to active inventory.

### Acceptance Criteria (Gherkin)

- Scenario: Accessing the Active Repairs Grid
  - Given I am on the `Maintenance & Repairs` dashboard
  - When I click the `Active Repairs` tab
  - Then I see a grid of all assets currently off-site, displaying the Vendor, RMA Ticket #, Est. Return Date, and Est. Cost.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/1db8f817-06cd-4237-b7e4-3a45ecf259a0/Maintenance%20and%20Repairs%20Active%20-%20Desktop.png)
- Scenario: The Completion Modal & Status Routing
  - Given I click a row in the `Active Repairs` tab to open the details panel
  - When I click the action button to log the repair
  - Then the "Log Completed Repair" modal appears.
  - And I am required to enter the `Actual Final Cost`, `Resolution Notes`, and select the `Update Status To` state (e.g., `Available` or `Disposed`).
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/4fd8bcea-0b39-4d40-8a19-c9a4ba3ffafd/Maintenance%20and%20Repairs%20Active%20-%20Desktop%20(1).png)
- Scenario: Finalizing the TCO
  - Given I submit the "Log Completed Repair" modal with a Final Cost of $200
  - When the database commits the transaction
  - Then the asset moves out of the `Active Repairs` tab and into the `Repair History` tab.
  - And the $200 is automatically added to the asset's cumulative maintenance cost data.

### Technical Implementation Tasks

#### Frontend

- [ ] Configure the `Active Repairs` grid to display data from `MaintenanceTickets` where `status = 'Active'`, showing: Vendor, RMA, Est. Return Date, Est. Cost.
- [ ] Build the "Log Completed Repair" modal with: Actual Final Cost input, Resolution Notes text area, and "Update Status To" dropdown (Available, Disposed).

#### Backend

- [ ] Create a `POST /api/v1/maintenance/{ticketId}/complete` endpoint that: updates the ticket status to `Completed`, records actual cost and resolution notes, updates the parent asset's global status to the selected value, and aggregates the `actual_cost` into the asset's cumulative maintenance cost.

---

## User Story: US-15.5 — Repair History Tab & Asset Details Integration

- As an Auditor or IT Manager,
- I want to view a read-only historical ledger of all completed repairs both globally and on individual asset panels,
- So that I can identify "lemon" devices that break constantly and avoid buying that model in the future.

### Acceptance Criteria (Gherkin)

- Scenario: Global Repair History Tab
  - Given I navigate to `Operations > Maintenance & Repairs`
  - When I click the `Repair History` tab
  - Then I see a read-only, chronological grid of every completed repair across the entire company, including Resolution Date, Final Cost, and Notes.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/7c6852a7-0fc0-40ac-90ab-6f7fb3341768/Maintenance%20and%20Repairs%20History%20-%20Desktop.png)
- Scenario: Syncing with Epic 8 Asset Details Panel
  - Given I am viewing the Asset Details panel for a specific laptop from any grid in the system
  - When I scroll down to the "Maintenance Records" section
  - Then I see a condensed, read-only list of the past repairs specifically tied to this asset (e.g., "07/09/2025: GPU Replaced", "01/02/2025: Serviced").
  - And the "Note" text displayed here accurately reflects the `Resolution Notes` entered during the Epic 15 "Log Completed Repair" or "Resolve Internally" workflows.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/487e958a-10ca-43fd-a4b7-aaa9a87400a3/Asset%20Details%20(Assigned)-%20Desktop%20(1).png)

### Technical Implementation Tasks

#### Frontend

- [ ] Configure the `Repair History` data grid to fetch completed `MaintenanceTickets` records, displaying: Asset ID, Vendor, Resolution Date, Final Cost, Resolution Notes.
- [ ] Update the Epic 8 `AssetDetailsPanel` component to fetch and display the 3 most recent maintenance records from the `MaintenanceTickets` table for the selected asset.

#### Backend

- [ ] Create a `GET /api/v1/maintenance/history` endpoint with pagination and filtering support (by date range, vendor, cost range).
- [ ] Ensure the existing `GET /api/v1/assets/{id}/maintenance` endpoint returns both vendor and internal resolution records.
