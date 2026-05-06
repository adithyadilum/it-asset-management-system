# Epic 14: Asset Returns

## Summary

This epic governs the "Check-In" phase of the hardware lifecycle. It details the functionality of the `Assigned Assets` and `Returned Assets` tabs within the Operations dashboard. It provides globally accessible workflows to proactively recall equipment from users, log the physical receipt of the device, and enforce a strict "Condition Inspection" before routing the asset to its next lifecycle state (e.g., back to available inventory, into repair, or flagged for disposal).

## In Scope

- The `Assigned Assets` data grid tab, filtered to show only checked-out equipment.
- A "Request Return" action triggering an escalating reminder queue (Available globally on `Assigned` assets).
- A "Receive Asset" action moving items from the Assigned pool to a temporary Returned holding pool (Available globally on `Assigned` assets).
- The `Returned Assets` data grid tab for pending inspections.
- A "Process Return" triage modal requiring a condition assessment and next-status selection.
- Automated routing to `Available`, `In Repair`, or `Disposed` based on the triage result.

## Out of Scope / Limitations

- Maintenance Execution: Routing an item to `In Repair` is covered here, but managing the actual vendor repair ticket is handled in Epic 15.
- Notification Delivery: Triggering the return request queues an event, but the actual email delivery relies on the future Notification Engine.

### User Stories

- [US-14.1 — The Assigned Assets Tab](https://app.clickup.com/t/86ewvnyq7)
- [US-14.2 — Requesting an Asset Return (Recall)](https://app.clickup.com/t/86ewvnyqk)
- [US-14.3 — Receiving an Asset (Mark as Returned)](https://app.clickup.com/t/86ewvnyqw)
- [US-14.4 — The Returned Assets Tab &  Condition Check](https://app.clickup.com/t/86ewvnyr6)

---

## User Story: US-14.1 — The Assigned Assets Tab

- As an IT Operator,
- I want to view a dedicated list of all currently assigned hardware,
- So that I can easily search for an employee's name and see exactly what equipment they are holding.

### Acceptance Criteria (Gherkin)

- Scenario: Accessing the Assigned Assets Grid
  - Given I navigate to `Operations > Assignments & Returns`
  - When I click the `Assigned Assets` tab
  - Then the data grid filters to only show assets with a status of `Assigned`.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/4cf5ebc5-5b37-4550-9abf-5b2778f586dd/Assigned%20Assets%20-%20Desktop.png)
- Scenario: Viewing the Active Custodian
  - Given I am on the `Assigned Assets` tab
  - When I click the row for a specific laptop (e.g., `LAP-HR-220`)
  - Then the Asset Details panel slides out
  - And the primary summary explicitly highlights the `Assigned to` field (e.g., "Mark Kim").
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/08dd6e71-9432-49ee-bc92-351990b729c6/Request%20Return%20for%20Single%20Asset-%20Desktop.png)

### Technical Implementation Tasks

#### Frontend

- [ ] Configure the `Assigned Assets` data grid to automatically apply a `status=Assigned` filter to the API fetch.
- [ ] Ensure the Asset Details slide-out panel correctly maps and prominently displays the active user relationship (`Assigned to` field).

---

## User Story: US-14.2 — Requesting an Asset Return (Recall)

- As an IT Administrator,
- I want to click a button to formally request the return of an asset,
- So that the system automatically chases the employee with escalating reminders until they bring the device to the IT desk.

### Acceptance Criteria (Gherkin)

- Scenario: Global Accessibility (Main Registry Trigger)
  - Given I open the Asset Details panel for any asset with an `Assigned` status, whether I am in the Operations dashboard OR the main Hardware registry
  - When I look at the Quick Actions footer
  - Then the "Request Return" button is visible and active.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/f195e152-3510-47bb-9c59-80af4791e768/Request%20Return%20for%20Single%20Asset-%20Desktop.png)
- Scenario: Triggering the Return Request
  - Given I click the "Request Return" action button
  - When the transaction processes
  - Then a confirmation toast appears: "Return requested successfully."
  - And the asset's sub-status or visual label in the grid updates to `Requested` to indicate an active recall.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/07f4cec7-b356-42f3-a03a-c72a4d49f88f/Request%20Return%20for%20Single%20Asset-%20Desktop%20(1).png)
- Scenario: Queueing the Notification
  - Given I triggered a return request
  - When the transaction saves to the database
  - Then the system queues an `URGENT_RETURN_REQUESTED` event for the Notification Engine
  - And starts the 24/48/72-hour escalating reminder clock until the asset is physically marked as received.

### Technical Implementation Tasks

#### Frontend

- [ ] Add a conditionally rendered "Request Return" button to the Asset Details panel footer (visible only when `status === 'Assigned'`).
- [ ] Display a success confirmation toast upon successful return request submission.
- [ ] Update the grid row's visual label to show a `Requested` sub-status badge after a return is requested.

#### Backend

- [ ] Create a `POST /api/v1/assets/{id}/request-return` endpoint that flags the assignment record with a `return_requested` status and queues an `URGENT_RETURN_REQUESTED` notification event.
- [ ] Integrate with the escalating reminder scheduler: enqueue 24h, 48h, and 72h reminder events upon return request creation.

---

## User Story: US-14.3 — Receiving an Asset (Mark as Returned)

- As an IT Admin at the helpdesk,
- I want to mark an asset as "Returned" the moment an employee hands it to me from any screen,
- So that the employee is immediately cleared of responsibility, even if I don't have time to fully inspect the device yet.

### Acceptance Criteria (Gherkin)

- Scenario: Global Accessibility & Custodian Release
  - Given an employee drops off their assigned laptop
  - When I open its slide-out panel from the `Assigned Assets` tab OR the main Hardware registry
  - And I click the primary "Return" button in the bottom right corner
  - Then the system formally ends the assignment record, removing the employee's name from the `Custodian` field.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/4448a408-f623-4917-91c2-96f0a9f2922c/Request%20Return%20for%20Multiple%20Asset-%20Desktop.png)
- Scenario: Routing to the Holding Pool
  - Given I just clicked "Return"
  - When the database updates
  - Then the asset disappears from the `Assigned Assets` tab (and updates its status in the main registries)
  - And reappears in the `Returned Assets` tab awaiting physical inspection.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/9c60fe8a-37da-4894-af8c-cfc8a76a49d2/Returned%20Assets%20-%20Desktop.png)

