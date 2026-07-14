# Epic 19: Disposal History

## Summary

This epic governs the long-term archival of retired assets. It implements a "Soft Delete" database architecture, ensuring that assets marked as `Disposed` are instantly hidden from all active registries and dropdowns, but are securely preserved in the database for compliance audits. It surfaces these archived records in a read-only "Disposal History" ledger, allowing auditors to easily review the destruction details and download all associated E-Waste certificates. Furthermore, strict middleware enforces record finality by blocking unauthorized API modifications.

## In Scope

- The `Disposal History` data grid tab, complete with server-side pagination and search.
- Display of both `Completed` (Disposed) and `Rejected` disposal requests.
- Direct document download links embedded within the data grid for multiple attachments.
- Global backend "Soft Delete" filtering (hiding `Disposed` or `isArchived=true` items from main registries).
- Frontend and backend record-locking (preventing edits to finalized assets via `disposalFinalityMiddleware`).

## Out of Scope / Limitations

- Reactivation Workflow: Once an asset is `Disposed`, it is permanent. There is no UI button to "Undo" a disposal. If a mistake was made, it requires a Super Admin to manually override the database tables.
- Automated Data Purging: Automatically deleting records from the database after a set retention period is deferred to a future Data Retention policy epic.

### User Stories

- [US-19.1 — The Disposal History Ledger](#user-story-us-191--the-disposal-history-ledger)
- [US-19.2 — Soft Delete Architecture](#user-story-us-192--soft-delete-architecture)
- [US-19.3 — Record Finality & Edit Locking](#user-story-us-193--record-finality--edit-locking)

---

## User Story: US-19.1 — The Disposal History Ledger

- As a Security/Tax Auditor,
- I want to view a complete ledger of every asset the company has ever thrown away, sold, or rejected for disposal,
- So that I can verify exactly when it was removed from the financial books and who authorized it.

### Acceptance Criteria (Gherkin)

- Scenario: Accessing the Historical Archive
  - Given I navigate to `Operations > Disposals`
  - When I click the `Disposal History` tab
  - Then I see a comprehensive, paginated data grid of all processed asset disposal requests.
  - And the grid includes columns for `Asset ID`, `Category`, `Reason`, `Status` (either `Disposed` or `Rejected`), `Flagged By`, `Reviewed By`, `Disposal Date`, and `Documents`.

- Scenario: Server-Side Search & Client Filtering
  - Given I am viewing the `Disposal History` tab
  - When I type into the search bar
  - Then the grid performs a server-side search across multiple fields (Asset Tag, Category, Reason, Requester, Approver) and updates the URL parameters.
  - And I can also use the filter bar to apply specific client-side column filters (e.g., matching a specific `Asset ID` or `Category`).

- Scenario: Downloading E-Waste Certificates
  - Given I am viewing the `Disposal History` tab
  - When I look at the `Documents` column for a specific row
  - Then I see a list of filenames for all uploaded receipts alongside a document icon.
  - And clicking a filename instantly opens the legal E-Waste certificate or sales receipt in a new browser tab.

### UI/UX Specifications & Constraints

- Read-Only Interface: Unlike the active registries, the rows in the `Disposal History` tab should not have multi-select checkboxes for bulk actions, as these records are finalized.
- Visual Status: `Completed` database statuses render as a `Disposed` badge. `Rejected` statuses render as a `Rejected` badge.

### Technical Implementation Tasks

#### Frontend

- [x] Build the `Disposal History` data grid component with read-only rows, incorporating server-side pagination and a shared `FilterBar`.
- [x] Configure the grid columns: Asset ID, Category, Reason, Status badge, Flagged By, Reviewed By, Disposal Date, and Documents.
- [x] Implement the `Documents` column: render an array of uploaded document URLs with clickable links that open in a new browser tab.

#### Backend

- [x] Create a server-rendered page (`app/(app-shell)/(management)/operations/disposals/page.tsx`) that queries `AssetDisposals` where status is `Completed` or `Rejected`.
- [x] Join the `Users` table twice (using aliases `requester` and `approver`) to retrieve both the `Flagged By` and `Reviewed By` display names.
- [x] Aggregate multiple document URLs into a single array (`documentUrls`) per row using a `COALESCE(array_agg(...))` SQL function.

---

## User Story: US-19.2 — Soft Delete Architecture

- As a System Admin,
- I want disposed assets to completely disappear from daily operational views without actually being deleted from the database,
- So that IT staff aren't sorting through thousands of dead laptops when trying to assign new hardware, but the data is safe for audits.

### Acceptance Criteria (Gherkin)

- Scenario: Database Preservation (Soft Delete)
  - Given an asset has successfully completed the Disposal execution workflow (Epic 18)
  - When an Admin searches for its Asset ID in the main `Hardware` Registry Grid or any assignment dropdown
  - Then it does not appear, as its `isArchived` flag is set to `true`.
  - But if a database administrator runs a raw SQL query, the entire row and all its relational data is perfectly intact.

- Scenario: Disposal Rejection Reversal
  - Given an asset is marked as `Pending Disposal` (and implicitly soft-deleted/archived)
  - When an Admin rejects the disposal request
  - Then the asset's `isArchived` flag is reverted to `false`, returning it to active operational views.

### Technical Implementation Tasks

#### Backend

- [x] Use the `isArchived` boolean column on the `Assets` table, set to `true` upon disposal completion, and `false` upon rejection.
- [x] Apply a global `WHERE isArchived = false` filter to all standard API endpoints and queries that feed the main registries, assignment dropdowns, and Master Data lookups.

#### Database

- [x] Ensure schema indices support efficient queries against `isArchived`.

---

## User Story: US-19.3 — Record Finality & Edit Locking

- As a Finance Manager,
- I want finalized disposal records to be strictly read-only,
- So that no one can maliciously tamper with the financial values or technician notes after the item has been written off.

### Acceptance Criteria (Gherkin)

- Scenario: UI Edit Prevention
  - Given I click on a row in the `Disposal History` tab to view its Asset Details slide-out panel
  - When the panel opens
  - Then all input fields, status dropdowns, and "Edit" buttons are hidden or disabled due to the `Disposed` status.

- Scenario: API Write Blocking (Zero Trust)
  - Given an asset is finalized (`isArchived === true` or `status === 'Disposed'`)
  - When a malicious user attempts to bypass the UI and send a `PUT`, `PATCH`, or `DELETE` API request to `/api/v1/assets/{id}`
  - Then the backend `disposalFinalityMiddleware` strictly blocks the request, returning a `403 Forbidden: Record is finalized` error.
  - And an `ACCESS_DENIED` event is securely logged in the System Audit Trail, recording the user ID and attempted path.
  - And if the database check fails unexpectedly, the middleware fails securely (503 Service Unavailable) to maintain Zero Trust.

### Technical Implementation Tasks

#### Frontend

- [x] Write conditional rendering logic: if `asset.status === 'Disposed'` or `asset.isArchived === true`, hide "Edit" buttons and disable interactive elements.

#### Backend

- [x] Implement `disposalFinalityMiddleware` to intercept `PUT`, `PATCH`, and `DELETE` requests for asset endpoints.
- [x] Query the database to verify the asset's `status` and `isArchived` flags.
- [x] Log denied access attempts to the `systemAuditLogs` table using `logAuditAction`.
- [x] Implement error handling that defaults to securely blocking the request (`503`) if the database verification query fails.
