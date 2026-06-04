# Epic 8: Asset Details View

## Summary

This epic focuses on the "Read" and "Interact" portion of an individual asset's lifecycle. It introduces a comprehensive Right-Side Slide-Out Panel triggered by clicking any row in the data grids. By tailoring the panel's internal tabs (`Asset Details`, `Technical Details`, `Purchase Details`, `History`) to the specific pillar of the selected asset, the system ensures IT Operators and Facilities Managers only see data relevant to their exact domain.

The panel acts as the operational hub for single assets, integrating data fetched dynamically via the `asset-details-repo`, inline editing capabilities, and Global Admin manual status overrides.

## In Scope

- A right-side slide-out panel managed by URL query parameters (e.g., `?panel=record&id=LAP-001`) enabling shareable links and rapid row switching.
- A top-level tab navigation structure.
- A primary "Asset Details" summary view featuring a device image, status badge, 2-column data grid, and recent Maintenance/Disposal Records.
- A "QR Code" icon button located in the Asset Details grid.
- Distinct, pillar-specific tab layouts for Hardware, Software, Furniture, and Electronics.
- Quick Action functionality (e.g., Inline Details Editing, Manual Status Overrides).

## Out of Scope / Limitations

- Generating or printing the QR codes (Covered in Epic 9).
- The full execution of Maintenance ticketing (This is a separate Operations Epic; this UI merely displays the summary).
- Modifying the Audit History is strictly prohibited (Read-Only).

---

### User Stories