### Technical Implementation Tasks

#### Frontend

- [ ] Add a conditionally rendered "Return" button to the Asset Details panel footer (visible only when `status === 'Assigned'`).
- [ ] On successful return, refresh the data grid to remove the asset from the `Assigned Assets` tab and show it in `Returned Assets`.

#### Backend

- [ ] Create a `POST /api/v1/assets/{id}/receive` endpoint that closes the active assignment record (`actual_return_date = now()`), clears the custodian, updates the asset status to `Pending Review`, and cancels any pending return reminder events.

---

## User Story: US-14.4 — The Returned Assets Tab & Condition Check

- As an IT Operator,
- I want to review the items sitting in the "Returned Assets" pool and formally process them,
- So that I can document any physical damage and properly route the equipment to the repair queue or back to active inventory.

### Acceptance Criteria (Gherkin)

- Scenario: Accessing Pending Returns
  - Given I click the `Returned Assets` tab
  - Then I see a list of all assets that have been handed back but not yet inspected.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/10239775-d8d2-4743-ab3e-1760b8028c0e/Returned%20Assets%20-%20Desktop.png)
- Scenario: The Process Return Modal
  - Given I am viewing the list of returned assets.
  - When I click on any specific asset row.
  - Then a modal opens allowing me to record the current physical condition of that hardware.
  - And once I provide the status and any necessary notes, the system updates the asset record to reflect its new lifecycle state.
- Scenario: Condition Assessment & Status Routing
  - Given the Process Return modal is open
  - When I select one of the mandatory Condition radio buttons and click "Confirm"
  - Then the system automatically routes the asset based on my selection:
    - If Good Working Condition -> Status changes to `Available`.
    - If Working with Minor Issues OR Needs Repair -> Status changes to `In Repair` (or `Pending Maintenance`).
    - If Beyond Repair -> Status changes to `Disposed` (or `Pending Disposal`).
- Scenario: Logging Condition Notes
  - Given I select "Needs Repair"
  - When I type "Screen is heavily scratched" into the "Condition Notes" text area
  - Then those notes are permanently appended to the asset's System Audit Log along with the status change.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/23c4a021-21ae-4502-a94b-94a8a568a081/Review%20Condition.png)

### UI/UX Specifications & Constraints

- Mandatory Triage: The Process Return modal cannot be submitted until a condition radio button is selected.

### Technical Implementation Tasks

#### Frontend

- [ ] Build the "Process Return" modal with the 4 radio button condition options (Good Working Condition, Minor Issues, Needs Repair, Beyond Repair) and the "Condition Notes" text area.
- [ ] Implement form validation: "Confirm" button remains disabled until a condition radio is selected.

#### Backend

- [ ] Create a `POST /api/v1/assets/{id}/process-return` endpoint implementing the state-machine logic: automatically route the asset to `Available`, `Pending Maintenance`, or `Pending Disposal` based on the submitted condition enum.
- [ ] Append the condition notes and status change to the System Audit Log.
- [ ] If routed to `Pending Maintenance`, automatically create a stub record in the `MaintenanceTickets` table for the Epic 15 workflow.
