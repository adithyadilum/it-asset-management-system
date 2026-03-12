# Epic 7: Asset Registration

## Summary

This epic governs the creation of new asset records within the IDAMS platform. Accessed via a right-side slide-out panel, the registration form is context-aware: it automatically locks the user into the current Pillar they initiated the action from (e.g., clicking "Add" from the Software page locks the form to Software) and dynamically updates based on the selected Subcategory. It heavily utilizes background automation, tying Manufacturer Models to predefined technical specs so IT staff don't have to manually type out hardware capabilities.

## In Scope

- A responsive, right-side slide-out registration panel.
- Context-locked pillar registration with dynamic subcategory toggling.
- Automated tracking ID generation using the strict format: `[Pillar]-[Subcategory]-[Number]` (e.g., `HRW-LAP-001`).
- Background technical detail assignment driven by Brand/Model selection.
- Four distinct registration flows mapped to the 4 system Pillars.
- A secure drag-and-drop file upload component for PDF purchase invoices.
- A consumable stock management subcategory under Hardware.

## Out of Scope / Limitations

- Bulk CSV/Excel uploading (This is handled separately in Epic 10).
- Barcode scanning via mobile device (This is handled in Epic 11).

### User Stories

- [US-7.1 — Universal Registration Panel & Automation](https://app.clickup.com/t/86ewvfe2t)
- [US-7.2 — Hardware Registration & Consumables](https://app.clickup.com/t/86ewvfe2z)
- [US-7.3 — Software Registration](https://app.clickup.com/t/86ewvfe34)
- [US-7.4 — Furniture & Fixtures Registration](https://app.clickup.com/t/86ewvfe39)
- [US-7.5 — Office Electronics Registration](https://app.clickup.com/t/86ewvfe3g)
- [US-7.6 — Financial Proof & Invoice Upload](https://app.clickup.com/t/86ewvfe3w)

---

## User Story: US-7.1 — Universal Registration Panel & Automation

- As a System User registering an asset,
- I want the form to automate as much data entry as possible and block me from making mistakes,
- So that I can register items rapidly without memorizing tracking ID formats or manually typing out technical specs that the system already knows.

### Acceptance Criteria (Gherkin)

- Scenario: The User Journey & Pillar Lock
  - Given I navigate to the "Hardware" pillar page using the main sidebar
  - When I click the primary "+ Add Asset" button in the registry header
  - Then a right-side slide-out panel appears
  - And the "Pillar" field at the top of the form is hard-locked to "Hardware" and cannot be changed.
![](https://t90181861921.p.clickup-attachments.com/t90181861921/07a2f561-d8d4-4410-8b7f-7aa7287f9ddd/Asset%20Registry%20Wizard%20Top%20highlighted.png)
- Scenario: Subcategory Default & Dynamic Swapping
  - Given I initiated the "+ Add Asset" action while specifically viewing the "Monitors" subcategory grid
  - When the slide-out form renders
  - Then the Subcategory field automatically defaults to "Monitors"
  - But I can open the dropdown and change it to "Laptops", which dynamically re-renders the form to show Laptop-specific fields.
![](https://t90181861921.p.clickup-attachments.com/t90181861921/c32296c1-f520-4bad-bf87-c2b301cf4b44/Asset%20Registry%20Wizard%20Selected%20sub%20category%20highlightd.png)
- Scenario: Background Technical Spec Assignment
  - Given I am filling out the base details for a new Laptop
  - When I select "Brand: Dell" and "Model: Latitude 5540"
  - Then the system automatically links the predefined Master Data technical details (e.g., 16GB RAM, i7 CPU) to this asset in the background
- Scenario: Tracking/Serial Number Generation
  - Given I am finalizing the registration
  - When the system generates the internal asset tracking ID
  - Then it strictly follows the format `[Pillar]-[Subcategory]-[Number]` (e.g., `HRW-LAP-0142`).

### UI/UX Specifications & Constraints

- Slide-Out UI: The panel must slide in smoothly from the right edge, covering roughly 40-50% of the screen width, and cast a dark semi-transparent shadow (`bg-black/50`) over the data grid behind it to maintain user focus.
- Submit Button: The primary Save/Submit button pinned to the bottom of the panel must use disabled styling (grayed out with a `not-allowed` cursor) until all mandatory fields are filled and valid.
- Form Sections: Long forms must be broken into visually distinct vertical sections (e.g., 1. Basic Info, 2. Specifications, 3. Financials) using subtle divider lines or accordion cards.

### Technical Implementation Tasks

- [ ] Build the Slide-Out Panel component and the React Hook Form structure.
- [ ] Write the frontend string-concatenation logic for the `[Pillar]-[Subcategory]-[Number]` ID format.
- [ ] Implement the `onChange` listener for the Model dropdown that securely binds the Epic 3 Master Data specs to the submission payload.

---

## User Story: US-7.2 — Hardware Registration & Consumables

- As an IT Operator,
- I want to register physical IT devices or bulk consumables,
- So that I can track physical inventory items and their individual manufacturer serial numbers.

### Acceptance Criteria (Gherkin)

- Scenario: Hardware Registration Elements
  - Given I navigate to the Hardware pillar and click "+ Add Asset"
  - When I select a standard subcategory like "Laptops" or "Mobiles"
  - Then the form dynamically renders Hardware-specific fields: `Manufacturer Serial Number` (Mandatory), `MAC Address` (Optional), `Condition`, and `Assigned User`.
![](https://t90181861921.p.clickup-attachments.com/t90181861921/427993fd-5630-40b5-9ceb-8875ba1ba50a/Asset%20Registry%20Wizard.png)
- Scenario: Consumable Hardware Subcategory
  - Given I navigate to the Hardware pillar and click "+ Add Asset"
  - When I change the Subcategory dropdown to "Consumables (Cables)"
  - Then the `Manufacturer Serial Number` and individual Tracking ID fields disappear entirely from the form
  - And a "Quantity to Add" field appears, allowing me to increment the bulk stock count instead of registering a unique asset.

### UI/UX Specifications & Constraints

- Consumables UI: The "Quantity to Add" field for consumables must be a Stepper Input (a number field flanked by `-` and `+` buttons for quick adjustments).
- MAC Address Formatting: The MAC Address input field should automatically format user keystrokes with colons or hyphens (e.g., `00:1A:2B...`).

### Technical Implementation Tasks

- [ ] Build dynamic form rendering rules specific to the Hardware pillar state.
- [ ] Implement the backend bypass for ID generation if the `Subcategory === 'Consumables'`.

---

## User Story: US-7.3 — Software Registration

- As an IT Operator,
- I want to register digital assets and software licenses via a specialized input form,
- So that I can accurately capture license keys, seat allocations, and agreement details without being blocked by irrelevant physical hardware fields.

### Acceptance Criteria (Gherkin)

- Scenario: Software Registration Elements
  - Given I navigate to the Software & Licenses registry and click "+ Add Asset"
  - When the "Asset Registry" side panel opens
  - Then physical inputs like "Location" and "Condition" are omitted entirely
  - And the upper form renders Software-specific fields: Software Name, Category, Agreement Type, Publisher, Payment Model, License Key, Total Seats, and Licensed Email.
  - And an image upload placeholder is available to set the software icon.
- Scenario: Purchase Details Section
  - Given I am filling out the Software Asset Registry form
  - When I scroll to the "Purchase Details" block
  - Then I can select a currency (e.g., "USD") from a dropdown
  - And I see fields for Purchase Date, Base Price, Shipping Cost, Tax, Vendor, Warranty Period, and Note.
  - And I can click "Attach Invoice" to upload the Invoice PDF.
- Scenario: Bulk Import License Registration
  - Given I click the "Import via CSV/Excel" option instead of single asset creation
  - When the import modal loads
  - Then I can drag-and-drop or browse to upload multiple files
  - And I see individual progress bars and upload statuses (e.g., "100%", "Uploading") for each file before clicking "Import License".

![](https://t90181861921.p.clickup-attachments.com/t90181861921/b5483e19-a9fa-45ed-a9de-717c5911a3c4/Asset%20Registry%20Wizard%20Software%20Asserts%20-%20Desktop.png)

### Technical Implementation Tasks

- [ ] Build dynamic form rendering rules specific to the Software pillar state.

---

## User Story: US-7.4 — Furniture & Fixtures Registration

- As a Manager,
- I want to register physical office furniture,
- So that I can track the location and condition of corporate property.

### Acceptance Criteria (Gherkin)

- Scenario: Furniture Registration Elements
  - Given I navigate to the Furniture & Fixtures pillar and click "+ Add Asset"
  - When I select the subcategory "Desks" or "Chairs"
  - Then the form renders Furniture-specific fields: `Building Location` (Mandatory), `Floor/Zone`, `Condition`, and `Dimensions` (if mapped in Epic 3).

### UI/UX Specifications & Constraints

- Location Grouping: The `Building Location` and `Floor/Zone` dropdowns must be visually grouped together on the form. Selecting a Building must filter the available Floors (dependent dropdown).
- Condition Indicators: The `Condition` dropdown options should feature color-coded status dots (e.g., New, Good, Fair, Poor) to give visual weight to the physical state of the asset.

### Technical Implementation Tasks

- [ ] Build dynamic form rendering rules specific to the Furniture pillar state, heavily enforcing Location selection logic.

---

## User Story: US-7.5 — Office Electronics Registration

- As a Facilities or IT Manager,
- I want to register shared electronic equipment,
- So that I can track high-value infrastructure and their condition.

### Acceptance Criteria (Gherkin)

- Scenario: Electronics Registration Elements
  - Given I navigate to the Office Electronics pillar and click "+ Add Asset"
  - When I select the subcategory "Projectors" or "Smart TVs"
  - Then the form renders Electronics-specific fields: `Building Location` (Mandatory), `Network IP/MAC Address` (Optional), and `Next Scheduled Maintenance Date`.

### UI/UX Specifications & Constraints

- IP Address Masking: The `Network IP` input field must use a Regex validation mask to ensure users can only type valid IPv4 or IPv6 formats (e.g., `___.___.___.___`).

### Technical Implementation Tasks

- [ ] Build dynamic form rendering rules specific to the Electronics pillar state.

---

## User Story: US-7.6 — Financial Proof & Invoice Upload

- As a Global Admin,
- I want to enter the exact purchase cost of an asset and attach the digital PDF invoice during the registration flow,
- So that Finance has verifiable proof of value to calculate accurate depreciation.

### Acceptance Criteria (Gherkin)

- Scenario: Multi-Currency Cost Breakdown
  - Given I am filling out the registration form for any pillar
  - When I reach the "Financials" section of the panel
  - And I select a currency (e.g., LKR) and enter $1000 into `Base Price`, $100 into `Tax`, and $50 into `Shipping`
  - Then the system automatically calculates a locked `Total Initial Cost` of $1150 and prepares to save the currency type alongside the record.
![](https://t90181861921.p.clickup-attachments.com/t90181861921/fe4d1421-e39f-48f7-bf4c-22fd2534d342/Purchase%20Details-%20Desktop.png)
- Scenario: Attaching an Invoice
  - Given I am on the "Financials" section of the registration panel
  - When I drag and drop a "Receipt.pdf" file into the upload dropzone
  - Then the UI shows a progress bar until the upload completes
  - And the file is securely linked to the asset record upon final form submission.
![](https://t90181861921.p.clickup-attachments.com/t90181861921/ff07fb21-5e1f-4bbf-968a-7387ddde2fa1/Asset%20Registry%20Wizard%20Selected%20sub%20category%20highlighted.png)

### UI/UX Specifications & Constraints

- Auto-Calculate UI: The `Total Initial Cost` field must have a distinct read-only appearance (e.g., a light gray background with a small padlock icon) so users understand they cannot manually edit the final sum.
- Currency Selector: The Currency dropdown should ideally include the currency symbol or flag next to the country code (e.g., 🇱🇰 LKR, 🇺🇸 USD).
- File Upload UX: The drag-and-drop zone must validate file types on the client side, showing an immediate red error border if a user tries to drop an unsupported file type (like `.exe` or `.zip`).

### Technical Implementation Tasks

- [ ] Implement a secure Drag & Drop file upload component.
- [ ] Integrate a cloud storage bucket API (AWS S3/Azure Blob) to handle the multipart file upload.
