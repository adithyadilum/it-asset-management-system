# Epic 17: Disposal Requests

## Summary

This epic builds the initial queue and review workflow for retiring corporate hardware. It allows IT Operators to flag assets for disposal from the main registries or during a return check via a multi-asset intake modal, dropping them into a `Pending Disposal` queue. From there, authorized administrators (Global Admins) can review the asset's real-time depreciated book value and technician notes via a dynamic slide-out panel, and choose to either reject the request (putting the item back into circulation and reversing soft-deletes) or proceed to the final disposal execution phase.

## In Scope

- An "Initiate Disposal" intake modal capturing the technical reason and notes, supporting bulk selection (`createDisposalRequest`).
- The `Pending Disposal` data grid tab.
- A "Disposal Request Review" slide-out panel fetching dynamic real-time financial and warranty data (`getDisposalReviewDetails`).
- A "Reject Request" modal backed by strict Zod validation (`rejectDisposalSchema`) that handles status re-routing, soft-delete (`isArchived`) reversals, and conditional Maintenance Ticket creation.

## Out of Scope / Limitations

- Executing the Disposal: The final "Approve & Dispose" compliance form (where you upload the E-waste receipt) is pushed to Epic 18 to keep this sprint focused on the review process.
- Historical Ledger: The `Disposal History` tab is deferred to Epic 19.

---

### User Stories

- [US-17.1 — Flagging Assets for Disposal](#user-story-us-171--flagging-assets-for-disposal)
- [US-17.2 — The Disposal Review Panel](#user-story-us-172--the-disposal-review-panel)
- [US-17.3 — Rejecting a Disposal Request](#user-story-us-173--rejecting-a-disposal-request)

---

## User Story: US-17.1 — Flagging Assets for Disposal

- **As an** IT Operator,
- **I want** to flag broken or obsolete assets for disposal and provide my technician notes,
- **So that** the executive reviewer understands exactly why the item needs to be thrown away.

### Acceptance Criteria (Gherkin)

- **Scenario: Initiating a Bulk Disposal Request**
  - **Given** I am viewing the main Hardware Registry OR during the Epic 14 "Process Return" workflow
  - **When** I select one or more assets and trigger a disposal request
  - **Then** the `dispose-assets-request-dialog` modal interrupts the action.
  - **And** I am required to select a `Reason Category` (e.g., "Damaged Beyond Repair", "Obsolete") and provide a justification.

- **Scenario: Routing to the Pending Queue & Assignment Closure**
  - **Given** I complete the intake modal and click "Submit"
  - **When** the `createDisposalRequest` Server Action executes
  - **Then** the backend automatically terminates any active user assignments (`returnedDate = new Date()`).
  - **And** the asset's global status is updated to `Pending Disposal` inside an atomic transaction.
  - **And** an explicit Audit Log entry (`DISPOSAL_REQUESTED`) is written.
  - **And** it appears in the `Operations > Disposals` dashboard under the `Pending Disposal` tab.

### Technical Implementation Tasks

#### Frontend
- [x] Build the "Initiate Disposal" intake modal (`dispose-assets-request-dialog`) capturing reason and justification.
- [x] Build the `Operations > Disposals` layout component (`disposals-layout`) with the tab structure (`Pending Disposal`, `Disposal History`).
- [x] Configure the `Pending Disposal` data grid (`pending-disposals-grid`) to filter by `status === 'Pending Disposal'`.

#### Backend
- [x] Create the `createDisposalRequest` Server Action handling the atomic multi-table insertions (disposals, assets, assignments, systemAuditLogs).
- [x] Automatically dispatch the `disposal.requested` Webhook event.

#### Database
- [x] Create an `asset_disposals` table via Drizzle ORM mapping the requested details.

---

## User Story: US-17.2 — The Disposal Review Panel

- **As a** Global Admin,
- **I want** to click a pending request to view its technical justification alongside real-time financial data,
- **So that** I have the necessary context to authorize the write-off before the company loses money on it.

### Acceptance Criteria (Gherkin)

- **Scenario: Reviewing the Request Context & Dynamic Financials**
  - **Given** I am on the `Pending Disposal` tab
  - **When** I click the row for a requested laptop
  - **Then** the `disposal-review-panel` slides out from the right.
  - **And** the frontend triggers the `getDisposalReviewDetails` Server Action.
  - **And** the backend fetches the `asset_purchases` data and computes the real-time depreciated `Current Book Value` centrally via `getAssetFinancialVitals`.
  - **And** the warranty status is dynamically evaluated (`Valid` vs `Expired`) based on the current timestamp.

### Technical Implementation Tasks

#### Frontend
- [x] Build the "Disposal Request Review" slide-out panel displaying disposal context and a distinct financial summary block.
- [x] Add "Reject" (secondary style) and "Initiate Disposal" (destructive red) action buttons to the panel footer.

#### Backend
- [x] Create the `getDisposalReviewDetails` Server Action that aggregates disposal context alongside real-time financial book value computations.

---

## User Story: US-17.3 — Rejecting a Disposal Request

- **As a** Global Admin,
- **I want** to reject a disposal request, provide a reason, and manually assign the asset a new active status,
- **So that** assets that shouldn't be thrown away are securely routed back into the correct IT workflow, completely reverting the archival state.

### Acceptance Criteria (Gherkin)

- **Scenario: Step 1 - The Rejection Modal & Zod Validation**
  - **Given** I am reviewing an asset in the Disposal Request Review panel
  - **When** I click the "Reject" button
  - **Then** the `reject-disposal-dialog` opens.
  - **And** the `rejectDisposalSchema` strictly enforces that a Rejection Reason (>10 chars) and Fallback Status must be provided before submission.

- **Scenario: Step 2 - Reverting Soft Deletes & State Changes**
  - **Given** I select `Available` as the fallback status and click "Confirm Rejection"
  - **When** the `rejectDisposalRequest` backend transaction executes
  - **Then** the disposal request is marked as `Rejected`.
  - **And** the asset's global status becomes `Available`.
  - **And** the system explicitly reverses any soft-delete state (`isArchived: false`) returning the asset to active circulation.
  - **And** logs the `DISPOSAL_REJECTED` event in the Audit Log.

- **Scenario: Step 3 - Conditional Maintenance Ticketing**
  - **Given** I reject the disposal but select `In Repair` as the fallback status
  - **When** the backend transaction processes
  - **Then** the system automatically generates an `INTERNAL` ticket in the `maintenance_tickets` table
  - **And** seamlessly routes the asset into the Epic 15 Maintenance workflow.

### Technical Implementation Tasks

#### Frontend
- [x] Build the "Reject Disposal Request" modal integrating React Hook Form and Zod to conditionally disable the submit button until validation passes.

#### Backend
- [x] Create the `rejectDisposalRequest` Server Action managing atomic updates.
- [x] Enforce the strict soft-delete reversal (`isArchived: false`) inside the `assets` table.
- [x] Implement conditional logic: dynamically insert a new `maintenance_tickets` row if the admin selects the `In Repair` fallback status.