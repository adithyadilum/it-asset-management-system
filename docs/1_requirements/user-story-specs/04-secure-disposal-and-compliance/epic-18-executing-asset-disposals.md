# Epic 18: Executing Asset Disposals

## Summary

This epic governs the final, secure execution of an asset disposal. It introduces a strict "Hard Stop" compliance modal requiring physical security confirmations (e.g., data wipes), the selection of a specific disposal method, and the upload of a legal E-Waste destruction certificate. To prevent accidental data loss, the execution button is locked behind an exact-text typing test. It also includes a specialized Bulk Processing workflow to handle the simultaneous retirement of large batches of equipment using a single shared receipt.

## In Scope

- The "Dispose Asset" Compliance Modal.
- Exact-text match form validation (typing the Asset ID).
- Mandatory security checkboxes (Data Wiped, Tags Removed).
- Drag-and-drop file upload integration mapping to cloud storage (AWS S3/Azure).
- A "Bulk Dispose" grid action and adapted bulk-execution modal.

## Out of Scope / Limitations

- Historical Archival: Moving the disposed records into the read-only `Disposal History` ledger is deferred to Epic 19 (Soft Delete Architecture).
- Vendor Dispatch: The system captures the receipt, but it does not automatically call a recycling vendor to physically pick up the hardware.

### User Stories

