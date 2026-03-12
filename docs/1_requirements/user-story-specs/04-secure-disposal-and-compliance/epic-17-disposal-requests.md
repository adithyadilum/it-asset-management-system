# Epic 17: Disposal Requests

## Summary

This epic builds the initial queue and review workflow for retiring corporate hardware. It allows IT Operators to flag assets for disposal from the main registries or during a return check via a small intake modal, dropping them into a `Pending Disposal` queue. From there, authorized administrators can review the asset's depreciated book value and technician notes, and choose to either reject the request (putting the item back into circulation) or proceed to the final disposal execution phase.

## In Scope

- An "Initiate Disposal" intake modal capturing the technical reason and notes.
- The `Pending Disposal` data grid tab.
- A "Disposal Request Review" slide-out panel displaying financial and warranty data.
- A "Reject Request" modal with mandatory justification and status re-routing.

## Out of Scope / Limitations

- Executing the Disposal: The final "Approve & Dispose" compliance form (where you upload the E-waste receipt) is pushed to Epic 18 to keep this sprint focused on the review process.
- Historical Ledger: The `Disposal History` tab is deferred to Epic 19.

### User Stories

- [US-17.1 — Flagging Assets for Disposal](https://app.clickup.com/t/86ewvrw7g)
- [US-17.2 — The Disposal Review Panel](https://app.clickup.com/t/86ewvrw8q)
- [US-17.3 — Rejecting a Disposal Request](https://app.clickup.com/t/86ewvrwam)

---

## User Story: US-17.1 — Flagging Assets for Disposal

- As an IT Operator,
- I want to flag a broken or obsolete asset for disposal and provide my technician notes,
- So that the executive reviewer understands exactly why the item needs to be thrown away.

### Acceptance Criteria (Gherkin)

- Scenario: Initiating a Disposal Request
  - Given I am viewing an asset in the main Hardware Registry OR during the Epic 14 "Process Return" workflow
  - When I attempt to change its status to `Pending Disposal`
  - Then a small "Initiate Disposal" modal interrupts the action.
  - And I am required to select a `Reason Category` (e.g., "Damaged Beyond Repair", "Obsolete") and type my `Technician Notes`.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/f68ed6c7-2f43-4b69-8c11-e79006d1421f/Review%20Returned%20Assets%20-%20Desktop.png)
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/00d03dec-c653-43df-bf4e-d8b7574f9cf6/Dashboard%20-%20Desktop.png)
- Scenario: Routing to the Pending Queue
  - Given I complete the intake modal and click "Submit"
  - Then the asset is immediately removed from the `Available` pool and locked from being assigned.
  - And it appears in the `Operations > Disposals` dashboard under the `Pending Disposal` tab.
  - And the data grid lists the asset with the `Reason` I selected and a badge tracking the `Days Pending`.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/49e1f47b-2a4a-4fa4-8617-3868872a7100/Asset%20Disposal%20Pending-%20Desktop.png)

### UI/UX Specifications & Constraints

- Modal Overlay: The intake modal must appear over a darkened, semi-transparent backdrop (`rgba(0,0,0,0.5)`) to lock focus and prevent interaction with the background grid.
- Input Validation: The `Technician Notes` text area should have a maximum character limit (e.g., 500 characters) with a visible character counter in the bottom right corner (e.g., `45/500`).
- Grid Badge Styling: The `Days Pending` column in the data grid should use a capsule-shaped badge. To draw attention to aging requests, implement dynamic color coding: a neutral/yellow outline for 1-14 days, and a solid red background for requests pending > 30 days.

### Technical Implementation Tasks

- [ ] Build the "Initiate Disposal" intake modal with character counting logic.
- [ ] Build the `Operations > Disposals` layout component with the 2-tab structure (`Pending Disposal`, `Disposal History`).
- [ ] Configure the data grid to filter by `status === 'Pending Disposal'` and calculate the `Days Pending` dynamically based on the timestamp of the status change.

---

## User Story: US-17.2 — The Disposal Review Panel

- As a Global Admin or Finance Manager,
- I want to click a pending request to view its technical justification and financial value,
- So that I have the necessary context to authorize the write-off before the company loses money on it.

