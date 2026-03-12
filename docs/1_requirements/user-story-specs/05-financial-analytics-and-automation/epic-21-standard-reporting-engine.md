# Epic 21: Standard Reporting

## Summary

This epic governs the creation, preview, and extraction of system data into portable formats (CSV and PDF). It provides a dual-interface approach: users can utilize one-click "Quick Templates" for common queries, or use a dynamic filter engine to build custom, one-off reports on the fly. Furthermore, Global Admins can configure and save their own templates for future reuse. All generated reports are previewed in a real-time data grid before exporting, ensuring the user extracts exactly what they need.

## In Scope

- Left-hand configuration sidebar (Templates, Primary Data Source, Filters).
- Right-hand live "Report Preview" data grid.
- "Add New Template" modal for saving reusable report configurations.
- CSV Export Engine & Configuration Modal.
- PDF Generation Engine & Formatting Modal (Layout, Branding, Page Size).

## Out of Scope / Limitations

- Automated Report Emailing: Scheduling a report to automatically email out every Monday morning is pushed to a future phase; currently, generation requires manual triggering.
- Complex Data Joining: Users can select a `Primary Data Source` (e.g., Assets OR Maintenance Records), but they cannot write complex SQL `JOIN` queries across multiple distinct modules in the UI.

### User Stories

