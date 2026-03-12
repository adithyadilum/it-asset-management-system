# Epic 19: Disposal History

## Summary

This epic governs the long-term archival of retired assets. It implements a "Soft Delete" database architecture, ensuring that assets marked as `Disposed` are instantly hidden from all active registries and dropdowns, but are securely preserved in the database for 7 years to meet compliance audits. It surfaces these archived records in a read-only "Disposal History" ledger, allowing auditors to easily review the destruction details and download the associated E-Waste certificates.

## In Scope

- The `Disposal History` data grid tab.
- Direct PDF download links embedded within the data grid.
- Global backend "Soft Delete" filtering (hiding `Disposed` items from main `GET` requests).
- Frontend and backend record-locking (preventing edits to finalized assets).

## Out of Scope / Limitations

- Reactivation Workflow: Once an asset is `Disposed`, it is permanent. There is no UI button to "Undo" a disposal. If a mistake was made, it requires a Super Admin to manually override the database tables.
- Automated Data Purging: Automatically deleting records from the database after exactly 7 years is deferred to a future Data Retention policy epic.

### User Stories

- [US-19.1 — The Disposal History Ledger](https://app.clickup.com/t/86ewvt40q)
- [US-19.2 — Soft Delete Architecture](https://app.clickup.com/t/86ewvt41u)
- [US-19.3 — Record Finality & Edit Locking](https://app.clickup.com/t/86ewvt42u)

---

## User Story: US-19.1 — The Disposal History Ledger

- As a Security/Tax Auditor,
- I want to view a complete ledger of every asset the company has ever thrown away or sold,
- So that I can verify exactly when it was removed from the financial books and who authorized it.

### Acceptance Criteria (Gherkin)

- Scenario: Accessing the Historical Archive
  - Given I navigate to `Operations > Disposals`
  - When I click the `Disposal History` tab
  - Then I see a comprehensive data grid of all permanently retired assets.
  - And the grid includes columns for `Reason`, `Status` (locked to `Disposed`), `Flagged By`, `Disposed By`, `Disposal Date`, and `Documents`.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/b59946f2-07ca-4872-9d68-f6d92b797b3a/Asset%20Disposal%20History%20-%20Desktop.png)
- Scenario: Downloading the E-Waste Certificate
  - Given I am viewing the `Disposal History` tab
  - When I look at the `Documents` column for a specific row
  - Then I see the filename of the uploaded receipt alongside a document/PDF icon.
  - And clicking the icon instantly downloads or opens the legal E-Waste certificate in a new browser tab.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/35276b76-19df-4035-8652-57d91cd70495/Asset%20Disposal%20History%20-%20Desktop(Docs).png)

### UI/UX Specifications & Constraints

- Read-Only Interface: Unlike the active registries, the rows in the `Disposal History` tab should not have multi-select checkboxes for bulk actions, as these records are finalized.
- Visual Status: The Status badge should be uniformly styled (e.g., a neutral gray or a muted green outline) reading `Disposed` to indicate inactivity.

### Technical Implementation Tasks

#### Frontend

- [ ] Build the `Disposal History` data grid React component with read-only rows (no checkboxes or bulk action toolbar).
- [ ] Configure the grid columns: Asset ID, Category, Reason, Flagged By, Disposed By, Disposal Date, Status badge (muted gray "Disposed"), and Documents.
- [ ] Implement the `Documents` column: render the uploaded filename with a clickable PDF icon that opens a signed URL in a new browser tab.

#### Backend

- [ ] Create a `GET /api/v1/disposals/history` endpoint that fetches assets with `status === 'Disposed'`, joining the `Users` table twice to retrieve both the `Flagged By` (requester) and `Disposed By` (executor) display names.
- [ ] Generate signed URLs for the disposal receipt documents on-demand for secure, time-limited access.

---

## User Story: US-19.2 — Soft Delete Architecture

- As a System Admin,
- I want disposed assets to completely disappear from daily operational views without actually being deleted from the database,
- So that IT staff aren't sorting through thousands of dead laptops when trying to assign new hardware, but the data is safe for audits.

### Acceptance Criteria (Gherkin)

- Scenario: Database Preservation (Soft Delete)
  - Given an asset has successfully completed the Disposal execution workflow (Epic 18)
  - When an Admin searches for its Asset ID in the main `Hardware` Registry Grid or any assignment dropdown
  - Then it does not appear, as it is filtered out by default.
  - But if a database administrator runs a raw SQL query, the entire row and all its relational data is perfectly intact.

### Technical Implementation Tasks

#### Backend

- [ ] Add an `is_archived` boolean column (default `false`) to the `Assets` table, set to `true` upon disposal completion.
- [ ] Apply a global `WHERE is_archived = false` (or `WHERE status != 'Disposed'`) filter to all standard `GET` API endpoints that feed the main registries, assignment dropdowns, and Master Data lookups.
- [ ] Ensure the `GET /api/v1/disposals/history` endpoint explicitly queries `WHERE is_archived = true` to retrieve only archived records.

#### Database

- [ ] Add a database index on the `is_archived` column for query performance optimization.

---

## User Story: US-19.3 — Record Finality & Edit Locking

- As a Finance Manager,
- I want finalized disposal records to be strictly read-only,
- So that no one can maliciously tamper with the financial values or technician notes after the item has been written off.

### Acceptance Criteria (Gherkin)

- Scenario: Reactivation & Edit Prevention
  - Given I click on a row in the `Disposal History` tab to view its Asset Details slide-out panel
  - When the panel opens
  - Then all input fields, status dropdowns, and "Edit" buttons are completely hidden or disabled.
  - And if a malicious user attempts to bypass the UI and send a `PUT` or `PATCH` API request to edit the asset's data
  - Then the backend strictly blocks the request, returning a `403 Forbidden: Record is finalized` error.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/b0e17ecb-78c3-4c9e-858d-3089a58414f4/Asset%20Disposal%20Slide%20Out%20Panel-%20Desktop.png)

### Technical Implementation Tasks

#### Frontend

- [ ] Write conditional rendering logic in the `AssetDetailsPanel`: if `asset.status === 'Disposed'`, hide all "Edit" buttons, disable all form inputs, and hide the interactive `StatusBadge` dropdown.

#### Backend

- [ ] Write backend middleware that intercepts all `PUT`, `PATCH`, and `DELETE` requests for assets with `is_archived === true` or `status === 'Disposed'`, returning `403 Forbidden: Record is finalized`.