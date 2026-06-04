# Epic 6: Asset Registries & Data Grids

## Summary

This epic builds the central command center for all asset tracking. It implements four distinct, high-density data grids corresponding to the system's hardcoded pillars grouped in the sidebar: IT & Digital (Hardware, Software) and Office (Furniture & Fixtures, Office Electronics), plus a Unified Master Inventory Hub. It introduces a dynamic, dropdown-driven page heading for rapid subcategory switching (e.g., Laptops vs. Monitors) and equips staff with powerful Omni-Search, filtering, and bulk-action capabilities.

## In Scope

- Four dedicated sidebar navigation routes for the Main Pillars and one unified "All Assets" view.
- A dual-search architecture: A global Omni-Search (`Cmd+K`) in the top nav, and a local text search within the registry header.
- A universal dashboard header featuring a dynamic Subcategory Dropdown, a "Filters" menu, and a primary "+ Add Asset" button.
- High-density React data tables with column sorting, row-selection counters, and server-side pagination.
- Multi-select checkboxes for executing transactional bulk operations (e.g., changing status or location for multiple assets).

## Out of Scope / Limitations

- The actual functionality of the "+ Add Asset" button (form rendering and submission) is deferred to Epic 7.
- The detailed Slide-Out Panel (Viewing an individual asset's deep history) is covered in Epic 8.

## Assumptions & Dependencies

- Relies on Master Data (Categories/Subcategories) established in Epic 3 to populate the heading dropdown menus.
- Role-based restrictions from Epic 2 dictate who can execute bulk updates versus read-only viewing.

---

### User Stories

- [US-6.1 — Global Omni-Search (Cmd+K)](#user-story-us-61--global-omni-search-cmdk)
- [US-6.2 — Universal Registry Header & Local Table Filter](#user-story-us-62--universal-registry-header--local-table-filter)
- [US-6.3 — Hardware Inventory Grid](#user-story-us-63--hardware-inventory-grid)
- [US-6.4 — Software & Licenses Grid](#user-story-us-64--software--licenses-grid)
- [US-6.5 — Furniture & Fixtures Grid](#user-story-us-65--furniture--fixtures-grid)
- [US-6.6 — Office Electronics Grid](#user-story-us-66--office-electronics-grid)
- [US-6.7 — Advanced Grid Controls (Filtering, Sorting, & Pagination)](#user-story-us-67--advanced-grid-controls-filtering-sorting--pagination)
- [US-6.8 — Bulk Operations](#user-story-us-68--bulk-operations)
- [US-6.9 — Unified Master Inventory Hub](#user-story-us-69--unified-master-inventory-hub)

---

## User Story: US-6.1 — Global Omni-Search (Cmd+K)

- **As a** System User,
- **I want** a universal search bar accessible from anywhere in the application,
- **So that** I can instantly search for specific database records, navigate to different modules, or execute system actions (like "Add Asset") using only my keyboard.

### Acceptance Criteria (Gherkin)

- **Scenario: Keyboard Shortcut Activation**
  - **Given** I am anywhere in the application
  - **When** I press the `Cmd+K` (Mac) or `Ctrl+K` (Windows) keyboard shortcut
  - **Then** the Omni-Search modal overlay instantly appears over the screen, with the text cursor already focused in the input field.

- **Scenario: Searching for Database Records**
  - **Given** the Omni-Search modal is open
  - **When** I type the serial number "PC1A2B3C" or "Jane Doe"
  - **Then** the system queries the backend route (`/api/v1/search`)
  - **And** returns a categorized list of matching Assets, Users, or Master Data.

- **Scenario: Searching for System Navigation**
  - **Given** the Omni-Search modal is open
  - **When** I type "Audit" or "Settings"
  - **Then** the system displays a "Pages" result group
  - **And** hitting Enter instantly navigates me to the System Audit Log or Settings dashboard.

- **Scenario: Throttling & Debouncing Search Traffic**
  - **Given** I am a fast typist looking for an asset
  - **When** I rapidly type "MacBook Pro M2" into the Omni-Search input
  - **Then** the frontend debounces my keystrokes
  - **And** only fires the backend multi-table query once I pause typing, protecting the database from unnecessary load.

- **Scenario: Omni-Search Empty State Handling**
  - **Given** I open the Omni-Search modal
  - **When** I type an obscure serial number like "XYZ99999" that does not exist
  - **Then** the system completes the backend query and returns zero results
  - **And** gracefully displays an empty state message (e.g., "No results found") instead of breaking the layout.

### UI/UX Specifications & Constraints

- **Categorized Results:** The search results must not be a flat list. They must be visually grouped by type using sticky sub-headers (e.g., `PAGES`, `REPORTS`, `ASSETS`, `USERS`).
- **Keyboard First:** The entire interface must be fully navigable using the `Up` and `Down` arrow keys, and selections must be executed with the `Enter` key.

### Technical Implementation Tasks

#### Frontend
- [x] Build the Command Palette UI component (Omni-Search Trigger/Modal).
- [x] Register the global `Cmd+K` / `Ctrl+K` keyboard shortcut listener.
- [x] Implement a static frontend index of all system routes (Pages) and global functions.
- [x] Implement debouncing logic on the input field.
- [x] Implement empty state visual feedback within the command palette.

#### Backend
- [x] Create an optimized multi-table search endpoint (`GET /api/v1/search`) that concurrently queries Assets and Users.

---

## User Story: US-6.2 — Universal Registry Header & Local Table Filter

- **As a** System User,
- **I want** a standardized header on every pillar dashboard containing a subcategory dropdown, a local search bar, and an add button,
- **So that** I can rapidly switch between item types, search for specific tags within my current view, or initiate a new registration.

### Acceptance Criteria (Gherkin)

- **Scenario: Subcategory Drill-Down via Heading**
  - **Given** I navigate to the Hardware registry
  - **When** I click the downward chevron next to the "Hardware ⌄" heading
  - **Then** a dropdown appears listing all Master Data categories for that pillar (e.g., Laptops, Monitors)
  - **And** selecting a category triggers the Server Action `getAssetsByPillar` passing the specific `categoryId`
  - **And** the grid dynamically updates to show only those records.

- **Scenario: Local Data Grid Query**
  - **Given** I am viewing a populated data grid
  - **When** I type text into the local Search bar located directly above the table
  - **Then** the grid requests a filtered payload from the server passing the `query` string.

- **Scenario: URL State Persistence**
  - **Given** I have searched for "Macbook" and selected the subcategory "Laptops"
  - **When** I refresh the page or share the link with a coworker
  - **Then** the Next.js framework reads the query parameters from the URL
  - **And** correctly repopulates the local search text and dropdown state upon loading.

### Technical Implementation Tasks

#### Frontend
- [x] Build a reusable Registry Header React component that renders the dynamic heading, subcategory dropdown, search bar, Filters button, and "+ Add Asset" CTA.
- [x] Wire the subcategory dropdown to the server utilizing `getCategoriesByPillar`.
- [x] Persist local search text into the browser URL (`?query=...`) for shareability.

#### Backend
- [x] Create the `getCategoriesByPillar` server action to cleanly return active subcategories for the requested context.

---

## User Story: US-6.3 — Hardware Inventory Grid

- **As an** IT Operator,
- **I want** a dedicated registry specifically for physical IT equipment,
- **So that** I can track physical hardware assignments and statuses without sorting through software licenses.

### Acceptance Criteria (Gherkin)

- **Scenario: Viewing Hardware-Specific Data**
  - **Given** I navigate to `/assets/hardware`
  - **Then** the grid columns default exactly to: `Asset ID`, `Asset Name`, `Serial Number`, `Category`, `Assigned to`, and `Status`.

- **Scenario: Empty State Fallback**
  - **Given** there is no hardware in the database
  - **When** I view the hardware registry
  - **Then** the table displays a friendly empty state message (e.g., "No hardware found.") rather than crashing.

### Technical Implementation Tasks

#### Frontend
- [x] Build the Hardware Grid page using `getAssetsByPillar({ pillar: 'Hardware' })`.
- [x] Build a reusable `StatusBadge` component rendering color-coded outline pill badges with leading icons.

#### Backend
- [x] Create the `getAssetsByPillar` Server Action utilizing Drizzle ORM to cleanly fetch formatted Hardware rows.

---

## User Story: US-6.4 — Software & Licenses Grid

- **As an** IT Operator,
- **I want** a dedicated registry for digital assets and software subscriptions,
- **So that** I can monitor available license seats and catch upcoming renewal dates.

### Acceptance Criteria (Gherkin)

- **Scenario: Viewing Software-Specific Data**
  - **Given** I navigate to `/assets/software`
  - **Then** the grid dynamically adapts to show digital-focused columns like `Software Name`, `License Key`, and `Seats`.

### Technical Implementation Tasks

#### Frontend
- [x] Build the Software Grid page utilizing the shared registry layout pattern but querying `Software`.

---

## User Story: US-6.5 — Furniture & Fixtures Grid

- **As a** Facilities Manager,
- **I want** a dedicated registry for physical office assets,
- **So that** I can track the location and condition of corporate property for auditing purposes.

### Acceptance Criteria (Gherkin)

- **Scenario: Viewing Furniture-Specific Data**
  - **Given** I navigate to `/assets/furniture`
  - **Then** the grid columns focus heavily on `Asset ID`, `Asset Name`, `Category`, `Location` (Building/Floor), and `Condition`.

### Technical Implementation Tasks

#### Frontend
- [x] Build the Furniture Grid component focused on physical location attributes.

---

## User Story: US-6.6 — Office Electronics Grid

- **As an** IT Operator,
- **I want** a dedicated registry for shared electronic equipment,
- **So that** I can maintain visibility over high-value shared items that require maintenance (like Projectors, AC Units).

### Acceptance Criteria (Gherkin)

- **Scenario: Viewing Electronics-Specific Data**
  - **Given** I navigate to `/assets/office-electronics`
  - **Then** the grid displays `Asset ID`, `Asset Name`, `Category`, `Location`, and operational status metrics.

### Technical Implementation Tasks

#### Frontend
- [x] Build the Office Electronics Grid page structure.

---

## User Story: US-6.7 — Advanced Grid Controls (Filtering, Sorting, & Pagination)

- **As an** IT Operator,
- **I want** to manipulate the data grids using advanced filters and pagination controls,
- **So that** I can isolate specific data (e.g., all broken laptops) without scrolling through thousands of rows.

### Acceptance Criteria (Gherkin)

- **Scenario: Server-Side Pagination Limits**
  - **Given** I am viewing a populated grid with over 1000 items
  - **When** I scroll to the bottom of the table
  - **Then** I see pagination controls displaying "Page 1 of X"
  - **And** the server strictly enforces `MAX_PAGE_SIZE = 100` internally, even if the client requests more, preventing memory overflow.

- **Scenario: Filter Application (Asset Status)**
  - **Given** I am in the hardware registry
  - **When** I apply a filter for `Status: Defective` via the filters menu
  - **Then** the `getAssetsByPillar` action applies the specific `eq(assets.status, 'Defective')` constraint and refreshes the grid.

- **Scenario: Multi-Parameter Filtering Intersection**
  - **Given** I am viewing the Unified Assets list
  - **When** I apply filters for `Status: Available` AND `Location: Colombo HQ`
  - **Then** the backend builds an `AND` condition querying both parameters simultaneously
  - **And** the UI reflects only assets that meet both criteria.

### Technical Implementation Tasks

#### Frontend
- [x] Build the custom table pagination component supporting standard arrow controls.
- [x] Wire sort/filter/pagination state to Next.js URL query parameters or direct Server Action payloads.

#### Backend
- [x] Extend the `AssetsGridQueryInput` to accept parameters for: `page`, `pageSize`, `query`, `status`, `categoryId`.
- [x] Implement robust input normalization (`normalizePage`, `normalizePageSize`) to fallback safely if invalid data is passed.

---

## User Story: US-6.8 — Bulk Operations

- **As an** IT Operator,
- **I want** to select multiple rows at once and apply a single action to all of them,
- **So that** I can mass-update records safely in a single database transaction.

### Acceptance Criteria (Gherkin)

- **Scenario: Bulk Status Change via Transaction**
  - **Given** I check the boxes next to 5 laptops
  - **When** I trigger a Bulk Update to change their status to "In Repair"
  - **Then** the backend Server Action (`bulkUpdateAssets`) fires a single database transaction updating all 5 asset IDs.
  - **And** it automatically revalidates the cache (`revalidatePath`) for the registry so the UI updates immediately.

- **Scenario: Missing Target Safeguards**
  - **Given** I attempt to trigger a bulk update via direct API manipulation
  - **When** I pass an empty array of `assetIds` or no specific update payload
  - **Then** the Server Action safely intercepts the call and returns an error string: "Select at least one valid asset to update." or "Provide at least one valid update field."

- **Scenario: Invalid State Transitions in Bulk**
  - **Given** I select two laptops: one "Available" and one "Disposed"
  - **When** I attempt to bulk update their status to "Assigned"
  - **Then** the UI prevents the bulk action menu from offering "Assign" due to state conflicts across the selection payload.

### Technical Implementation Tasks

#### Frontend
- [x] Implement row-selection state management within the data table components.
- [x] Build the dynamic Bulk Action Toolbar.
- [x] Write state-conflict calculation logic to disable incompatible bulk actions.
- [x] Integrate the UI to call the `bulkUpdateAssets` Server Action.

#### Backend
- [x] Create the `bulkUpdateAssets` server action.
- [x] Ensure atomic transaction processing within `bulkUpdateAssetsRepo` for updating locations, condition, or status.
- [x] Trigger cache revalidation upon success.

---

## User Story: US-6.9 — Unified Master Inventory Hub

- **As a** Corporate IT Admin,
- **I want** a centralized dashboard that aggregates assets across all four pillars,
- **So that** I can view and manage all inventory globally in one place.

### Acceptance Criteria (Gherkin)

- **Scenario: Viewing the Unified Master Table**
  - **Given** I navigate to the "All Assets" view (`/assets`)
  - **Then** the system calls the `getAllAssetsUnified` Server Action
  - **And** the grid displays a unified layout including the `Pillar` column to distinguish hardware from furniture.
  - **And** the table uses server-side pagination with a default page size of 16.

### Technical Implementation Tasks

#### Frontend
- [x] Build the Unified "All Assets" Page at `/assets/page.tsx` pulling from `getAllAssetsUnified`.

#### Backend
- [x] Create the `getAllAssetsUnified` Server Action and corresponding Repo function returning a normalized cross-pillar structure.