- [US-18.1 — Asset Disposal Modal (Single Asset)](https://app.clickup.com/t/86ewvt1tw)
- [US-18.2 — Documentation/E-Waste Certificate Upload](https://app.clickup.com/t/86ewvt1un)
- [US-18.3 — Bulk Disposal Processing](https://app.clickup.com/t/86ewvt1v5)

---

## User Story: US-18.1 — Asset Disposal Modal (Single Asset)

- As a Global Admin,
- I want to fill out a mandatory compliance form before finalizing a disposal,
- So that I have legal proof that the physical tags were removed, the hard drive was wiped, and the asset was properly recycled or sold.

### Acceptance Criteria (Gherkin)

- Scenario: Triggering the Execution Modal
  - Given I am reviewing a request in the `Disposal Request Review` panel (Epic 17)
  - When I click the primary red "Initiate Disposal" button
  - Then the "Dispose Asset" Hard Stop modal appears over the screen.
  - And a warning message explicitly states: "This action will permanently change the asset status to 'Disposed' and remove it from active financial tracking."
- Scenario: Form Validation & Security Checks
  - Given the "Dispose Asset" modal is open
  - When I attempt to click the "Confirm Disposal" button
  - Then it remains firmly disabled.
  - And I am forced to manually complete the following before it activates:
    1. Select a `Disposal Date`, `Reason for Disposal`, and `Disposal Method`.
    2. Check the box confirming: "Data wiped and factory reset confirmed."
    3. Check the box confirming: "All physical TIQRI asset tags removed."
    4. Upload a Documentation / E-Waste Receipt file.
- Scenario: Exact Text Confirmation (Fail-Safe)
  - Given I have filled out all the form fields and checkboxes
  - When I look at the bottom of the modal
  - Then I am prompted to type the exact Asset ID (e.g., `AST-0142`) into a text input to confirm.
  - And the "Confirm Disposal" button ONLY becomes clickable when the typed string perfectly matches the ID.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/281f808b-b303-487a-9b3f-84527b74cae8/Asset%20disposal%20modal%20(accept%20request)%20-%20Desktop.png)

### UI/UX Specifications & Constraints

- Destructive UX Patterns: The modal must utilize high-alert styling. The warning icon at the top and the "Confirm Disposal" button must use a high-contrast danger red color to signal finality.
- Confirmation Input: The text input box for the Asset ID confirmation must have a red border (`border-red-500`) to draw the user's eye and indicate it is a critical security step.

### Technical Implementation Tasks

#### Frontend

- [ ] Build the "Dispose Asset" compliance modal with: warning banner, Disposal Date picker, Reason for Disposal dropdown, Disposal Method dropdown, "Data wiped" checkbox, "Tags removed" checkbox, file upload zone (US-18.2), and exact Asset ID text confirmation input.
- [ ] Implement strict multi-condition React state management: the "Confirm Disposal" button only activates when ALL conditions are met (all dropdowns filled, both checkboxes checked, file uploaded, and text input exactly matches the Asset ID).

#### Backend

- [ ] Create a `POST /api/v1/assets/{id}/dispose` endpoint that validates all required fields (date, reason, method, checkboxes, receipt URL, text confirmation), updates the asset status to `Disposed`, writes the disposal record, and logs the event in the Audit Log.

---

## User Story: US-18.2 — Documentation/E-Waste Certificate Upload

- As a Global Admin,
- I want to upload a PDF or image of the destruction certificate directly to the disposal record,
- So that auditors can instantly download the proof of destruction without making me hunt through my email inbox.

### Acceptance Criteria (Gherkin)

- Scenario: Uploading the Legal Documentation
  - Given I am filling out the "Dispose Asset" modal
  - When I click "Choose File" in the Documentation section and select a PDF or JPEG
  - Then the UI displays an upload loading state.
  - And the file is securely uploaded to the cloud storage bucket (AWS S3/Azure Blob).
  - And upon successful upload, the generated secure URL is attached to the final disposal payload sent to the database.

### Technical Implementation Tasks

#### Frontend

- [ ] Integrate a drag-and-drop file upload component (e.g., React Dropzone) into the Dispose Asset modal's Documentation section.
- [ ] Implement client-side file type validation (allow `.pdf`, `.jpg`, `.jpeg`, `.png` only) and display an upload progress indicator.

#### Backend

- [ ] Create a `POST /api/v1/uploads/disposal-receipts` endpoint that accepts multipart file uploads, validates file type and size, and stores the file in the cloud storage bucket.
- [ ] Return the generated `file_url` or `file_key` to be attached to the disposal record payload.

#### Database

- [ ] Add a `disposal_receipt_url` column to the `DisposalRequests` table (or create a dedicated `DisposalRecords` table) to store the link to the uploaded E-Waste certificate.

---

## User Story: US-18.3 — Bulk Disposal Processing

- As a Global Admin,
- I want to select multiple pending assets and execute their disposal simultaneously using a single shared E-Waste certificate,
- So that I do not have to manually fill out the disposal form 30 times when a vendor hauls away a pallet of identical old monitors.

### Acceptance Criteria (Gherkin)

- Scenario: Triggering Bulk Disposal
  - Given I am on the `Pending Disposal` tab
  - When I use the checkboxes to multi-select multiple assets (e.g., 5 MacBook Pros)
  - Then a red "Dispose assets" button appears in the active Bulk Actions toolbar.
  - And clicking it opens the "Dispose X Assets" bulk compliance modal.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/480c9830-27a1-4f44-adcc-c80b96bc2643/Asset%20Disposal%20Pending%20bulk%20actions%20-%20Desktop.png)
- Scenario: The Bulk Modal Interface
  - Given the "Dispose 5 Assets" modal is open
  - Then the top of the modal displays a scrollable list box confirming the exact 5 items (Asset ID and Device Name) about to be destroyed.
  - And the rest of the form shares the exact same mandatory fields and checkboxes as the single-asset modal.
- Scenario: Dynamic Text Confirmation & Execution
  - Given I have filled out the bulk form and uploaded one single shared PDF
  - When I look at the final confirmation step
  - Then the prompt dynamically asks me to type: "DISPOSE 5 ASSETS".
  - And when I type it correctly and click "Confirm Bulk Disposal", the system successfully executes the status change for all 5 assets in a single transaction
  - And all 5 assets are permanently linked to the exact same uploaded receipt URL in the database.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/f1c03402-98e5-4879-9b6c-b369506aa1f1/Asset%20Disposal%20Pending%20bulk%20actions%20-%20Desktop-1.png)

### UI/UX Specifications & Constraints

- Scrollable List Box: To prevent the modal from growing taller than the user's screen when 30 items are selected, the list of target assets at the top of the modal must be contained within a fixed-height, scrollable container (`overflow-y: auto`, e.g., max height 120px).

### Technical Implementation Tasks

#### Frontend

- [ ] Add a red "Dispose assets" danger button to the Bulk Actions toolbar on the `Pending Disposal` grid, visible when rows are multi-selected.
- [ ] Build the Bulk Disposal modal: scrollable asset list box (max-height 120px, `overflow-y: auto`), shared compliance form (same fields as single-asset modal), and dynamic text confirmation prompt (`DISPOSE {count} ASSETS`).
- [ ] Implement the dynamic text-match validation: "Confirm Bulk Disposal" button only activates when the typed string exactly matches `DISPOSE {count} ASSETS`.

#### Backend

- [ ] Create a `POST /api/v1/assets/bulk-dispose` endpoint that: accepts an array of asset IDs plus the shared compliance payload (date, reason, method, checkboxes, receipt URL), processes all status changes in a single atomic database transaction, links the shared receipt URL to all disposal records, and writes individual Audit Log entries for each asset.
