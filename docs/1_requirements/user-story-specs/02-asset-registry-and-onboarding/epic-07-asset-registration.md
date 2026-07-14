# Epic 7: Asset Registration

## Summary

This epic governs the creation of new asset records within the IT Asset Management platform. Accessed via a right-side slide-out panel, the registration form is context-aware: it locks the user into the current Pillar they initiated the action from and dynamically updates based on the selected Subcategory. It introduces robust backend automation including transaction-safe sequential Asset Tag generation (`[Prefix]-[Number]`) and dynamic currency conversions using live exchange rates.

## In Scope

- A responsive, right-side slide-out registration panel.
- Context-locked pillar registration with dynamic subcategory toggling.
- Automated, transaction-safe tracking ID generation using sequence counters (e.g., `LAP-001`).
- Background technical detail assignment driven by Brand/Model selection.
- Distinct registration payload handlers for Hardware and Software.
- A secure file upload placeholder structure for PDF purchase invoices.
- A consumable stock management fallback for bulk items.

## Out of Scope / Limitations

- Bulk CSV/Excel uploading (This is handled separately in Epic 10).
- Barcode scanning via mobile device (This is handled in Epic 11).

---

### User Stories

- [US-7.1 — Universal Registration Panel & Automation](#user-story-us-71--universal-registration-panel--automation)
- [US-7.2 — Hardware Registration & Consumables](#user-story-us-72--hardware-registration--consumables)
- [US-7.3 — Software Registration](#user-story-us-73--software-registration)
- [US-7.4 — Furniture & Fixtures Registration](#user-story-us-74--furniture--fixtures-registration)
- [US-7.5 — Office Electronics Registration](#user-story-us-75--office-electronics-registration)
- [US-7.6 — Financial Proof & Invoice Upload](#user-story-us-76--financial-proof--invoice-upload)

---

## User Story: US-7.1 — Universal Registration Panel & Automation

- **As a** System User registering an asset,
- **I want** the form to automate as much data entry as possible and block me from making mistakes,
- **So that** I can register items rapidly without memorizing tracking ID formats or manually typing out technical specs that the system already knows.

### Acceptance Criteria (Gherkin)

- **Scenario: The User Journey & Pillar Lock**
  - **Given** I navigate to the "Hardware" pillar page using the main sidebar
  - **When** I click the primary "+ Add Asset" button in the registry header
  - **Then** a right-side slide-out panel appears
  - **And** the "Pillar" context is strictly locked to "Hardware".

- **Scenario: Subcategory Default & Dynamic Swapping**
  - **Given** I initiated the "+ Add Asset" action while specifically viewing the "Monitors" subcategory grid
  - **When** the slide-out form renders
  - **Then** the Subcategory field automatically defaults to "Monitors"
  - **But** I can open the dropdown and change it to "Laptops", which dynamically re-renders the form to show Laptop-specific fields.

- **Scenario: Background Technical Spec Assignment**
  - **Given** I am filling out the base details for a new Laptop
  - **When** I select "Brand: Dell" and "Model: Latitude 5540"
  - **Then** the system automatically links the predefined Master Data technical details (e.g., 16GB RAM, i7 CPU) to this asset in the background.

- **Scenario: Transaction-Safe Tracking ID Generation**
  - **Given** I am finalizing the registration of a new Laptop
  - **When** the `registerAsset` server action executes
  - **Then** the backend queries the database for the max sequence number matching the `LAP-` prefix
  - **And** safely inserts the new asset using a Drizzle ORM transaction
  - **But if** a race condition occurs and a duplicate `asset_tag` unique constraint is thrown, the system automatically retries the generation loop to find the next available sequence before failing.

### UI/UX Specifications & Constraints

- **Slide-Out UI:** The panel must slide in smoothly from the right edge, covering roughly 40-50% of the screen width, and cast a dark semi-transparent shadow (`bg-black/50`) over the data grid.
- **Submit Button:** The primary Save/Submit button pinned to the bottom of the panel must be disabled until required Zod validation schemas are satisfied.

### Technical Implementation Tasks

#### Frontend

- [x] Build the reusable Slide-Out Panel React component (40-50% width, dark backdrop overlay).
- [x] Integrate React Hook Form + Zod (`assetRegistrationSchema`) for form state management and validation.
- [x] Implement the Pillar lock mechanism reading the current routing context.

#### Backend

- [x] Create the `registerAsset` Server Action that accepts `FormData`, validates it, and persists the record.
- [x] Implement server-side Asset Tag generation mapping Model/Category prefixes (e.g. `LAP`) to sequence counters.
- [x] Write the automatic retry-loop logic inside the database transaction to safely handle `asset_tag` unique constraint violations (`23505`) during high-concurrency inserts.

---

## User Story: US-7.2 — Hardware Registration & Consumables

- **As an** IT Operator,
- **I want** to register physical IT devices or bulk consumables,
- **So that** I can track physical inventory items and their individual manufacturer serial numbers.

### Acceptance Criteria (Gherkin)

- **Scenario: Hardware Registration Elements**
  - **Given** I navigate to the Hardware pillar and click "+ Add Asset"
  - **When** I select a standard model
  - **Then** the form dynamically captures Hardware-specific fields: `Manufacturer Serial Number`, `Location`, and `Condition`.
  - **And** the database correctly sets the status to "Available".

- **Scenario: Consumable Hardware Subcategory**
  - **Given** I navigate to the Hardware pillar and click "+ Add Asset"
  - **When** I change the Subcategory dropdown to "Consumables (Cables)"
  - **Then** the `Manufacturer Serial Number` and individual Tracking ID fields disappear entirely from the form
  - **And** a "Quantity to Add" field appears, allowing me to increment the bulk stock count instead of registering a unique asset.

### Technical Implementation Tasks

#### Frontend

- [x] Build the conditional Hardware form rendering showing `Serial Number`, `Condition`, `Location`.
- [x] Build the Consumables variant: hide individual tracking ID and serial number fields, render the Stepper Input for "Quantity to Add".

#### Backend

- [x] Add `UNIQUE` constraint validation on `serial_number` within the database to prevent duplicate entries (handled via Postgres schema).
- [ ] Implement the backend bypass for Asset ID generation when `subcategory.type === 'Consumable'`: instead of creating individual records, increment a stock counter.

---

## User Story: US-7.3 — Software Registration

- **As an** IT Operator,
- **I want** to register digital assets and software licenses via a specialized input form,
- **So that** I can accurately capture license keys and seat allocations without being blocked by irrelevant physical hardware fields.

### Acceptance Criteria (Gherkin)

- **Scenario: Software Registration Database Linking**
  - **Given** I am registering a "Software" asset
  - **When** the `registerAsset` transaction executes
  - **Then** the backend successfully inserts the base record into the `assets` table
  - **And** automatically inserts a linked record into the `software_licenses` table containing the `licenseType`, `totalSeats`, and expiry dates.

### Technical Implementation Tasks

#### Frontend

- [x] Build the conditional Software form rendering.

#### Backend

- [x] Implement conditional transaction logic within `registerAsset` to insert `softwareLicenses` when `input.pillar === 'Software'`.

---

## User Story: US-7.4 — Furniture & Fixtures Registration

- **As a** Manager,
- **I want** to register physical office furniture,
- **So that** I can track the location and condition of corporate property.

### Acceptance Criteria (Gherkin)

- **Scenario: Furniture Registration Elements**
  - **Given** I navigate to the Furniture & Fixtures pillar and click "+ Add Asset"
  - **When** I select the subcategory "Desks" or "Chairs"
  - **Then** the form renders Furniture-specific fields: `Building Location` (Mandatory) and `Condition`.

### Technical Implementation Tasks

#### Frontend

- [x] Build the conditional Furniture form rendering showing `Building Location` and `Condition`.

---

## User Story: US-7.5 — Office Electronics Registration

- **As a** Facilities or IT Manager,
- **I want** to register shared electronic equipment,
- **So that** I can track high-value infrastructure and their condition.

### Acceptance Criteria (Gherkin)

- **Scenario: Electronics Registration Elements**
  - **Given** I navigate to the Office Electronics pillar and click "+ Add Asset"
  - **When** I select the subcategory "Projectors" or "Smart TVs"
  - **Then** the form renders Electronics-specific fields: `Building Location` (Mandatory) and `Network IP/MAC Address` (Optional).

### Technical Implementation Tasks

#### Frontend

- [x] Build the conditional Electronics form rendering.

---

## User Story: US-7.6 — Financial Proof & Invoice Upload

- **As a** Global Admin,
- **I want** to enter the exact purchase cost of an asset and attach the digital PDF invoice during the registration flow,
- **So that** Finance has verifiable proof of value to calculate accurate depreciation.

### Acceptance Criteria (Gherkin)

- **Scenario: Multi-Currency Cost Breakdown & Live Conversion**
  - **Given** I am filling out the "Financials" section of the registration panel
  - **When** I enter costs in a foreign currency (e.g., USD)
  - **Then** the backend utilizes `fetchLiveExchangeRates` during insertion
  - **And** computes the conversion rate back to the base currency (LKR)
  - **And** saves the base price, tax, shipping, and total cost precisely to the `asset_purchases` table.

- **Scenario: Invoice Upload Placeholder**
  - **Given** I am registering an asset
  - **When** I attach an `invoiceFile` in the `FormData` payload
  - **Then** the backend acknowledges the file and generates a temporary `uploadedInvoiceUrl` placeholder before saving.

### Technical Implementation Tasks

#### Frontend

- [x] Build the "Financials" form section capturing currency codes, tax, shipping, and base price.

#### Backend

- [x] Integrate `fetchLiveExchangeRates()` and `convertCurrencyAmount()` into the `registerAsset` and bulk import pipelines.
- [x] Map the financial breakdown to the `asset_purchases` Drizzle schema.
