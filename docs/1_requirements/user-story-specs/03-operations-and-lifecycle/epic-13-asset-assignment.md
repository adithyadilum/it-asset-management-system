# Epic 13: Asset Assignment

## Summary

This epic governs the core logistics of checking hardware in and out. It introduces a dedicated "Assignments & Returns" operational dashboard. From the "Available Assets" tab, IT Administrators can securely assign single or multiple assets to a specific User or a physical Location. To ensure data integrity, it includes strict UI gating to prevent double-booking, tracks temporary "loaner" equipment, and enables high-volume deployments via Zod-validated Bulk Assignment workflows.

## In Scope

- A dedicated `Operations > Assignments & Returns` dashboard with 3 tabs.
- An "Assign Asset" UI modal triggered from the slide-out panel (available in both the Operations dashboard and the main Registries).
- A Zod-validated Bulk Assignment workflow to assign multiple selected rows to a single user/location atomically.
- Searchable User and Location dropdowns driven by Master Data.
- State validation (UI gating and backend fail-safes) to prevent double-assignments.
- An optional "Expected Return Date" picker for temporary loaners.
- Automated Webhook dispatch (`assignment.created`, `assignment.returned`) upon assignment state changes.

## Out of Scope / Limitations

- Returns & Check-Ins: The "Assigned Assets" and "Returned Assets" tabs of the new dashboard will be fully detailed in Epic 14.
- Self-Service Requests: Employees cannot assign assets to themselves.

---

### User Stories

