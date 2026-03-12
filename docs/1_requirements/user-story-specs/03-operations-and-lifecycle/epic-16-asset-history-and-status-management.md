# Epic 16: Asset History & Status Management

## Summary

This epic focuses on accountability and exception handling. It surfaces the raw data from the System Audit Log into a readable, chronological timeline for every individual asset. Furthermore, it provides Global Admins with the ability to manually override asset statuses for edge cases (e.g., "Lost" or "Stolen") via an inline dropdown, requiring mandatory justification notes. It also introduces a configuration engine to create bespoke company statuses.

## In Scope

- A vertical, chronological UI timeline embedded in the `History` tab of the Asset Details panel.
- An inline "Change Status" dropdown on status badges with mandatory justification notes.
- Backend state-machine rules preventing invalid status changes or workflow bypasses.
- A Custom Status Configuration settings page for creating new lifecycle states (e.g., "Pending Audit").
- CSV export capabilities specifically for an individual asset's history.

## Out of Scope / Limitations

- Editing History: The Audit Log is strictly append-only. No user, not even a Global Admin, can edit or delete a historical record.
- Complex Workflow Automation for Custom Statuses: Custom statuses act as visual flags and filters; they do not automatically trigger complex external workflows.

### User Stories

- [US-16.1 — Asset History Timeline & Export](https://app.clickup.com/t/86ewvp3vx)
- [US-16.2 — Manual Status Override](https://app.clickup.com/t/86ewvp3vy)
- [US-16.3 — Custom Status Configuration](https://app.clickup.com/t/86ewvp3w2)

---

## User Story: US-16.1 — Asset History Timeline & Export

- As an Auditor or Global Admin,
- I want to view the complete chronological history of a specific asset,
- So that I can see every assignment, return, and status change since it was purchased.

### Acceptance Criteria (Gherkin)

- Scenario: Viewing Asset History
  - Given an asset "Projector X" has moved between 3 rooms and been repaired twice
  - When I open its slide-out panel and click the `History` tab
  - Then I see a vertical timeline of events
  - And each event card displays the Timestamp, the Action (e.g., "Location Changed"), the Old Value, the New Value, and the Actor (Who changed it).
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/fd5b4128-c2cf-4fdb-badf-dcf136b20fd9/Asset%20History%20-%20Desktop.png)
- Scenario: Exporting the History
  - Given I am viewing the History tab for a laptop involved in an HR investigation
  - When I click the "Export CSV" button
  - Then the system generates and downloads a `.csv` file containing only the audit events for this specific `asset_id`.

### Technical Implementation Tasks

#### Frontend

- [ ] Build the vertical timeline React component for the `History` tab, rendering event cards with: Timestamp, Action type (color-coded), Old Value, New Value, and Actor.
- [ ] Implement the "Export CSV" button that sends the current asset ID to the backend export endpoint and triggers a browser file download.

#### Backend

- [ ] Create a `GET /api/v1/assets/{id}/history` endpoint to fetch, format, and chronologically sort asset-specific events from the global `AuditLogs` table.
- [ ] Create a `GET /api/v1/assets/{id}/history/export` endpoint that generates a CSV stream of the asset's audit history and returns it as a downloadable file.

---

## User Story: US-16.2 — Manual Status Override

- As a Global Admin,
- I want to manually update the status of an asset by clicking its status badge,
- But I want the system to hide complex statuses (like `Assigned` or `In Repair`) from this manual dropdown,
- So that the inventory reflects reality for edge cases (e.g., "Lost" or "Stolen") without allowing users to bypass mandatory data entry workflows for assignments or repairs.

### Acceptance Criteria (Gherkin)

- Scenario: Inline Badge Editing & Workflow Gating
  - Given I am viewing an asset in the registry or its slide-out panel
  - When I click directly on its current Status Badge (e.g., an `Available` pill)
  - Then an inline dropdown menu appears showing a list of permissible manual statuses (e.g., `Lost`, `Stolen`, and custom Admin-created statuses).
  - And workflow-dependent statuses (`Assigned`, `In Repair`, `Pending Review, Disposal`) are strictly hidden and cannot be manually selected.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/01ec4906-14fd-49bf-b528-86d5ff9463df/Asset%20status%20change.png)
- Scenario: Marking an Asset as Lost/Stolen
  - Given the inline status dropdown is open
  - When I select `Lost`
  - Then a modal interrupts the action, prompting for a mandatory "Reason/Note" (e.g., "Left in a taxi in London").
  - And upon saving, the badge updates to `Lost` and the asset is immediately removed from the active inventory pools.
  - And if it was previously assigned to a user, that assignment is formally closed in the background.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/dba44902-25da-4d2b-8fe6-4dc3113b6dd1/Asset%20Lost%20Note.png)