- [US-21.1 — Quick Templates & Preview](https://app.clickup.com/t/86ewvxvp3)
- [US-21.2 — Custom One-time Reporting](https://app.clickup.com/t/86ewvxvtg)
- [US-21.3 — Creating Custom Report Templates](https://app.clickup.com/t/86ewvxw0e)
- [US-21.4 — CSV Export](https://app.clickup.com/t/86ewvxw4u)
- [US-21.5 — PDF Generation](https://app.clickup.com/t/86ewvxw9t)

---

## User Story: US-21.1 — Quick Templates & Preview

- As an Auditor or IT Manager,
- I want to click a pre-built template card to instantly generate reports,
- So that I don't have to manually configure the filters every time I need to generate a report.

### Acceptance Criteria (Gherkin)

- Scenario: Triggering a Quick Template
  - Given I navigate to `Reports & Audits > Standard Reports`
  - When I click "Preview report" on a template card (e.g., "Monthly Depreciation")
  - Then the left-hand Filters automatically populate with the template's saved parameters.
  - And the right-hand "Report Preview" panel instantly loads the resulting data grid, showing the first paginated subset of rows (e.g., 16 rows).

![](https://t90181861921.p.clickup-attachments.com/t90181861921/cba47f62-3892-46bb-b30d-21c72b8fb748/Report%20Generation%20preview%20-%20Desktop.png)

### UI/UX Specifications & Constraints

- Template Cards: The template cards must display a clear Title, a descriptive subtext, and a relevant icon to guide the user visually.
- Empty State: Before a report is generated, the right-hand preview panel must display a clean empty state with an icon and the text: "Select your filters and click Preview Data to see results here."
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/b29c0e65-4340-4282-a41e-798e67014edf/Report%20Generation%20-%20Desktop.png)

### Technical Implementation Tasks

- [ ] Build the layout wrapper splitting the screen into the Left Configuration Sidebar and the Right Preview Panel.
- [ ] Connect the "Preview report" button to a `GET` endpoint that fetches and paginates the queried data.

---

## User Story: US-21.2 — Custom One-time Reporting

- As a Global Admin,
- I want to select a primary data source and apply manual filters to instantly preview a custom dataset,
- So that I can extract very specific information (like "Laptops assigned to Marketing this month") without having to permanently save it as a new template.

### Acceptance Criteria (Gherkin)

- Scenario: Building a One-Off Report
  - Given I am on the Standard Reports page
  - When I select a `Primary Data Source` (e.g., "Assets") from the dropdown
  - And I configure the manual filters (`Date Range`, `Category`, `Location`, `Status`)
  - And I click "Preview report" at the bottom of the sidebar
  - Then the right panel dynamically updates to show the preview of my custom query.

![](https://t90181861921.p.clickup-attachments.com/t90181861921/ae4d98c7-f2f5-4a07-8f37-3b64026267af/Untitled.png)

- Scenario: Clearing Filters
  - Given I have applied several filters
  - When I click the "Clear filters" text button
  - Then all dropdowns reset to their default empty states and the Date Range clears.

### Technical Implementation Tasks

- [ ] Implement the `Primary Data Source` dropdown logic to define the base API endpoint queried (e.g., routing to `/api/assets` vs `/api/maintenance`).

---

## User Story: US-21.3 — Creating Custom Report Templates

- As a Global Admin,
- I want to build and save my own custom report templates, specifying exact columns and default sorting,
- So that my specific organizational queries are saved as one-click cards for the rest of the team.

### Acceptance Criteria (Gherkin)

- Scenario: The Template Builder Workflow
  - Given I click the "Add new report template" card
  - When the "Add New Template" modal opens
  - Then I am required to fill out `Basic Information` (Name, Code, Description, Active Toggle).
  - And I select the `Primary Data Source` and default `Filters`.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/bba2b23b-5255-4f7d-9a66-70a6cf05601e/1.png)
- Scenario: Selecting Specific Columns (Report Fields)
  - Given I am building a template
  - When I scroll down to the `Report Fields` section
  - Then I see a multi-select grid of checkboxes allowing me to pick exactly which columns appear in the report (e.g., only checking `Asset ID`, `Brand`, and `Purchase Cost`).
- Scenario: Saving the Template
  - Given I configure my template and select a `Sort` direction (Ascending/Descending)
  - When I click "Save Template"
  - Then the modal closes, and a new quick-action card immediately appears in the left sidebar.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/274a7a5b-551a-46cb-8713-ef4347e9c9d3/Report%20Generation%20template%20Modal%20-%20Desktop.png)

### Technical Implementation Tasks

- [ ] Build the "Add New Template" modal.
- [ ] Create a `ReportTemplates` database table to store the JSON configurations (fields, sources, filters, sort direction).

---

## User Story: US-21.4 — CSV Export

- As a Finance Manager,
- I want to export my report as a raw CSV file,
- So that I can import the dataset into Excel or our corporate accounting software for further manipulation.

### Acceptance Criteria (Gherkin)

- Scenario: CSV Configuration Modal
  - Given I have previewed a report in the right-hand panel
  - When I click the green "Export CSV >" button
  - Then the "Export as CSV" modal opens.
- Scenario: Executing the Export
  - Given the modal is open
  - When I select the `Data Scope` (Export current preview only OR Export full dataset)
  - And I input a custom `File Name` and toggle `Include Header Row`
  - And I click "Export as CSV"
  - Then the backend streams the data into a formatted `.csv` file and automatically triggers the browser download.

![](https://t90181861921.p.clickup-attachments.com/t90181861921/86d8ba9d-8d48-4e73-a7b4-f082d1f2341a/Report%20Generation%20CSV%20export%20-%20Desktop.png)

### Technical Implementation Tasks

- [ ] Build the "Export as CSV" modal.
- [ ] Write a highly optimized backend CSV streaming endpoint. It must handle the `Export full dataset` command without crashing the server if the payload is > 50,000 rows.

---

## User Story: US-21.5 — PDF Generation

- As a Compliance Auditor,
- I want to export reports as highly formatted, branded PDFs,
- So that I can present professional, immutable documentation during formal board meetings or legal audits.

### Acceptance Criteria (Gherkin)

- Scenario: PDF Configuration Modal
  - Given I have previewed a report
  - When I click the dark blue "Generate PDF >" button
  - Then the "Generate PDF Report" modal opens.
- Scenario: Formatting and Branding
  - Given the PDF modal is open
  - Then I am presented with `Layout Settings` (Landscape/Portrait) and `Page Size` (A4/Letter).
  - And I can toggle specific `Branding` elements to be injected into the document header/footer (Include company logo, report title, filter summary, export timestamp, generated by user).
- Scenario: Generating the Document
  - When I configure my branding and click "Generate PDF"
  - Then the system renders a clean, professional PDF matching my layout constraints and triggers the download.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/55c1ca17-a0b4-491b-95eb-8b421ae2627b/Report%20Generation%20PDF%20export%20-%20Desktop.png)

### UI/UX Specifications & Constraints

- PDF Readability: If the report contains more than 8 columns, the default Layout Setting should automatically switch to "Landscape" to prevent the data table from becoming cramped or illegible in the final PDF.

### Technical Implementation Tasks

- [ ] Build the "Generate PDF Report" configuration modal.
- [ ] Integrate a robust backend PDF generation library (e.g., Puppeteer, pdfmake) capable of interpreting the layout variables, injecting the company logo, and rendering the data grid cleanly.
