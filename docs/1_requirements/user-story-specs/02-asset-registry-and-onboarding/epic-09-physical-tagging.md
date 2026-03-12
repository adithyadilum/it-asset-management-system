# Epic 9: Physical Tagging & Tag Printing

## Summary

This epic acts as the bridge between the digital database and the physical world. It ensures that every physical asset can be easily identified by generating unique 2D QR codes and routing URLs. It provides IT Operators with a Print Layout Engine that strictly enforces a single, fixed-size physical tag design. Whether printing a single tag immediately after registration, generating a bulk A4 grid, or optionally using a thermal printer, the resulting physical sticker will always be dimensionally identical.

## In Scope

- Automatic routing URL generation for every registered asset.
- Real-time generation of Base64/SVG QR codes.
- An immediate "Print Initial Tag" prompt upon successful asset registration.
- A single-tag preview modal triggered from the Asset Details panel for reprints.
- A Print Layout Engine supporting bulk A4 PDF generation using a constant, fixed-size grid.
- _(Optional)_ Thermal printer format support for single continuous labels.

## Out of Scope / Limitations

- RFID Tracking or Real-Time Location Services (RTLS) are strictly out of scope.
- Dynamic tag sizing (e.g., users cannot make the QR code "bigger" for a server and "smaller" for a mouse; the tag size is globally locked).
- The actual camera scanning interface (Covered in Epic 11: Mobile Companion).

## Assumptions & Dependencies

- Relies on the frontend Bulk Action selected-row state from Epic 6.
- Relies on the system URL structure being finalized so the embedded QR routing links do not break.

### User Stories

- [US-9.1 — Single Tag Generation & Reprinting](https://app.clickup.com/t/86ewvhrgh)
- [US-9.2 — Bulk Print Engine (A4 Constant Grid)](https://app.clickup.com/t/86ewvhrh7)
- [US-9.3 — \[Optional\] Thermal Printer Support](https://app.clickup.com/t/86ewvhrj2)

---

## User Story: US-9.1 — Single Tag Generation & Reprinting

- As an IT Operator,
- I want the system to instantly generate a standard-sized QR sticker when I register an asset, and allow me to reprint it later if needed,
- So that I can tag hardware the exact moment it enters the system, or easily replace a sticker if it gets scratched off in the field.

### Acceptance Criteria (Gherkin)

- Scenario: Initial Tag Generation (At Registration)
  - Given I have just successfully submitted the "Add Asset" registration form (from Epic 7)
  - When the success confirmation appears on screen
  - Then the system automatically generates the QR Code and routing URL in the background
  - And displays the final tag preview directly in the success modal with a primary "Print Tag" button so I can immediately sticker the device on my desk.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/0dff3d22-d7ad-4df8-8ef5-19d261649e08/Asset%20Registry%20Succesful%20Toast-%20Desktop.png)
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/6ae255cd-2f31-496b-86b2-bb1ebf53bd40/Asset%20Registry%20Succesful%20QR%20preview-%20Desktop.png)
- Scenario: Replacement Tag Preview (From Asset Details)
  - Given an asset exists in the database
  - When I click the "QR Code" icon button on its Asset Details panel (from Epic 8)
  - Then the preview modal opens displaying the exact same standard tag layout
  - And I can click "Print Tag" to generate a replacement.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/61fe097e-f864-4024-86e1-c821d8928a39/Asset%20Details%20(QR%20preview)-%20Desktop.png)
