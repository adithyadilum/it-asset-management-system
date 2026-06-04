# Epic 14: Asset Returns

## Summary

This epic governs the "Check-In" phase of the hardware lifecycle. It details the functionality of the `Assigned Assets` and `Returned Assets` tabs within the Operations dashboard. It provides globally accessible workflows to proactively recall equipment from users via Next.js Server Actions, log the physical receipt of the device, and enforce a strict "Condition Inspection" before routing the asset to its next lifecycle state (e.g., back to available inventory, into repair, or flagged for disposal).

## In Scope

- The `Assigned Assets` data grid tab, filtered to show only checked-out equipment.
- A "Request Return" action triggering an escalating reminder queue (Available globally on `Assigned` assets).
- A "Receive Asset" action moving items from the Assigned pool to a temporary Returned holding pool.
- The `Returned Assets` data grid tab for pending inspections.
- A "Process Return" triage modal requiring a condition assessment and next-status selection via Zod-validated server actions.
- Automated routing to `Available`, `In Repair`, or `Disposed` based on the triage result.

## Out of Scope / Limitations

- Maintenance Execution: Routing an item to `In Repair` is covered here, but managing the actual vendor repair ticket is handled in Epic 15.
- Notification Delivery: Triggering the return request queues an event, but the actual email delivery relies on the future Notification Engine.

---

### User Stories