- [US-8.1 — Slide-Out Panel & URL Navigation](#user-story-us-81--slide-out-panel--url-navigation)
- [US-8.2 — Hardware Asset Profile & Inline Editing](#user-story-us-82--hardware-asset-profile--inline-editing)
- [US-8.3 — Software Asset Profile & Allocations](#user-story-us-83--software-asset-profile--allocations)
- [US-8.4 — Furniture & Fixtures Profile](#user-story-us-84--furniture--fixtures-profile)
- [US-8.5 — Office Electronics Profile](#user-story-us-85--office-electronics-profile)
- [US-8.6 — Purchase Details & History Mechanics](#user-story-us-86--purchase-details--history-mechanics)
- [US-8.7 — Global Admin Manual Status Override](#user-story-us-87--global-admin-manual-status-override)

---

## User Story: US-8.1 — Slide-Out Panel & URL Navigation

- **As a** System User,
- **I want** to click on a grid row to open a standardized Slide-Out Panel that stays open while I click around the grid,
- **So that** I can rapidly audit multiple assets one after the other by watching the panel dynamically update, without having to constantly open and close it.

### Acceptance Criteria (Gherkin)

- **Scenario: URL Query Parameter State Management**
  - **Given** I click the row for "LAP-001" in the Hardware registry
  - **When** the Slide-Out Panel opens
  - **Then** the browser URL updates to `?panel=record&id=LAP-001`
  - **And** I can copy/paste this exact link to a coworker, and the panel will automatically open for them upon loading the page.

- **Scenario: Dynamic Row Switching (Rapid Auditing)**
  - **Given** the slide-out panel is currently open and displaying data for "LAP-001"
  - **When** I click a different row (e.g., "LAP-002") in the adjacent data grid
  - **Then** the URL updates to `?id=LAP-002`
  - **And** the panel instantly hot-swaps to display the details, tabs, and history of the newly selected asset via a fresh `getAssetDetailsById` query.

- **Scenario: Route-Based Redirection (`/[assetId]`)**
  - **Given** I navigate directly to `/assets/LAP-001`
  - **When** the page router resolves the request
  - **Then** the backend automatically determines the pillar of `LAP-001` (e.g., "Hardware")
  - **And** cleanly redirects me to `/assets/hardware?panel=record&id=LAP-001`.

- **Scenario: Non-Existent Asset Route Redirection**
  - **Given** I navigate directly to `/assets/INVALID-999`
  - **When** the backend fails to resolve the asset record
  - **Then** the router immediately intercepts the error
  - **And** redirects me to the root `/assets` registry instead of crashing the page.

### Technical Implementation Tasks

#### Frontend
- [x] Implement the `selectedAssetId` state management at the grid level via Next.js `useSearchParams()`.
- [x] Build the base Slide-Out Sheet React component that does not trap focus, enabling interaction with the underlying DOM data table.
- [x] Implement active row highlighting in the data grid based on the active query parameter.

#### Backend
- [x] Create the `getAssetDetailsById` repository function returning the complete asset profile including base details, custom fields, and assignments.
- [x] Implement the `/[assetId]/page.tsx` dynamic router that automatically redirects UUIDs or Tags to their respective Pillar dashboard with the active query parameters.
- [x] Implement null-check fallback redirection in `/[assetId]/page.tsx`.

---

## User Story: US-8.2 — Hardware Asset Profile & Inline Editing

- **As an** IT Operator troubleshooting physical devices,
- **I want** to view a Hardware-specific tab layout and edit core details inline,
- **So that** I can quickly update device specifications, assignments, and repair history directly from the side panel.

### Acceptance Criteria (Gherkin)

- **Scenario: The User Journey (Hardware Tabs)**
  - **Given** I open the slide-out panel for a Hardware asset
  - **Then** I see four specific tabs: `Asset Details`, `Technical Details`, `Purchase Details`, and `History`.

- **Scenario: Inline Detail Editing (`editAssetDetailsAction`)**
  - **Given** I am on the default "Asset Details" tab
  - **When** I click the "Edit" pencil icon next to the Asset Name, Condition, Location, or Owner
  - **Then** the field becomes an editable input or dropdown
  - **And** upon saving, the `editAssetDetailsAction` executes a transactional update
  - **And** logs the exact change to the Audit Log.

- **Scenario: Preventing Unknown JSONB Keys during Inline Edit**
  - **Given** I attempt to edit a custom instance attribute (e.g. `RAM`) via an API payload
  - **When** I maliciously include a key that doesn't exist on the original schema (`"hackedRole": "admin"`)
  - **Then** the backend intercepts the payload
  - **And** throws an error: "Unknown keys are not allowed", preventing the database insertion.

- **Scenario: Maintenance & Disposal Summaries**
  - **Given** I scroll down on the Asset Details tab
  - **Then** I see summarized data fetched via `getAssetMaintenanceById` and `getAssetDisposalById` detailing recent tickets and disposal certificate links.

### Technical Implementation Tasks

#### Frontend
- [x] Build the "Asset Details" summary tab: device image, status badge, 2-column CSS Grid.
- [x] Build inline editing components utilizing the `editAssetDetailsAction` Server Action.
- [x] Build the QR Code icon button that triggers the Epic 9 tag preview modal.

#### Backend
- [x] Create the `editAssetDetailsAction` Zod-validated Server Action.
- [x] Implement backend guards ensuring inline edits to `instanceAttributes` cannot inject unknown schema keys.
- [x] Create `getAssetMaintenanceById` and `getAssetDisposalById` endpoint functions returning specialized historical data for the summary cards.

---

## User Story: US-8.3 — Software Asset Profile & Allocations

- **As an** IT Operator managing digital licenses,
- **I want** to view a Software-specific tab layout,
- **So that** I can track subscription keys and seat counts without being cluttered by physical specifications like "Maintenance Records".

### Acceptance Criteria (Gherkin)

- **Scenario: Dynamic Software License Expiry Badges**
  - **Given** I am on the "Details" tab for a Software asset
  - **When** the `getAssetDetailsById` query runs
  - **Then** the backend computes the dynamic status based on the expiry date
  - **And** if it is past the expiry date, it returns `'expired'`
  - **And** if it is within 30 days of expiry or has ≤ 2 seats left, it returns `'warning'`.

- **Scenario: Assignments Tab (Seat Allocation and History)**
  - **Given** I click the "Assignments" tab
  - **Then** the system triggers `getAssetAllocationsById`
  - **And** displays an assignment table containing all Users who currently hold a seat for this software license.

### Technical Implementation Tasks

#### Frontend
- [x] Implement conditional tab rendering for Software showing Details, Purchase Details, and Assignments.
- [x] Ensure Maintenance Records section and QR Code button are hidden for Software assets.

#### Backend
- [x] Create `getAssetAllocationsById` to query and return unified seat allocations explicitly tracking active assignments across the `software_licenses` relations.
- [x] Implement dynamic status computation logic based on date and seat capacity limits.

---

## User Story: US-8.4 — Furniture & Fixtures Profile

- **As a** Facilities Manager,
- **I want** to view a Furniture-specific tab layout,
- **So that** I can verify physical dimensions, locations, and conditions of office property.

### Acceptance Criteria (Gherkin)

- **Scenario: Asset Details Tab (Location Focus)**
  - **Given** I am on the "Asset Details" tab for an Ergonomic Chair
  - **Then** the 2-column grid prominently displays the `Location` (Building/Floor/Zone) and `Condition` fetched from the core asset record.

- **Scenario: Physical Details Tab (Custom Schema)**
  - **Given** I click the "Physical Details" tab
  - **Then** I see dynamic JSONB Custom Fields mapped directly from the `assets.instanceAttributes` and `categories.customSchema` structures (e.g., "Dimensions: 60x30", "Material: Wood").

### Technical Implementation Tasks

#### Frontend
- [x] Build the Asset Details tab variant with Location and Condition prominently displayed instead of user assignment.
- [x] Build the "Physical Details" tab mapping and rendering key-value pairs from `instanceAttributes`.

---

## User Story: US-8.5 — Office Electronics Profile

- **As an** IT or Facilities Manager,
- **I want** to view an Electronics-specific tab layout,
- **So that** I can track shared infrastructure and its network configurations.

### Acceptance Criteria (Gherkin)

- **Scenario: Asset Details Tab (Infrastructure Focus)**
  - **Given** I am on the "Asset Details" tab for a Smart TV
  - **Then** the panel displays network identifiers alongside the Maintenance Records summary card.

### Technical Implementation Tasks

#### Frontend
- [x] Build the Office Electronics conditional tabs.

---

## User Story: US-8.6 — Purchase Details & History Mechanics

- **As a** Finance Auditor or Security Admin,
- **I want** to review the financial lifecycle and audit history of the asset regardless of its pillar,
- **So that** I can track depreciation and chronological user assignments across the entire system.

### Acceptance Criteria (Gherkin)

- **Scenario: Reviewing Purchase Details**
  - **Given** I click the "Purchase Details" tab on any asset
  - **Then** the view loads financial data from `assetRecord.purchases`
  - **And** displays the Initial Purchase Cost, Tax, Shipping, and the original Currency (e.g., LKR or USD).

- **Scenario: Viewing the Audit Timeline**
  - **Given** I click the "History" tab on any asset
  - **Then** the system executes `getAssetHistoryById`
  - **And** renders a chronological timeline parsed securely from the Epic 4 `system_audit_logs` table (e.g., "Asset Created", "Status Updated").

### Technical Implementation Tasks

#### Frontend
- [x] Build the "Purchase Details" tab component.
- [x] Build the "History" tab component rendering a vertical chronological timeline.

#### Backend
- [x] Create the `getAssetHistoryById` repository function that filters `systemAuditLogs` dynamically by `entityType = 'Asset'` and `entityId`.

---

## User Story: US-8.7 — Global Admin Manual Status Override

- **As a** Global Admin,
- **I want** the ability to manually override an asset's status while providing a justification,
- **So that** I can correct system state errors or bypass locked workflows (e.g., manually changing a "Defective" item to "Available" after a localized repair) without writing database scripts.

### Acceptance Criteria (Gherkin)

- **Scenario: Executing a Manual Status Override**
  - **Given** an asset is stuck in an incorrect state
  - **When** I click the manual override button in the details panel
  - **Then** a modal prompts me to select a new Status and provide a mandatory Justification Note.
  - **And** when I submit, the `manualStatusOverrideAction` executes safely in a database transaction
  - **And** automatically closes any active assignments (`returnedDate = new Date()`) if the status implies the item was forcefully reclaimed.
  - **And** logs the exact justification note alongside the status change in the Audit Log.

- **Scenario: Preventing Invalid Overrides on Disposed Assets**
  - **Given** I attempt to override an asset whose status is `Disposed`
  - **When** I submit the change
  - **Then** the action immediately throws a validation error: "Assets in 'Disposed' status cannot have their status changed manually."

- **Scenario: Blocking Workflow-Gated Status Overrides**
  - **Given** I attempt to manually set the status of an asset to "Pending Disposal"
  - **When** I submit the form
  - **Then** the backend intercepts the action using `WORKFLOW_GATED_STATUSES`
  - **And** returns a failure: "Status 'Pending Disposal' cannot be set manually. Use the dedicated workflow."

### Technical Implementation Tasks

#### Frontend
- [x] Build the Manual Status Override Modal component triggering the Server Action.

#### Backend
- [x] Create the `manualStatusOverrideAction` restricted exclusively to `GlobalAdmin` roles.
- [x] Implement transactional logic closing active user assignments if a forced manual status change occurs.
- [x] Implement backend guards rejecting manual transitions into `WORKFLOW_GATED_STATUSES` (e.g., 'Pending Disposal').
- [x] Automatically dispatch Webhook events (`asset.status_changed`) noting the trigger was a `manual_override`.