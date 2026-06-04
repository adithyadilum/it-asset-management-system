# Epic 21: Standard Reporting

## Summary

This epic governs the creation, preview, and extraction of system data into portable formats (CSV and PDF). It provides a dual-interface approach: users can utilize one-click "Quick Templates" for common queries, or use a dynamic filter engine to build custom, one-off reports on the fly. Furthermore, Global Admins can configure and save their own templates for future reuse. All generated reports are previewed in a real-time data grid before exporting, ensuring the user extracts exactly what they need. Both CSV and PDF generation are optimized using client-side utilities to reduce server load.

## In Scope

- Left-hand configuration sidebar (Templates, Primary Data Source, Filters).
- Right-hand live "Report Preview" data grid with pagination.
- "Add New Template" modal for saving reusable report configurations to the database.
- Multi-Source data querying (Assets, Assignments, Maintenance, Financials, Audits, etc.).
- Client-side CSV Export Engine (supports current page or full dataset).
- Client-side PDF Generation Engine (prints formatted report data).

## Out of Scope / Limitations

- Automated Report Emailing: Scheduling a report to automatically email out every Monday morning is pushed to a future phase; currently, generation requires manual triggering.
- Complex Data Joining: Users can select a `Primary Data Source` (e.g., Asset Registry OR Maintenance Records), but they cannot write complex SQL `JOIN` queries across multiple distinct modules in the UI.

### User Stories