### Acceptance Criteria (Gherkin)

- Scenario: Reviewing the Request Context
  - Given I am on the `Pending Disposal` tab
  - When I click the row for a requested laptop
  - Then the 700px "Disposal Request Review" panel slides out from the right.
  - And the panel displays the specific disposal context: `Requested By`, `Date Requested`, `Reason Category`, and the `Technician Notes` provided in US-17.1.
  - And a financial block displays the `Purchase Date`, `Original Cost`, `Current Book Value`, and `Warranty Status`.
  - And the footer contains actions to `Reject` or `Initiate Disposal`.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/31abb780-be75-48b0-ab23-360c9cbc76ae/Request%20Disposal%20Review-%20Desktop.png)

### UI/UX Specifications & Constraints

- Animation: The slide-out panel must animate smoothly from the right edge of the viewport (e.g., `transform: translateX(0)` over 300ms ease-in-out).
- Visual Hierarchy (Financial Block): The financial block is the most critical decision-making area. It should be separated from the general text by a subtle background color (e.g., `gray-50`) or distinct borders. The `Current Book Value` text must be weighted heavier (bold) than surrounding labels.
- Button Styling: The "Initiate Disposal" button is a destructive action that permanently alters financials. It must be styled with a high-contrast danger color (e.g., solid Red) to visually warn the user, while the "Reject" button should be a neutral, outlined, or secondary button.

### Technical Implementation Tasks

- [ ] Build the "Disposal Request Review" slide-out panel component applying the specified visual hierarchy and button colors.
- [ ] Ensure the backend API serving this panel aggregates the real-time depreciation value (Epic 5) so the `Current Book Value` is mathematically accurate.

---

## User Story: US-17.3 — Rejecting a Disposal Request

- As a Global Admin or Finance Manager,
- I want to reject a disposal request, provide a reason, and manually assign the asset a new active status,
- So that assets that shouldn't be thrown away are securely routed back into the correct IT workflow.

### Acceptance Criteria (Gherkin)

- Scenario: Step 1 - Triggering the Rejection
  - Given I am reviewing an asset in the Disposal Request Review panel
  - When I decide the asset holds too much value to be destroyed
  - And I click the secondary "Reject" button in the footer
  - Then the "Reject Disposal Request" modal opens.
- Scenario: Step 2 - Providing the Rejection Data
  - Given the Reject modal is open
  - When I type an explanation into the mandatory `Rejection Reason` text area (e.g., "Device is still under warranty. Initiate RMA.")
  - And I select a fallback state from the `Update Status To` dropdown (e.g., `In Repair`)
  - Then the "Confirm Rejection" button becomes clickable.
- Scenario: Step 3 - The System Response
  - Given I click "Confirm Rejection"
  - When the database processes the change
  - Then the asset is completely removed from the `Pending Disposal` queue.
  - And the asset's global status becomes the new state I selected (`In Repair`).
  - And the system logs the event and queues an alert to notify the original IT Operator that their request was denied.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/43696b11-a84c-481a-8a4f-1deed0300d3b/Request%20rejection-%20Desktop.png)

### UI/UX Specifications & Constraints

- Contextual Warning Text: The top of the modal must display a clear contextual warning confirming the action: "You are declining the disposal of \[Brand\] \[Model\] (\[Asset ID\])."
- Strict State Button Binding: The "Confirm Rejection" button must render in a visually disabled state (e.g., opacity 50%, unclickable, `cursor-not-allowed`) immediately upon opening. It only transitions to the active state (solid dark blue) once the `Rejection Reason` input length is > 10 characters AND a valid status is selected from the dropdown.
- Auto-Focus: Upon the modal rendering, the cursor should automatically focus inside the `Rejection Reason` text area to reduce friction.

### Technical Implementation Tasks

- [ ] Build the "Reject Disposal Request" modal with strict React state-binding to enforce the disabled button logic.
- [ ] Create an API endpoint (`POST /api/v1/assets/{id}/reject-disposal`) that applies the new selected status and writes the rejection reason into the asset's `AuditLogs`.
