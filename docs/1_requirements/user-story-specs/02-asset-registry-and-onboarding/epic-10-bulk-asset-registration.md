# Epic 10: Bulk Asset Registration

## Summary

This epic builds the mass-ingestion engine for the IDAMS platform. Accessed directly from the primary action button on any registry page, it allows IT Admins to upload standard CSV spreadsheets containing hundreds of asset records. It enforces strict automatic column matching and NOT NULL validation rules by cross-referencing Master Data. Using a two-step "Dry Run Preview" and "Execution" architecture backed by PostgreSQL advisory locks, it imports valid rows safely while isolating invalid or incomplete data into a downloadable error report.

## In Scope

- Updating the Epic 6 "+ Add Asset" button into a split-dropdown menu.
- A dedicated Bulk Import Wizard modal UI featuring a Step-by-Step flow (Upload -> Preview -> Execute).
- Client-side and server-side parsing for `.csv` formats using `PapaParse`.
- Automatic column header matching (no manual mapping UI required).
- Strict validation enforcing NOT NULL rules and cross-referencing string values (e.g. "Colombo HQ") to database IDs via a preloaded Master Data cache.
- "Partial Success" backend processing logic.
- Transaction-safe auto-generation of Asset IDs utilizing `pg_try_advisory_lock`.
- Generation of a downloadable error-report CSV (generated via Papa.unparse) for failed rows.
- Dynamic Template Generation served as an Excel file based on Category schemas.

## Out of Scope / Limitations

- Manual column mapping. If the spreadsheet headers do not perfectly match the system template, the rows will be rejected.
- Direct Excel (`.xlsx`) parsing during import. The system serves `.xlsx` templates but strictly accepts `.csv` payloads for processing.
- Importing Master Data (Locations, Users, Categories). This importer is strictly for the `Assets` and `AssetPurchases` tables.

---

### User Stories

- [US-10.1 — The Bulk Import Entry Point & Upload UI](#user-story-us-101--the-bulk-import-entry-point--upload-ui)
- [US-10.2 — Automatic Column Matching & Strict Validation](#user-story-us-102--automatic-column-matching--strict-validation)
- [US-10.3 — Partial Success Processing & Error Reporting](#user-story-us-103--partial-success-processing--error-reporting)

---

## User Story: US-10.1 — The Bulk Import Entry Point & Upload UI

- **As a** Global Admin,
- **I want** to access the bulk import tool directly from the main registry pages and upload a spreadsheet,
- **So that** I can easily start a mass-ingestion process without hunting through complex settings menus.

### Acceptance Criteria (Gherkin)

- **Scenario: The User Journey (Initiating Bulk Import)**
  - **Given** I navigate to a pillar page (e.g., "Hardware")
  - **When** I click the "+ Add Asset" button in the top right
  - **Then** a dropdown menu appears displaying two options: "Add Single Asset" and "Import via CSV/Excel".
  - **And** clicking "Add Single Asset" opens the slide-out panel defined in Epic 7.
  - **But** clicking "Import via CSV/Excel" opens the centralized `BulkImportWizard` modal over the screen.

- **Scenario: File Upload & Template Generation**
  - **Given** the Bulk Import Wizard is open
  - **When** I select a Category (e.g., "Laptops")
  - **Then** I am able to download a dynamically generated template (`generateImportTemplate`) specifically tailored with custom fields for that category.
  - **And** when I upload the completed `.csv` file into the upload zone, the UI transitions to the Preview step.

### Technical Implementation Tasks

#### Frontend

- [x] Update the `RegistryHeader` component to convert the "+ Add Asset" button into a split-button dropdown.
- [x] Build the `BulkImportWizard` component with a Stepper flow (Upload, Preview, Summary).
- [x] Implement category-selection dropdown inside the wizard.

#### Backend

- [x] Create the `generateImportTemplate` Server Action that dynamically queries the schema and returns a base64 encoded template file.

---

## User Story: US-10.2 — Automatic Column Matching & Strict Validation

- **As a** System Admin,
- **I want** the system to automatically match my spreadsheet columns to the database and validate the data against Master Data before committing,
- **So that** I catch spelling mistakes (like "Colmbo HQ") before they corrupt the production database.

### Acceptance Criteria (Gherkin)

- **Scenario: Dry-Run Parsing & Validation Preview**
  - **Given** I have uploaded a CSV file
  - **When** the frontend triggers the `parseAndValidateImport` Server Action
  - **Then** the backend parses the CSV using `PapaParse`
  - **And** preloads a Master Data cache (`preloadMasterDataCache`) to map string names (Locations, Vendors, Owners, Models) to internal foreign-key IDs.
  - **And** evaluates individual rows against NOT NULL requirements and the custom JSONB schema rules.
  - **And** returns a safe UI Preview detailing exactly how many rows are Valid and how many contain Errors, without modifying the database.

- **Scenario: Missing Master Data References**
  - **Given** a row in my CSV specifies the Model "ThinkPad XYZ" which does not exist in the system
  - **When** the validation logic (`validateRows`) executes
  - **Then** the cache lookup fails
  - **And** the row is immediately flagged as a "Failed" row with a specific error message preventing insertion.

### Technical Implementation Tasks

#### Frontend

- [x] Build the Preview UI displaying success/error row counts and rendering the data tables for review.

#### Backend

- [x] Build `parseAndValidateImport` utilizing `PapaParse` and `validateRows` for client-side dry runs.
- [x] Implement the `preloadMasterDataCache` function to optimize DB lookups, preventing N+1 queries during row resolution.

---

## User Story: US-10.3 — Partial Success Processing & Error Reporting

- **As a** Global Admin,
- **I want** the system to process my bulk upload by saving the good data and isolating the incomplete data,
- **So that** a single missing field or duplicate serial number doesn't cause a 500-row spreadsheet import to completely fail.

### Acceptance Criteria (Gherkin)

- **Scenario: Partial Success Handling & Concurrency Lock**
  - **Given** I have reviewed the Preview step and click "Execute Import"
  - **When** the `executeBulkImport` server action runs
  - **Then** the system immediately acquires a PostgreSQL Advisory Lock (`pg_try_advisory_lock`) to prevent concurrent bulk imports
  - **And** sequentially processes each valid row, generating `Asset Tags`, inserting into `assets` and `assetPurchases`, and logging to `systemAuditLogs`.
  - **And** if a specific row transaction fails (e.g. unique serial number constraint hit), it catches the error and continues importing the remaining valid rows.
  - **Finally** it releases the advisory lock when complete.

- **Scenario: Downloadable Error Report**
  - **Given** the execution completes but 5 rows failed during database insertion
  - **When** the final Summary step loads
  - **Then** I see a summary stating: "X Assets Imported Successfully, Y Rows Failed."
  - **And** the backend returns a parsed CSV string (`errorCsvData`) containing the failed rows with an appended `Error Message` column.
  - **And** I can click to download the `.csv` file to correct and re-upload the failures.

### Technical Implementation Tasks

#### Frontend

- [x] Build the Success Summary screen displaying: success count (green), failure count (red), and a "Download Error CSV" utility.

#### Backend

- [x] Build `executeBulkImport` managing atomic insertions of `assets` and `assetPurchases`.
- [x] Implement robust concurrency protection using `pg_try_advisory_lock` to block overlapping CSV processing tasks globally.
- [x] Dynamically generate base64/parsed CSV dumps (`Papa.unparse`) containing specific row errors and return them safely to the client.
