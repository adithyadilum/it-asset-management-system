# Epic 18: Executing Asset Disposals

## Summary

This epic governs the final, secure execution of an asset disposal. It introduces a strict "Hard Stop" compliance modal requiring physical security confirmations (e.g., data wipes), the selection of a specific disposal method, and the upload of legal E-Waste destruction certificates or sales receipts. To prevent accidental data loss, the execution button is locked behind an exact-text typing test. It also includes a specialized Bulk Processing workflow to handle the simultaneous retirement of large batches of equipment using shared documentation.

## In Scope

- The "Dispose Asset" Compliance Modal.
- Exact-text match form validation (typing the Asset ID or Bulk count).
- Mandatory security checkboxes (Data Wiped, Tags Removed).
- Drag-and-drop file upload integration mapping to cloud storage (e.g., Vercel Blob) supporting multiple attachments.
- Recording the Actual Salvage Value for financial accounting (calculating impact against book value).
- A "Bulk Dispose" grid action and adapted bulk-execution modal.

## Out of Scope / Limitations

- Vendor Dispatch: The system captures the receipt, but it does not automatically call a recycling vendor to physically pick up the hardware.

### User Stories

- [US-18.1 — Asset Disposal Modal (Single Asset)](#user-story-us-181--asset-disposal-modal-single-asset)
- [US-18.2 — Documentation/E-Waste Certificate Upload](#user-story-us-182--documentatione-waste-certificate-upload)
- [US-18.3 — Bulk Disposal Processing](#user-story-us-183--bulk-disposal-processing)

---

## User Story: US-18.1 — Asset Disposal Modal (Single Asset)

- As a Global Admin,
- I want to fill out a mandatory compliance form before finalizing a disposal,
- So that I have legal proof that the physical tags were removed, the hard drive was wiped, and the asset was properly recycled, donated, or sold.

### Acceptance Criteria (Gherkin)

- Scenario: Triggering the Execution Modal
  - Given I am reviewing an approved request in the `Pending Disposal` panel
  - When I click the primary red "Dispose Asset" button
  - Then the "Dispose Asset" Hard Stop modal appears over the screen.
  - And a warning message explicitly states: "This action will permanently change the asset status to 'Disposed' and remove it from active financial tracking."

- Scenario: Form Validation & Security Checks
  - Given the "Dispose Asset" modal is open
  - When I attempt to click the "Confirm Disposal" button
  - Then it remains firmly disabled.
  - And I am forced to manually complete the following before it activates:
    1. Select a `Reason for Disposal` (e.g., Defective / Broken, Obsolete, Lost).
    2. Select a `Disposal Method` (e.g., E-waste Recycling, Sold / Auctioned, Donated, Stolen / Written Off).
    3. (Optional) Enter the `Actual Salvage Value ($)`.
    4. Check the box confirming: "Data wiped and factory reset confirmed."
    5. Check the box confirming: "All physical TIQRI asset tags removed."
    6. Upload at least one Documentation / E-Waste Receipt file.

- Scenario: Capturing Salvage Value for Financials
  - Given I am disposing of an asset that was sold
  - When I select the "Sold / Auctioned" method
  - And I enter "150.00" in the `Actual Salvage Value ($)` field
  - Then upon execution, the system records the salvage value and compares it against the `Current Book Value` at the time of disposal for final financial auditing.

- Scenario: Exact Text Confirmation (Fail-Safe)
  - Given I have filled out all the form fields and checkboxes
  - When I look at the bottom of the modal
  - Then I am prompted to type the exact Asset Tag (e.g., `AST-0142`) into a text input to confirm.
  - And the "Confirm Disposal" button ONLY becomes clickable when the typed string perfectly matches the Tag.

### UI/UX Specifications & Constraints

- Destructive UX Patterns: The modal must utilize high-alert styling. The warning icon at the top, the confirmation input border, and the "Confirm Disposal" button must use a high-contrast danger red color to signal finality.

### Technical Implementation Tasks

#### Frontend

- [x] Build the "Dispose Asset" compliance modal with: warning banner, Reason for Disposal dropdown, Disposal Method dropdown, Salvage Value input, "Data wiped" checkbox, "Tags removed" checkbox, multi-file upload zone (US-18.2), and exact Asset ID text confirmation input.
- [x] Implement strict multi-condition React state management: the "Confirm Disposal" button only activates when ALL conditions are met.

#### Backend

- [x] Create a `executeAssetDisposal` server action that validates all required fields, updates the asset status to `Disposed` (soft delete/archived), writes the disposal record (including calculated salvage value), and logs the event in the Audit Log.

---

## User Story: US-18.2 — Documentation/E-Waste Certificate Upload

- As a Global Admin,
- I want to upload multiple PDFs or images of destruction certificates directly to the disposal record,
- So that auditors can instantly download the proof of destruction without making me hunt through my email inbox.

### Acceptance Criteria (Gherkin)

- Scenario: Uploading Legal Documentation
  - Given I am filling out the "Dispose Asset" modal
  - When I click or drag into the "Upload Certificates or Receipts" section
  - And select one or more files (.PDF, .JPG, .PNG up to 4.5MB)
  - Then the UI displays an upload loading state.
  - And the files are securely uploaded to cloud storage.
  - And upon successful upload, the attached files are listed with their filenames and a remove ("X") button.

- Scenario: Removing an Uploaded Certificate
  - Given I have successfully uploaded a certificate
  - When I click the "X" remove button next to the filename
  - Then the file is removed from the pending disposal payload.

### Technical Implementation Tasks

#### Frontend

- [x] Integrate a drag-and-drop file upload component (`FileUploadZone`) into the modal.
- [x] Implement client-side support for multiple file uploads, displaying an attached files list with remove functionality.

#### Backend

- [x] Create a `uploadDisposalReceipt` server action that accepts multipart file uploads and stores the file in cloud storage.
- [x] Upon final disposal execution, iterate over all `receiptUrls` and insert them into the `AssetDocuments` table, linked to the disposed asset.

---

## User Story: US-18.3 — Bulk Disposal Processing

- As a Global Admin,
- I want to select multiple pending assets and execute their disposal simultaneously using a shared E-Waste certificate,
- So that I do not have to manually fill out the disposal form 30 times when a vendor hauls away a pallet of identical old monitors.

### Acceptance Criteria (Gherkin)

- Scenario: Triggering Bulk Disposal
  - Given I am on the `Pending Disposals` grid
  - When I use the checkboxes to multi-select multiple assets (e.g., 5 MacBook Pros)
  - Then a "Dispose assets" button appears in the active Bulk Actions toolbar.
  - And clicking it opens the "Dispose X Assets" bulk compliance modal.

- Scenario: The Bulk Modal Interface
  - Given the "Dispose 5 Assets" modal is open
  - Then the top of the modal displays a scrollable list box confirming the exact 5 items (Asset Tag and Device Name) about to be destroyed.
  - And the rest of the form shares the exact same mandatory fields and checkboxes as the single-asset modal.
  - And any `Actual Salvage Value` entered is evenly divided across all selected assets in the database transaction.

- Scenario: Dynamic Text Confirmation & Execution
  - Given I have filled out the bulk form and uploaded shared certificates
  - When I look at the final confirmation step
  - Then the prompt dynamically asks me to type: "DISPOSE 5 ASSETS".
  - And when I type it correctly and click "Confirm Bulk Disposal", the system successfully executes the status change for all 5 assets in a single atomic transaction.
  - And all 5 assets are permanently linked to the exact same uploaded receipt URLs in the `AssetDocuments` table.

### UI/UX Specifications & Constraints

- Scrollable List Box: The list of target assets at the top of the modal is contained within a fixed-height, scrollable container to prevent the modal from growing taller than the user's screen when many items are selected.

### Technical Implementation Tasks

#### Frontend

- [x] Build the Bulk Disposal modal layout variant: scrollable asset list box, shared compliance form, and dynamic text confirmation prompt (`DISPOSE {count} ASSETS`).
- [x] Implement the dynamic text-match validation logic based on the count of selected assets.

#### Backend

- [x] Modify the `executeAssetDisposal` server action to handle arrays of `disposalIds` and `assetIds`.
- [x] Process all status changes, salvage value division (`salvagePerAsset = totalSalvage / count`), soft deletion, and document attachment in a single atomic database transaction.
- [x] Write individual Audit Log entries for each disposed asset.
