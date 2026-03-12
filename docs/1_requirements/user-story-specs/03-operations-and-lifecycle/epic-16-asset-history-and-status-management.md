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

- [ ] Build the vertical timeline React component for the `History` tab.
- [ ] Write a backend query (`GET /api/v1/assets/{id}/history`) to fetch, format, and chronologically sort asset-specific events from the global `AuditLogs` table.
- [ ] Implement the CSV generation utility for the targeted history payload.

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

- [ ] Build the interactive `StatusBadge` React component with a built-in dropdown menu.
- [ ] Write frontend filtering logic to map the available dropdown options based on a `PermissibleManualStates` enum.
- [ ] Build the intercepting "Status Change Justification" modal.
- [ ] Implement backend state-machine rules validating the payload.

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

- [ ] Create a `CustomStatuses` configuration table in the database.
- [ ] Build the "Custom Status Configuration" UI in Settings.
- [ ] Update the global frontend state and backend validation enums to dynamically merge these custom statuses with the hardcoded system statuses.