- Scenario: Secure URL Routing Generation
  - Given the system generates the tag for `LAP-HR-220`
  - When the 2D QR Code is rendered
  - Then it encodes a direct, immutable routing URL (e.g., [`assets.tiqri.com/scan/LAP-HR-220`](http://assets.tiqri.com/scan/LAP-HR-220)).

### UI/UX Specifications & Constraints

- Strict Tag Layout: The physical sticker design must be fixed and immutable. It must strictly contain: The company logo (top), the 2D QR Code (center), and the Asset ID (bottom, monospace font). It must maintain a strict aspect ratio regardless of where it is previewed.

### Technical Implementation Tasks

#### Frontend

- [ ] Integrate a QR code generation library (e.g., `qrcode.react` or `qrcode`) to render SVG/Canvas QR codes on the client.
- [ ] Build the Tag Preview Modal component displaying the fixed-layout sticker design: company logo (top), QR code (center), Asset ID in monospace (bottom).
- [ ] Hook the QR generation and Tag Preview Modal into the Epic 7 registration success callback.
- [ ] Wire the "QR Code" button on the Epic 8 Asset Details panel to open the same Tag Preview Modal for reprinting.
- [ ] Implement the "Print Tag" button that triggers the browser's `window.print()` API with a print-specific CSS stylesheet for the tag.

#### Backend

- [ ] Implement the routing URL generation logic: compose the URL using the system domain and asset tracking ID (e.g., `assets.tiqri.com/scan/{assetId}`).
- [ ] Store the generated `qr_url` in the asset record upon creation, ensuring it points to the Mobile Lookup PWA route (Epic 11).

---

## User Story: US-9.2 — Bulk Print Engine (A4 Constant Grid)

- As an IT Operations Admin,
- I want to select multiple assets and generate a formatted PDF of sticker tags on a standard A4 sheet,
- So that I can load commercial sticker paper into a normal office printer and tag 30 laptops at once, knowing the alignment will be perfect.

### Acceptance Criteria (Gherkin)

- Scenario: Triggering Bulk Print
  - Given I have selected 30 rows in the Hardware data grid
  - When I click "Print QR Code" from the Bulk Action Toolbar
  - Then a print configuration modal appears asking me to confirm the A4 layout.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/47a00ef1-e95f-49c8-8105-55c4990e37a0/Bulk%20Tranfer-Desktop.png)
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/6ba60eb9-07e3-4965-b731-6fe31d3f1da4/Print%20OR%20Pop%20Up-Desktop.png)
- Scenario: A4 Fixed-Grid PDF Generation
  - Given I confirm the bulk print for 30 assets
  - When the backend generates the downloadable PDF document and opened in a new tab.
  - Then the 30 tags are arranged in a strict, constant grid (e.g., 3 columns by 10 rows)
  - And every individual tag in the grid is rendered at the exact same physical dimensions as the Single Print preview.

### UI/UX Specifications & Constraints

- Loading State: Generating a PDF with multiple high-res images can take time. The UI must display a clear "Generating PDF..." loading state to prevent the user from clicking multiple times.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/a6b7268b-6dae-4778-9824-2a9c08467c94/Print%20OR%20Pop%20Up-Desktop%20(1).png)

### Technical Implementation Tasks

#### Frontend

- [ ] Build the Bulk Print configuration modal triggered from the Bulk Action Toolbar's "Print QR Code" button, showing a count of selected assets and layout confirmation.
- [ ] Implement the "Generating PDF..." loading state with a disabled button to prevent duplicate submissions.

#### Backend

- [ ] Integrate a robust server-side PDF generation library (e.g., `pdfmake`, `puppeteer`, or `pdf-lib`).
- [ ] Create a `POST /api/v1/assets/print-tags` endpoint that accepts an array of asset IDs, generates QR codes for each, and composes them into a single A4 PDF document.
- [ ] Hardcode the exact PDF millimeter dimensions (margins, padding, cell size) to align perfectly with a standard A4 sticker sheet template (e.g., Avery 5160).
- [ ] Stream the generated PDF back to the client for download or new-tab preview.

---

## User Story: US-9.3 — [Optional] Thermal Printer Support

- As an IT Operations Admin,
- I want to optionally generate a print file optimized for continuous thermal label printers,
- So that I can print weatherproof polyester tags without wasting an entire A4 sheet for just a few labels.

### Acceptance Criteria (Gherkin)

- Scenario: Continuous Roll PDF Generation
  - Given I am generating tags for 5 selected assets
  - When I select the "Thermal Roll" layout format
  - Then the system generates a PDF document containing 5 separate pages
  - And the page size of the PDF is dynamically set to the exact physical dimensions of the standard tag (e.g., 2x1 inches)
  - So that the final printed thermal label is physically identical to a label peeled off the A4 sheet.
  ![](blob:https://app.clickup.com/a0989bfe-a052-4fb6-868d-c2dda7870760)

### Technical Implementation Tasks

#### Frontend

- [ ] Add a "Layout Format" toggle/dropdown to the Bulk Print configuration modal: options for "A4 Sheet" (default) and "Thermal Roll".

#### Backend

- [ ] Build a secondary PDF template configuration in the `print-tags` endpoint specifying custom page dimensions tailored for Zebra/Dymo standard label rolls (e.g., 2x1 inch pages).
- [ ] Enforce the same tag layout constraints (logo, QR, Asset ID) used in US-9.2 to guarantee visual parity across both A4 and thermal output formats.