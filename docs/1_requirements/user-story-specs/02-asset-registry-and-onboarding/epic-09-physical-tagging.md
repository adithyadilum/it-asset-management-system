# Epic 9: Physical Tagging & Tag Printing

## Summary

This epic acts as the bridge between the digital database and the physical world. It ensures that every physical asset can be easily identified by generating unique 2D QR codes and routing URLs. It provides IT Operators with a robust Print Layout Engine that generates precise, strict-dimension PDFs entirely on the client-side. Whether printing a single tag, generating a bulk A4 grid, or using a thermal printer, the system utilizes `@react-pdf/renderer` and local QR generation to output an identically scaled, high-resolution sticker design without ever sending secure routing links to third-party QR generation APIs.

## In Scope

- Automatic routing URL generation for every registered asset (e.g. `assets.tiqri.com/assets/LAP-001`).
- Real-time client-side generation of Base64/SVG QR codes using the `qrcode` and `qrcode.react` libraries.
- An immediate "Print Initial Tag" prompt upon successful asset registration.
- A single-tag preview modal triggered from the Asset Details panel for reprints.
- A Print Layout Engine supporting bulk A4 PDF generation using a constant, fixed-size grid layout.
- Thermal printer format support for single continuous labels.
- Automatic memory cleanup of `Blob` URLs to prevent browser memory leaks during bulk printing.

## Out of Scope / Limitations

- RFID Tracking or Real-Time Location Services (RTLS) are strictly out of scope.
- Dynamic tag sizing (e.g., users cannot make the QR code "bigger" for a server and "smaller" for a mouse; the tag size is globally locked).
- The actual camera scanning interface (Covered in Epic 11: Mobile Companion).

## Assumptions & Dependencies

- Relies on the frontend Bulk Action selected-row state from Epic 6.
- Assumes browsers allow pop-ups for new tab print generation (system gracefully falls back to an error toast if blocked).

---

### User Stories

