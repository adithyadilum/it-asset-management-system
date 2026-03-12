# Epic 10: Bulk Asset Registration

## Summary

This epic builds the mass-ingestion engine for the IDAMS platform. Accessed directly from the primary action button on any registry page, it allows IT Admins to upload standard CSV or Excel (.xlsx) spreadsheets containing hundreds of asset records. It enforces strict automatic column matching and NOT NULL validation rules. Using a "Partial Success" architecture, it imports valid rows while isolating invalid or incomplete data into a downloadable error report, preventing a single missing field from crashing a massive import batch.

## In Scope

- Updating the Epic 6 "+ Add Asset" button into a split-dropdown menu.
- A dedicated Bulk Import drag-and-drop UI modal.
- Client-side and server-side parsing for both `.csv` and `.xlsx` (Excel) formats.
- Automatic column header matching (no manual mapping UI required).
- Strict validation enforcing NOT NULL rules for required columns.
- Multi-stage Loading UI (Uploading vs. Processing).
- "Partial Success" backend processing logic.
- Auto-generation of Asset IDs and QR routing URLs for successfully imported rows.
- Generation of a downloadable error-report CSV for failed rows.

## Out of Scope / Limitations

- Manual column mapping. If the spreadsheet headers do not perfectly match the system template, the file will be rejected.
- Importing Master Data (Locations, Users, Categories). This importer is strictly for the `Assets` table.

### User Stories

- [US-10.1 — The Bulk Import Entry Point & Upload UI](https://app.clickup.com/t/86ewvkyaj)
- [US-10.2 — Automatic Column Matching & Strict Validation](https://app.clickup.com/t/86ewvkye7)
- [US-10.3 — Partial Success Processing & Error Reporting](https://app.clickup.com/t/86ewvkyz1)

---

## User Story: US-10.1 — The Bulk Import Entry Point & Upload UI

- As a Global Admin,
- I want to access the bulk import tool directly from the main registry pages and upload a spreadsheet,
- So that I can easily start a mass-ingestion process without hunting through complex settings menus.

### Acceptance Criteria (Gherkin)

- Scenario: The User Journey (Initiating Bulk Import)
  - Given I navigate to a pillar page (e.g., "Hardware")
  - When I click the "+ Add Asset" button in the top right
  - Then a dropdown menu appears displaying two options: "Add Single Asset" and "Bulk Import".
  - And clicking "Add Single Asset" opens the slide-out panel defined in Epic 7.
  - But clicking "Bulk Import" opens a centralized Bulk Import Modal over the screen.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/43075171-52b0-4aee-b485-cf6bdfbf2b22/Asset%20List%20View%20-%20Desktop.png)
- Scenario: Drag and Drop File Upload
  - Given the Bulk Import Modal is open
  - When I drag and drop an Excel spreadsheet (`.xlsx`) or a standard `.csv` file into the upload zone
  - Then the UI transitions into an "Uploading..." state with a visible progress indicator.
  - And once the file upload to the server completes, the UI immediately transitions to a "Reading & Processing File..." loading screen.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/fb438540-64fe-45ea-873b-49ef894c22a8/Bulk%20Asset%20Registry%20-%20Desktop.png)

### UI/UX Specifications & Constraints

- Action Button UI: The "+ Add Asset" button must function as a split-button or dropdown trigger.
- Loading States: The transition between "Uploading" (network transfer) and "Processing" (parsing the data) must be clearly distinguished in the UI so the user understands what the system is currently doing.

### Technical Implementation Tasks

#### Frontend

- [ ] Update the `RegistryHeader` component to convert the "+ Add Asset" button into a split-button dropdown with "Add Single Asset" and "Bulk Import" options.
- [ ] Build the Bulk Import Modal with a drag-and-drop file upload zone, accepting `.csv` and `.xlsx` file types only.
- [ ] Implement the multi-stage loading UI: "Uploading..." with a progress bar during network transfer, transitioning to "Reading & Processing File..." during server-side parsing.
- [ ] Implement client-side file type validation: reject unsupported file extensions immediately with an inline error.

#### Backend

- [ ] Create a `POST /api/v1/assets/bulk-import` endpoint that accepts multipart file uploads.
- [ ] Integrate server-side file parsing libraries (`papaparse` for CSV, `exceljs` or `SheetJS` for Excel) to extract row data.

---

## User Story: US-10.2 — Automatic Column Matching & Strict Validation

- As a System Admin,
- I want the system to automatically match my spreadsheet columns to the database without manual mapping,
- So that I am forced to use standardized templates, ensuring absolute data consistency across all bulk uploads.

### Acceptance Criteria (Gherkin)

- Scenario: Strict Header Matching
  - Given the system is in the "Reading & Processing File..." state
  - When it parses the uploaded file headers
  - Then it automatically maps the columns based on exact string matches (e.g., the spreadsheet column "Serial Number" maps to the database field `serial_number`).
  - And if critical headers are entirely missing or misspelled, the system aborts the process and alerts the user to download the correct template.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/673b7894-838b-486c-9419-f8afb0ead187/Bulk%20Asset%20Import%20Processing-%20Desktop.png)