- [US-13.1 — The Operations Dashboard & Single Assignment](#user-story-us-131--the-operations-dashboard--single-assignment)
- [US-13.2 — Bulk Asset Assignment](#user-story-us-132--bulk-asset-assignment)
- [US-13.3 — The Assignment Modal & Allocation Types](#user-story-us-133--the-assignment-modal--allocation-types)
- [US-13.4 — UI State Gating & Conflict Prevention](#user-story-us-134--ui-state-gating--conflict-prevention)
- [US-13.5 — Pillar-Restricted Bulk Location Transfers](#user-story-us-135--pillar-restricted-bulk-location-transfers)

---

## User Story: US-13.1 — The Operations Dashboard & Single Assignment

- **As an** IT Operator,
- **I want** to use a dedicated Operations dashboard to view only available inventory and assign it to users,
- **So that** I don't have to sift through broken or already-assigned equipment in the main registry when trying to deploy new gear.

### Acceptance Criteria (Gherkin)

- **Scenario: Accessing the Operations Dashboard**
  - **Given** I navigate to `Operations > Assignments & Returns` from the left sidebar
  - **When** the page loads
  - **Then** I see a data grid with three tabs: `Available Assets`, `Assigned Assets`, and `Returned Assets`.
  - **And** the `Available Assets` tab is selected by default, strictly filtering the grid to `Status === 'Available'`.

- **Scenario: Triggering a Single Assignment**
  - **Given** I am on the `Available Assets` tab
  - **When** I click the row for "Lenovo Thinkpad T14"
  - **Then** the Asset Details panel slides out from the right
  - **And** I can click the primary "Assign" button in the bottom-right footer to launch the assignment modal.

- **Scenario: Global Accessibility (Main Registry Trigger)**
  - **Given** I am browsing the main `IT & Digital > Hardware` registry instead of the Operations dashboard
  - **When** I click an available asset to open its slide-out panel
  - **Then** the exact same "Assign" workflow is available to me there, ensuring I do not have to switch pages unnecessarily.

### Technical Implementation Tasks

#### Frontend

- [x] Build the `Assignments & Returns` layout component with the 3-tab navigation structure (Available Assets, Assigned Assets, Returned Assets).
- [x] Configure the `Available Assets` data grid to automatically apply a `status=Available` filter to the API fetch.
- [x] Add an "Assign" action button to the Asset Details panel footer, conditionally rendered only when `asset.status === 'Available'`.

#### Backend

- [x] Create a `getOperationsAssignmentsDataAction` Server Action that returns filtered asset data.

---

## User Story: US-13.2 — Bulk Asset Assignment

- **As an** IT Operations Admin,
- **I want** to select multiple available assets and assign them all to a single User or Location at once,
- **So that** I can rapidly deploy a batch of equipment (e.g., a laptop, monitor, and phone to a new hire) without filling out the assignment form three separate times.

### Acceptance Criteria (Gherkin)

- **Scenario: Multi-Select Bulk Assignment**
  - **Given** I am on the `Available Assets` tab
  - **When** I use the checkboxes to select 3 different rows (e.g., a Laptop, a Monitor, and a Keyboard)
  - **Then** a "Bulk Assign" option appears in the active Bulk Actions toolbar.
  - **When** I click it, the Assignment Modal opens showing a summary (e.g., "Assigning 3 Assets").
  - **And** when I select a User (e.g., "Jane Doe") and confirm, the `bulkAssignAssetsAction` processes all 3 assets instantly into an "Assigned" state within a single atomic database transaction.

- **Scenario: Bulk Assignment Notification Dispatch**
  - **Given** I bulk assign 3 assets to Jane Doe
  - **When** the database transaction commits successfully
  - **Then** the backend automatically triggers `dispatchWebhookEvent('assignment.created', ...)` for each newly generated assignment record.

### UI/UX Specifications & Constraints

- **Mixed Pillar Support:** Bulk assignment must support mixed pillars (e.g., assigning Hardware and Software simultaneously to the same user).

### Technical Implementation Tasks

#### Frontend

- [x] Add a "Bulk Assign" button to the Bulk Actions toolbar that only renders when `selectedRows > 1` and all selected rows have `status === 'Available'`.
- [x] Adapt the Assignment Modal to accept an array of asset IDs and display a summary header (e.g., "Assigning 3 Assets").

#### Backend

- [x] Create the `bulkAssignAssetsAction` that accepts an array of asset IDs and a target user/location, processing them atomically.
- [x] Integrate `dispatchWebhookEvent` to trigger Epic 12 Digital Acceptance notifications for each asset in the batch.
- [x] Implement Zod validation (`bulkAssignAssetsPayloadSchema`) for the bulk payload.

---

## User Story: US-13.3 — The Assignment Modal & Allocation Types

- **As a** Global Admin,
- **I want** to specify whether an item is going to a person or a physical room,
- **So that** portable devices track to an owner, but shared infrastructure (like a conference room TV) tracks to a location.

### Acceptance Criteria (Gherkin)

- **Scenario: Assigning to a User vs. Location**
  - **Given** I have opened the Assign Asset modal (for either a single or bulk operation)
  - **When** I toggle between the "User" or "Location" assignment type
  - **Then** the searchable dropdown updates its data source accordingly.
  - **And** selecting a User updates the `assignedToUserId` field, whereas selecting a Location updates the `assignedToLocationId` field.

- **Scenario: Temporary Loaner Tracking**
  - **Given** I am filling out the assignment modal
  - **When** I optionally select a date from the "Expected Return Date" calendar picker
  - **Then** that date is saved to the assignment record, allowing the Notification Engine to trigger return reminders later.

### Technical Implementation Tasks

#### Frontend

- [x] Build the "Assign Asset" modal with a "User" vs. "Location" toggle that dynamically switches the searchable dropdown data source.
- [x] Add an optional "Expected Return Date" date picker for temporary loaner assignments.

#### Backend

- [x] Create the `assignAssetAction` that accepts the Zod validated payload (`assignmentType`, `targetId`, `expectedReturnDate`, `notes`), updates the asset status to `Assigned`, and creates an Assignment record.

#### Database

- [x] Create an `asset_assignments` table with columns: `id`, `asset_id`, `state`, `assigned_to_user_id`, `assigned_to_location_id`, `assigned_by_id`, `expected_return_date`, `returned_date`, `created_at`.

---

## User Story: US-13.4 — UI State Gating & Conflict Prevention

- **As a** System Admin,
- **I want** the system UI to strictly block invalid assignment actions,
- **So that** I am physically prevented from double-booking a laptop.

### Acceptance Criteria (Gherkin)

- **Scenario: UI Button Visibility Gating**
  - **Given** I open the Asset Details panel for an item
  - **When** its Status is `Assigned`, `In Repair`, or `Lost`
  - **Then** the primary "Assign" button is completely hidden from the footer.

- **Scenario: Backend Race-Condition Fail-Safe**
  - **Given** two IT Admins have the same `Available` laptop open on their screens
  - **When** Admin A assigns it to Jane, and Admin B attempts to assign it to Mike a second later using their stale browser window
  - **Then** the backend `assignSingleAsset` repo function detects the state mismatch during the database transaction
  - **And** throws an `AssignmentServiceError` blocking Admin B's transaction.

### Technical Implementation Tasks

#### Frontend

- [x] Write frontend logic to conditionally hide/disable the "Assign" button based on `asset.status`: only show for `Available` status.
- [x] Display a user-friendly error toast when the Server Action returns a failure payload.

#### Backend

- [x] Implement optimistic concurrency control or row-level locking: before processing an assignment, verify `asset.status === 'Available'` within the same database transaction.
- [x] Throw an explicit `AssignmentServiceError` if the status has changed mid-flight.

---

## User Story: US-13.5 — Pillar-Restricted Bulk Location Transfers

- **As a** Facilities Manager,
- **I want** to mass-update the physical location of unassigned furniture or shared electronics,
- **But** I want the system to block this action for portable hardware and software, where location tracking behaves differently.

### Acceptance Criteria (Gherkin)

- **Scenario: Valid Bulk Location Transfer (Furniture/Electronics)**
  - **Given** I have selected 50 "Ergonomic Chairs" (Furniture) in the grid
  - **When** I click "Bulk Edit" and select a new Location (e.g., "Floor 4")
  - **Then** all 50 assets are updated to the new Location in a single backend transaction
  - **And** the System Audit Log records an individual Location Change event for each asset.

- **Scenario: Invalid Bulk Transfer (Portable Hardware)**
  - **Given** I have selected multiple "Laptops" or "Mobiles" in the Hardware grid
  - **When** I look at the Bulk Action toolbar
  - **Then** the "Change Location" option is disabled or hidden, because portable hardware location is dictated by its assigned User, not a fixed room.

- **Scenario: Invalid Bulk Transfer (Software)**
  - **Given** I have selected multiple records in the Software grid
  - **When** I look at the Bulk Action toolbar
  - **Then** the "Change Location" option is completely hidden, because digital assets do not have physical locations.

### Technical Implementation Tasks

#### Frontend

- [x] Update the Bulk Action toolbar logic to evaluate the `pillar` and `subcategory.isPortable` flag of selected rows: hide "Change Location" for Software and portable Hardware.
- [x] Build the "Change Location" bulk action modal with a searchable Location dropdown.

#### Backend

- [x] Create a `bulkUpdateAssets` endpoint (Epic 6 logic) that accepts an array of asset IDs and a target `location_id`, validates pillar constraints server-side, and writes individual Audit Log entries.
- [x] Enforce pillar validation server-side to reject incompatible state changes.