- [US-14.1 — The Assigned Assets Tab](#user-story-us-141--the-assigned-assets-tab)
- [US-14.2 — Requesting an Asset Return (Recall)](#user-story-us-142--requesting-an-asset-return-recall)
- [US-14.3 — Receiving an Asset (Mark as Returned)](#user-story-us-143--receiving-an-asset-mark-as-returned)
- [US-14.4 — The Returned Assets Tab & Condition Check](#user-story-us-144--the-returned-assets-tab--condition-check)

---

## User Story: US-14.1 — The Assigned Assets Tab

- **As an** IT Operator,
- **I want** to view a dedicated list of all currently assigned hardware,
- **So that** I can easily search for an employee's name and see exactly what equipment they are holding.

### Acceptance Criteria (Gherkin)

- **Scenario: Accessing the Assigned Assets Grid**
  - **Given** I navigate to `Operations > Assignments & Returns`
  - **When** I click the `Assigned Assets` tab
  - **Then** the `getOperationsAssignmentsDataAction` explicitly returns data filtered for `Assigned` state.

- **Scenario: Viewing the Active Custodian**
  - **Given** I am on the `Assigned Assets` tab
  - **When** I click the row for a specific laptop (e.g., `LAP-HR-220`)
  - **Then** the Asset Details panel slides out
  - **And** the primary summary explicitly highlights the `Assigned to` field.

### Technical Implementation Tasks

#### Frontend
- [x] Configure the `Assigned Assets` data grid to automatically apply a `status=Assigned` filter to the API fetch.
- [x] Ensure the Asset Details slide-out panel correctly maps and prominently displays the active user relationship.

---

## User Story: US-14.2 — Requesting an Asset Return (Recall)

- **As an** IT Administrator,
- **I want** to click a button to formally request the return of an asset,
- **So that** the system automatically chases the employee with escalating reminders until they bring the device to the IT desk.

### Acceptance Criteria (Gherkin)

- **Scenario: Global Accessibility (Main Registry Trigger)**
  - **Given** I open the Asset Details panel for any asset with an `Assigned` status
  - **When** I look at the Quick Actions footer
  - **Then** the "Request Return" button is visible and active.

- **Scenario: Triggering the Return Request**
  - **Given** I click the "Request Return" action button
  - **When** the `requestAssetReturnAction` transaction processes
  - **Then** a confirmation toast appears: "Return requested successfully."
  - **And** the assignment record's internal state updates to explicitly mark the requested recall.

- **Scenario: Queueing the Notification**
  - **Given** I triggered a return request
  - **When** the transaction saves to the database
  - **Then** the backend automatically triggers `triggerReturnRequests`
  - **And** starts the 24/48/72-hour escalating reminder clock for the Employee Portal Notification queue.

### Technical Implementation Tasks

#### Frontend
- [x] Add a conditionally rendered "Request Return" button to the Asset Details panel footer.
- [x] Display a success confirmation toast upon successful return request submission.

#### Backend
- [x] Create the `requestAssetReturnAction` Server Action.
- [x] Implement the `triggerReturnRequests` repository logic integrating with the notification queue.

---

## User Story: US-14.3 — Receiving an Asset (Mark as Returned)

- **As an** IT Admin at the helpdesk,
- **I want** to mark an asset as "Returned" the moment an employee hands it to me,
- **So that** the employee is immediately cleared of responsibility, even if I don't have time to fully inspect the device yet.

### Acceptance Criteria (Gherkin)

- **Scenario: Global Accessibility & Custodian Release**
  - **Given** an employee drops off their assigned laptop
  - **When** I open its slide-out panel and click "Return"
  - **Then** the `markAssetReceivedAction` closes the active assignment record by setting `returned_date = now()`.

- **Scenario: Routing to the Holding Pool**
  - **Given** I just marked the asset received
  - **When** the database updates
  - **Then** the asset disappears from the `Assigned Assets` tab
  - **And** the status changes to `Returned`, surfacing it dynamically into the `Returned Assets` tab awaiting inspection.
  - **And** the backend dispatches a webhook (`assignment.returned`).

### Technical Implementation Tasks

#### Frontend
- [x] Add a conditionally rendered "Return" button to the Asset Details panel.
- [x] On successful return, refresh the Next.js cache (`revalidatePath`) to move the row.

#### Backend
- [x] Create the `markAssetReceivedAction` endpoint that closes the active assignment record and sets the status to `Returned`.
- [x] Wire up `dispatchAssignmentReturnedEvents`.

---

## User Story: US-14.4 — The Returned Assets Tab & Condition Check

- **As an** IT Operator,
- **I want** to review the items sitting in the "Returned Assets" pool and formally process them,
- **So that** I can document any physical damage and properly route the equipment to the repair queue or back to active inventory.

### Acceptance Criteria (Gherkin)

- **Scenario: Accessing Pending Returns**
  - **Given** I click the `Returned Assets` tab
  - **Then** I see a list of all assets explicitly in the `Returned` state awaiting condition triage.

- **Scenario: The Process Return Modal**
  - **Given** I am viewing the list of returned assets
  - **When** I click "Process Return"
  - **Then** the `ProcessReturnModal` opens allowing me to record the current physical condition (Good Working Condition, Needs Repair, Beyond Repair).

- **Scenario: Condition Assessment & Zod Validation**
  - **Given** I select "Needs Repair"
  - **When** I click Confirm without providing notes
  - **Then** the `processReturnPayloadSchema` intercepts the submission on the client and server.
  - **And** throws a required field error ensuring that detailed damage documentation is always provided for broken items.

- **Scenario: Status Routing & Audit Logging**
  - **Given** I submit a fully validated "Needs Repair" condition with notes "Cracked screen"
  - **When** the `processAssetReturnAction` transaction executes
  - **Then** the system automatically routes the asset Status from `Returned` to `In Repair`.
  - **And** the system generates an immutable `system_audit_logs` record detailing the previous state, new state, and the precise condition notes provided by the IT Operator.

### Technical Implementation Tasks

#### Frontend
- [x] Build the `ProcessReturnModal` component incorporating React Hook Form + Zod for validation.
- [x] Ensure "Confirm" cannot bypass the mandatory notes requirement when selecting negative conditions.

#### Backend
- [x] Create the `processAssetReturnAction` Server Action implementing state-machine logic.
- [x] Ensure the repository transaction appends the exact condition string and operator notes directly to the System Audit Log during the state transition.