- Scenario: NOT NULL Validation Rules
  - Given the file headers match perfectly
  - When the system evaluates the individual rows during processing
  - Then it enforces a strict `NOT NULL` check on all mandatory columns (e.g., `Category`, `Brand`, `Serial Number`).
  - And any row missing data in a mandatory column is immediately flagged as a "Failed" row.

### UI/UX Specifications & Constraints

- Template Download: The Bulk Import Modal must contain a highly visible "Download Template (.xlsx)" link so users know exactly what column headers the system expects before they attempt an upload.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/a8470315-e68e-412e-bd97-5b5bc1d05714/Bulk%20Asset%20Registry%20-%20Desktop%20highlighted.png)

### Technical Implementation Tasks

#### Frontend

- [ ] Add a prominent "Download Template (.xlsx)" link inside the Bulk Import Modal that serves a pre-built template file for each pillar.

#### Backend

- [ ] Write column-header matching logic: compare parsed headers against the expected schema keys (exact string match, case-insensitive), and return a structured error response listing missing/misspelled columns if validation fails.
- [ ] Implement row-level NOT NULL validation for mandatory fields based on the pillar's required field schema.
- [ ] Create a `GET /api/v1/assets/bulk-import/template?pillar={pillar}` endpoint to serve downloadable Excel templates pre-populated with the correct column headers for each pillar.

---

## User Story: US-10.3 — Partial Success Processing & Error Reporting

- As a Global Admin,
- I want the system to process my bulk upload by saving the good data and isolating the incomplete data,
- So that a single missing field or duplicate serial number doesn't cause a 500-row spreadsheet import to completely fail.

### Acceptance Criteria (Gherkin)

- Scenario: Partial Success Handling (The Engine)
  - Given the system has finished reading a spreadsheet containing 100 rows
  - When the backend discovers 5 rows have incomplete mandatory fields or duplicate Serial Numbers
  - Then the system successfully commits the 95 valid rows to the database
  - And successfully bypasses standard "All-or-Nothing" transaction failure logic.
- Scenario: Automated Background ID Generation
  - Given the system successfully imports the 95 valid rows
  - When the database commits the records
  - Then the system automatically generates unique Asset IDs and QR routing URLs for every imported row, exactly as it does for manual Epic 7 registrations.
- Scenario: Downloadable Error Report
  - Given the import completes with 5 failed rows
  - When the final Success Summary screen loads
  - Then I see a summary stating: "95 Assets Imported Successfully, 5 Rows Failed."
  - And I can click a button to download an "Error Report CSV"
  - And the downloaded CSV contains the exact 5 failed rows, with an appended column explaining the specific error (e.g., `Error: 'Location' cannot be null`).
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/24a1e5bf-7e0b-4b1c-95e0-c182e530ecfb/Bulk%20Asset%20Import%20Processing%20Alert%20successful-%20Desktop.png)

### UI/UX Specifications & Constraints

- Error State Colors: On the final summary screen, use strong color coding (Green for Success count, Orange/Red for Failed count) so the result is immediately obvious. The "Download Error Report" button should be distinctly styled (e.g., a warning color or a prominent outline button).

### Technical Implementation Tasks

#### Frontend

- [ ] Build the Success Summary screen displaying: success count (green), failure count (red), total records processed, and a "Download Error Report" button.
- [ ] Implement the "Download Error Report" button that requests a CSV from the backend and triggers a browser file download.

#### Backend

- [ ] Write the iterative processing script that loops through parsed rows, validating and inserting each individually rather than as a batch transaction.
- [ ] Implement row-level `try/catch` logic: append failed rows (with their specific error messages) to an error array rather than throwing a fatal API error.
- [ ] Trigger the Epic 7 Asset ID generation and Epic 9 QR routing URL generation utilities for every successfully imported record.
- [ ] Compile the error array into a downloadable CSV stream with an appended `Error` column explaining each row's failure reason.
- [ ] Return a structured JSON response: `{ successCount, failureCount, errorReportUrl }` to power the frontend summary screen.