- Scenario: Invalid Status Reversion
  - Given an asset is currently marked as `Lost`
  - When I click the `Lost` badge and select `Available` (e.g., the item was found)
  - Then the system again requires a mandatory note (e.g., "Found at reception") before completing the state change.

### UI/UX Specifications & Constraints

- Interaction Design: The Status Badge should have a subtle hover state to indicate to the user that it is an interactive element.
- Mandatory Notes: The "Save" button in the justification modal must remain disabled until a sufficient note (e.g., > 10 characters) is entered.

### Technical Implementation Tasks

#### Frontend

- [ ] Build the interactive `StatusBadge` React component with a built-in inline dropdown menu activated on click, showing a subtle hover state on the badge.
- [ ] Write frontend filtering logic to populate the dropdown with only permissible manual statuses from a `PermissibleManualStates` config, hiding workflow-driven statuses.
- [ ] Build the "Status Change Justification" modal with a mandatory note text area (minimum 10 characters) and a conditionally disabled "Save" button.
- [ ] On successful save, update the badge color/text reactively without requiring a full page reload.

#### Backend

- [ ] Create a `PATCH /api/v1/assets/{id}/status` endpoint that validates the requested status transition against a state-machine rule set, requires a justification note, and writes to the Audit Log.
- [ ] Implement automatic side-effects: if the asset was `Assigned` and is being changed to `Lost`/`Stolen`, automatically close the active assignment record in the background.
- [ ] Return `422 Unprocessable Entity` for illegal transitions (e.g., manually setting status to `Assigned` or `In Repair`).

---

## User Story: US-16.3 — Custom Status Configuration

- As a Global Admin,
- I want to create my own custom lifecycle statuses,
- So that I can adapt the system to my company's specific terminology and internal auditing processes.

### Acceptance Criteria (Gherkin)

- Scenario: Configuring Custom Statuses
  - Given I am a Global Admin on the `Settings > Master Data` page
  - When I add a new custom status called "Pending Audit"
  - And I assign it a color code (e.g., Yellow)
  - Then the new status is saved to the database.
  - And it immediately becomes available in the manual "Change Status" dropdown across the entire system.
- Scenario: Native System Behavior
  - Given I have created the "Pending Audit" status
  - When I view the main Hardware registry
  - Then the custom status behaves identically to built-in statuses
  - And I can use it as a column filter, sort by it, and view it in standard reporting dashboards.

### Technical Implementation Tasks

#### Frontend

- [ ] Build the "Custom Status Configuration" UI page in Settings with a CRUD data grid: Status Name, Color Picker, Description, and actions (Edit / Delete).
- [ ] Update the global frontend status configuration to dynamically merge custom statuses from the API with the hardcoded system statuses, making them available in all dropdowns, filters, and badges.

#### Backend

- [ ] Create RESTful CRUD endpoints for custom statuses: `GET`, `POST`, `PUT`, `DELETE /api/v1/settings/statuses`.
- [ ] Update all backend validation logic to dynamically load and accept custom statuses alongside built-in statuses when validating status transitions.

#### Database

- [ ] Create a `CustomStatuses` table with columns: `id`, `name` (UNIQUE), `color` (hex), `description`, `is_active` (boolean), `created_by` (FK → Users), `created_at`, `updated_at`.