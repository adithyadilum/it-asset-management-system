# Epic 16: Asset History & Status Management

## Summary

This epic focuses on accountability and exception handling. It surfaces the raw data from the System Audit Log into a readable, chronological timeline for every individual asset. Furthermore, it provides Global Admins with the ability to manually override asset statuses for edge cases (e.g., "Lost" or "Stolen") via an inline dropdown, requiring mandatory justification notes. It also introduces a configuration engine to create bespoke company statuses, dynamically aggregating them with the built-in system overrides.

## In Scope

- A vertical, chronological UI timeline embedded in the `History` tab of the Asset Details panel.
- An inline "Change Status" dropdown on status badges with mandatory justification notes.
- Backend state-machine rules preventing invalid status changes or workflow bypasses.
- A Custom Status Configuration settings page for creating new lifecycle states (e.g., "Pending Audit") backed by Zod validation.
- Aggregation of hardcoded `MANUAL_OVERRIDE_STATUSES` with dynamic custom statuses.

## Out of Scope / Limitations

- Editing History: The Audit Log is strictly append-only. No user, not even a Global Admin, can edit or delete a historical record.
- Complex Workflow Automation for Custom Statuses: Custom statuses act as visual flags and filters; they do not automatically trigger complex external workflows like hardcoded statuses (e.g., `In Repair`) do.

---

### User Stories

- [US-16.1 — Asset History Timeline](#user-story-us-161--asset-history-timeline)
- [US-16.2 — Manual Status Override](#user-story-us-162--manual-status-override)
- [US-16.3 — Custom Status Configuration](#user-story-us-163--custom-status-configuration)

---

## User Story: US-16.1 — Asset History Timeline

- **As an** Auditor or Global Admin,
- **I want** to view the complete chronological history of a specific asset,
- **So that** I can see every assignment, return, and status change since it was purchased.

### Acceptance Criteria (Gherkin)

- **Scenario: Viewing Asset History**
  - **Given** an asset "Projector X" has moved between 3 rooms and been repaired twice
  - **When** I open its slide-out panel and click the `History` tab
  - **Then** I see a vertical timeline of events generated via `getAssetHistoryById`
  - **And** each event card securely maps the `system_audit_logs` raw data, displaying the Timestamp, the Action (e.g., `ASSET_UPDATED`), the Old Value, the New Value, and the Actor.

### Technical Implementation Tasks

#### Frontend

- [x] Build the vertical timeline React component for the `History` tab, rendering event cards parsing JSON diffs.

#### Backend

- [x] Create the `getAssetHistoryById` repository function that scopes the `system_audit_logs` specifically to `entityId = asset.id`.

---

## User Story: US-16.2 — Manual Status Override

- **As a** Global Admin,
- **I want** to manually update the status of an asset by clicking its status badge,
- **But** I want the system to hide complex statuses (like `Assigned` or `In Repair`) from this manual dropdown,
- **So that** the inventory reflects reality for edge cases (e.g., "Lost" or "Stolen") without allowing users to bypass mandatory data entry workflows for assignments or repairs.

### Acceptance Criteria (Gherkin)

- **Scenario: Inline Badge Editing & Aggregated Gating**
  - **Given** I am viewing an asset in the registry or its slide-out panel
  - **When** I click directly on its current Status Badge
  - **Then** an inline dropdown menu appears populated by `getManualOverrideStatuses`.
  - **And** the list safely aggregates hardcoded `MANUAL_OVERRIDE_STATUSES` with any active dynamic Custom Statuses.
  - **And** workflow-dependent statuses (`Assigned`, `In Repair`, `Pending Review`) are strictly hidden and cannot be manually selected.

- **Scenario: Marking an Asset as Lost/Stolen & Atomic Closures**
  - **Given** the inline status dropdown is open
  - **When** I select `Lost`
  - **Then** a modal interrupts the action, prompting for a mandatory "Reason/Note".
  - **And** upon saving, the `manualStatusOverrideAction` executes safely in a transaction.
  - **And** if it was previously assigned to a user, that assignment is formally closed in the background (`returnedDate = now()`).
  - **And** the exact justification note is permanently appended to the Audit Log.

- **Scenario: Invalid Status Reversion**
  - **Given** an asset is currently marked as `Lost`
  - **When** I click the `Lost` badge and select `Available`
  - **Then** the system again requires a mandatory note (e.g., "Found at reception") before allowing the Drizzle transaction to commit.

### Technical Implementation Tasks

#### Frontend

- [x] Build the interactive `StatusBadge` React component with a built-in inline dropdown menu.
- [x] Write frontend logic to fetch `getManualOverrideStatuses` to populate the options.
- [x] Build the "Status Change Justification" modal with a mandatory note text area.

#### Backend

- [x] Create the `getManualOverrideStatuses` Server Action combining hardcoded constants with the `customStatuses` database table.
- [x] Create the `manualStatusOverrideAction` that validates the requested status transition, requires a justification note, and writes to the Audit Log.
- [x] Implement automatic side-effects: if the asset was `Assigned` and is being changed forcefully, automatically close the active assignment record in the background.

---

## User Story: US-16.3 — Custom Status Configuration

- **As a** Global Admin,
- **I want** to create my own custom lifecycle statuses,
- **So that** I can adapt the system to my company's specific terminology and internal auditing processes.

### Acceptance Criteria (Gherkin)

- **Scenario: Configuring Custom Statuses**
  - **Given** I am a Global Admin on the `Settings > Master Data` page
  - **When** I add a new custom status via the `createCustomStatus` Server Action
  - **And** I provide a Name, Color Theme, and Icon
  - **Then** the `customStatusSchema` validates the input via Zod.
  - **And** the status is saved to the Postgres database.
  - **And** it immediately becomes available globally in the `getManualOverrideStatuses` dropdown list.

- **Scenario: Unique Constraint Prevention**
  - **Given** a custom status named "Pending Audit" already exists
  - **When** I attempt to create another status with the exact same name
  - **Then** the backend intercepts the Postgres unique constraint violation (`23505`)
  - **And** safely returns a UI error: "A status with this name already exists."

- **Scenario: Native System Behavior**
  - **Given** I have created the "Pending Audit" status
  - **When** I view the main Hardware registry
  - **Then** the custom status behaves identically to built-in statuses
  - **And** I can use it as a column filter, sort by it, and view its assigned Color Theme and Icon on the frontend badges.

### Technical Implementation Tasks

#### Frontend

- [x] Build the "Custom Status Configuration" UI page in Settings with a CRUD data grid.
- [x] Update the global frontend status configuration to dynamically render `Color Theme` and `Icon` from custom definitions.

#### Backend

- [x] Create `getCustomStatuses`, `createCustomStatus`, and `deleteCustomStatus` Server Actions.
- [x] Implement `customStatusSchema` Zod validation for secure creation payloads.
- [x] Explicitly catch Postgres `23505` error codes to prevent application crashes on duplicate names.

#### Database

- [x] Create a `customStatuses` table via Drizzle ORM with columns: `id`, `name` (UNIQUE), `iconName`, `colorTheme`, `isActive`, `createdById`, `createdAt`.