- [US-9.1 — Single Tag Generation & Reprinting](#user-story-us-91--single-tag-generation--reprinting)
- [US-9.2 — Bulk Print Engine (A4 Constant Grid)](#user-story-us-92--bulk-print-engine-a4-constant-grid)
- [US-9.3 — Thermal Printer Support](#user-story-us-93--thermal-printer-support)

---

## User Story: US-9.1 — Single Tag Generation & Reprinting

- **As an** IT Operator,
- **I want** the system to instantly generate a standard-sized QR sticker when I register an asset, and allow me to reprint it later if needed,
- **So that** I can tag hardware the exact moment it enters the system, or easily replace a sticker if it gets scratched off in the field.

### Acceptance Criteria (Gherkin)

- **Scenario: Initial Tag Generation (At Registration)**
  - **Given** I have just successfully submitted the "Add Asset" registration form (from Epic 7)
  - **When** the success confirmation appears on screen
  - **Then** the system automatically generates the QR Code and routing URL in the background
  - **And** displays the final tag preview directly in the success modal with a primary "Print Tag" button so I can immediately sticker the device on my desk.

- **Scenario: Replacement Tag Preview (From Asset Details)**
  - **Given** an asset exists in the database
  - **When** I click the "QR Code" icon button on its Asset Details panel (from Epic 8)
  - **Then** the `AssetTagDialog` opens displaying the exact same standard tag layout
  - **And** I can click "Print Asset Tag" to trigger the layout selection modal.

- **Scenario: Secure Offline URL Generation**
  - **Given** the system generates the tag for `LAP-001`
  - **When** the 2D QR Code is rendered
  - **Then** it encodes a direct routing URL mapping to `window.location.origin` (e.g., `https://assets.tiqri.com/assets/LAP-001`)
  - **And** the data URL generation is performed locally via the `qrcode` library so that secure internal infrastructure routes are never leaked to external public APIs.

### UI/UX Specifications & Constraints

- **Strict Tag Layout:** The physical sticker design must be fixed and immutable. It must strictly contain: The company logo (left), the Asset ID (large, monospace), the Model Name (truncated), and the 2D QR Code (right). It must maintain a strict aspect ratio regardless of where it is previewed.
- **Hydration State:** During Server-Side Rendering (SSR), the tag preview must show a skeleton pulse state, because `window.location.origin` is only available on the client.

### Technical Implementation Tasks

#### Frontend

- [x] Integrate a QR code generation library (`qrcode.react`) to render SVG/Canvas QR codes safely on the client without third-party requests.
- [x] Build the `PhysicalTag` component displaying the fixed-layout sticker design: company logo, Asset ID in monospace, and QR code.
- [x] Build the `AssetTagDialog` preview modal.
- [x] Wire the "QR Code" button on the Epic 8 Asset Details panel to open the modal for reprinting.
- [x] Implement the `window.location.origin` SSR safety check, showing an animated skeleton pulse before hydration completes.

---

## User Story: US-9.2 — Bulk Print Engine (A4 Constant Grid)

- **As an** IT Operations Admin,
- **I want** to select multiple assets and generate a formatted PDF of sticker tags on a standard A4 sheet,
- **So that** I can load commercial sticker paper into a normal office printer and tag 30 laptops at once, knowing the alignment will be perfect.

### Acceptance Criteria (Gherkin)

- **Scenario: Triggering Bulk Print**
  - **Given** I have selected 30 rows in the Hardware data grid
  - **When** I click "Print QR Code" from the Bulk Action Toolbar
  - **Then** the `PrintConfigurationModal` appears asking me to confirm the layout ("A4 Sheet" or "Thermal Roll").

- **Scenario: A4 Fixed-Grid PDF Generation**
  - **Given** I confirm the bulk print for 30 assets using the "A4" layout
  - **When** the client-side `@react-pdf/renderer` generates the blob
  - **Then** a new browser tab opens displaying the PDF document
  - **And** the print dialog is automatically triggered (`window.print()`).
  - **And** the 30 tags are arranged in a strict, constant grid layout matching a standard A4 sticker sheet template.

- **Scenario: Memory Leak Prevention & Popup Blockers**
  - **Given** the PDF is generated and sent to a new tab
  - **When** the printing is finished
  - **Then** the system utilizes an `afterprint` event listener to immediately execute `URL.revokeObjectURL(blobUrl)`, preventing browser memory bloat.
  - **But if** a popup blocker stops the new tab from opening, a `tiqriToast.error` is triggered and the blob is revoked immediately.

### Technical Implementation Tasks

#### Frontend

- [x] Build the `PrintConfigurationModal` triggered from the Bulk Action Toolbar, passing down the layout selection format.
- [x] Integrate the `@react-pdf/renderer` library to assemble PDF vector graphics entirely on the frontend.
- [x] Implement the `generateAndPrintTagPdf` utility that locally pre-generates QR data URLs using the `qrcode` library before passing them to the PDF renderer.
- [x] Write popup blocker detection (`if (!printWindow)`) and display an error toast.
- [x] Implement Blob URL memory cleanup (`URL.revokeObjectURL`) triggered by the `afterprint` browser event.

---

## User Story: US-9.3 — Thermal Printer Support

- **As an** IT Operations Admin,
- **I want** to optionally generate a print file optimized for continuous thermal label printers,
- **So that** I can print weatherproof polyester tags without wasting an entire A4 sheet for just a few labels.

### Acceptance Criteria (Gherkin)

- **Scenario: Continuous Roll PDF Generation**
  - **Given** I am generating tags for 5 selected assets
  - **When** I select the "Thermal Roll" layout format
  - **Then** the system generates a PDF document containing 5 separate pages instead of a grid
  - **And** the page size of the PDF is dynamically set to the exact physical dimensions of the standard tag (e.g., 2x1 inches)
  - **So that** the final printed thermal label is physically identical to a label peeled off the A4 sheet.

### Technical Implementation Tasks

#### Frontend

- [x] Add a "Layout Format" toggle to the `PrintConfigurationModal` with options for "A4 Sheet" (default) and "Thermal Roll".
- [x] Build conditional page size logic within `TagPdfDocument` so that the thermal selection renders single items per dynamic page bounds.
- [x] Enforce the same internal `<View>` layout constraints (logo, QR, Asset ID) used in US-9.2 to guarantee visual parity across both output formats.