- [US-21.1 — Quick Templates & Preview](#user-story-us-211--quick-templates--preview)
- [US-21.2 — Custom One-time Reporting](#user-story-us-212--custom-one-time-reporting)
- [US-21.3 — Creating Custom Report Templates](#user-story-us-213--creating-custom-report-templates)
- [US-21.4 — CSV Export](#user-story-us-214--csv-export)
- [US-21.5 — PDF Generation](#user-story-us-215--pdf-generation)

---

## User Story: US-21.1 — Quick Templates & Preview

- As an Auditor or IT Manager,
- I want to click a pre-built template card to instantly generate reports,
- So that I don't have to manually configure the filters every time I need to generate a report.

### Acceptance Criteria (Gherkin)

- Scenario: Triggering a Quick Template
  - Given I navigate to `Reports > Standard Reports`
  - When I click a template card (e.g., "Monthly Depreciation")
  - Then the left-hand Filters automatically populate with the template's saved parameters and fields.
  - And the right-hand "Report Preview" panel instantly loads the resulting data grid, showing the first paginated subset of rows.

### UI/UX Specifications & Constraints

- Empty State: Before a report is generated, the right-hand preview panel must display a clean empty state with an icon and the text: "Select your filters and click Preview Data to see results here."

### Technical Implementation Tasks

#### Frontend

- [x] Build the split-screen layout (`StandardReportsShell`): Left Configuration Sidebar (template cards, filter controls) and Right Report Preview Panel (data grid with empty state).
- [x] Build the reusable `ReportTemplateCard` component.
- [x] Implement the empty state UI and table skeleton loaders for the preview panel.

#### Backend

- [x] Create a `getReportTemplates` server action returning all available report templates.
- [x] Create a `fetchReportPreview` server action that accepts filter parameters and returns paginated query results.

---

## User Story: US-21.2 — Custom One-time Reporting

- As a Global Admin,
- I want to select a primary data source and apply manual filters to instantly preview a custom dataset,
- So that I can extract very specific information (like "Laptops assigned to Marketing this month") without having to permanently save it as a new template.

### Acceptance Criteria (Gherkin)

- Scenario: Building a One-Off Report
  - Given I am on the Standard Reports page
  - When I select a `Primary Data Source` (e.g., Asset Registry, Maintenance Records, Depreciation Ledger, Software Licenses, Audit Logs)
  - And I configure the manual filters (`Date Range`, `Category`, `Location`, `Status`, `Asset Type`)
  - And I click the generate/preview button
  - Then the right panel dynamically updates to show the preview of my custom query with dynamically determined columns based on the source.

### Technical Implementation Tasks

#### Frontend

- [x] Implement the Configuration Panel dropdowns that populate filter options.
- [x] Build dynamic column definitions in the `StandardReportsPreviewPanel` that adapt based on the selected `Primary Data Source`.

#### Backend

- [x] Create a `getStandardReportsFilterOptions` server action returning distinct locations, categories, statuses, vendors, etc.
- [x] Implement complex routing within `fetchReportPreview` to execute distinct Drizzle ORM queries depending on the requested `source`.

---

## User Story: US-21.3 — Creating Custom Report Templates

- As a Global Admin,
- I want to build and save my own custom report templates, specifying exact columns and default sorting,
- So that my specific organizational queries are saved as one-click cards for the rest of the team.

### Acceptance Criteria (Gherkin)

- Scenario: The Template Builder Workflow
  - Given I click the "Create Template" button
  - When the "Create Template" modal opens
  - Then I am required to fill out basic info and select the Data Source, Filters, and Fields (columns).
- Scenario: Saving the Template
  - When I click "Save Template"
  - Then the backend automatically generates a sequential Report Code (e.g., `RPT-YYYY-001`).
  - And the template is saved to the database and appears in the sidebar.

### Technical Implementation Tasks

#### Frontend

- [x] Build the `CreateTemplateDialog` multi-step modal with form validation (Zod).
- [x] Pass the newly created template data back to the parent to update the UI without a hard page refresh.

#### Backend

- [x] Create `createReportTemplate`, `updateReportTemplate`, and `deleteReportTemplate` server actions.
- [x] Implement the sequential report code generator (`RPT-YYYY-NNN`) in the creation logic.
- [x] Add `logAuditAction` triggers for template CRUD operations.

#### Database

- [x] Create the `ReportTemplates` table schema mapping the name, report code, data source, active state, and JSON structures for filters and fields.

---

## User Story: US-21.4 — CSV Export

- As a Finance Manager,
- I want to export my report as a raw CSV file,
- So that I can import the dataset into Excel or our corporate accounting software for further manipulation.

### Acceptance Criteria (Gherkin)

- Scenario: CSV Configuration Modal
  - Given I have previewed a report in the right-hand panel
  - When I click the "Export CSV" button
  - Then the "Export CSV" standard modal opens.
- Scenario: Executing the Export
  - Given the modal is open
  - When I select the `Data Scope` (Current Page Preview OR All Records)
  - And I click "Export"
  - Then the client application processes the data into a CSV string and automatically triggers the browser download.

### Technical Implementation Tasks

#### Frontend

- [x] Build the "Export CSV" modal with Data Scope radio buttons.
- [x] Integrate `PapaParse` (`papaparse`) to handle client-side CSV generation.
- [x] If "All Records" is selected, fetch the full dataset from `fetchReportPreview` using a large `pageSize` before parsing.
- [x] Create a `Blob` URL and trigger a hidden anchor click to download the `.csv` file.

---

## User Story: US-21.5 — PDF Generation

- As a Compliance Auditor,
- I want to export reports as highly formatted, branded PDFs,
- So that I can present professional, immutable documentation during formal board meetings or legal audits.

### Acceptance Criteria (Gherkin)

- Scenario: PDF Configuration Modal
  - Given I have previewed a report
  - When I click the "Generate PDF" button
  - Then the "Generate PDF Report" modal opens.
- Scenario: Generating the Document
  - Given the PDF modal is open
  - When I choose the Data Scope and click "Generate"
  - Then the system warns me if the dataset is excessively large (>5000 rows).
  - And upon proceeding, it compiles the data with a title, description, and applied filter metadata.
  - And the browser's native print/PDF engine is triggered via `generateAndOpenReportPdf` to render the clean document.

### Technical Implementation Tasks

#### Frontend

- [x] Build the `GenerateReportPdfModal` component.
- [x] Implement logic to fetch the full dataset if the "All Matching Records" scope is selected.
- [x] Implement the `LARGE_EXPORT_THRESHOLD` warning state.
- [x] Create the `generateAndOpenReportPdf` utility to compile the `ReportPdfData` payload and open a printable document window.