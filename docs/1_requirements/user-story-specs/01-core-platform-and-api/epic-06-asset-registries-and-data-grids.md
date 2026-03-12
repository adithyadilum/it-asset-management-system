Epic 6: Asset Registries & Data Grids

Summary
This epic builds the central command center for all asset tracking. It implements four distinct, high-density data grids corresponding to the system's hardcoded pillars grouped in the sidebar: IT & Digital (Hardware, Software) and Office (Furniture & Fixtures, Office Electronics). It introduces a dynamic, dropdown-driven page heading for rapid subcategory switching (e.g., Laptops vs. Monitors) and equips staff with powerful search, filtering, and bulk-action capabilities.

In Scope

- Four dedicated sidebar navigation routes for the Main Pillars.
- A dual-search architecture: A global `Cmd+K` search in the top nav, and a local text search within the registry header.
- A universal dashboard header featuring a dynamic Subcategory Dropdown, a "Filters" menu, and a primary "+ Add Asset" button.
- High-density React data tables with column sorting, row-selection counters, and pagination.
- Multi-select checkboxes for executing bulk operations.

Out of Scope / Limitations

- The actual functionality of the "+ Add Asset" button (form rendering and submission) is deferred to Epic 7.
- The detailed Slide-Out Panel (Viewing an individual asset's deep history) is covered in Epic 8.

Assumptions & Dependencies

- Relies on Master Data (Subcategories) established in Epic 3 to populate the heading dropdown menus.

[](https://app.clickup.com/t/86ewvf7zb)
[](https://app.clickup.com/t/86ewvf733)
[](https://app.clickup.com/t/86ewvf734)
[](https://app.clickup.com/t/86ewvf739)
[](https://app.clickup.com/t/86ewvf73e)
[](https://app.clickup.com/t/86ewvf73h)
[](https://app.clickup.com/t/86ewvf73m)
[](https://app.clickup.com/t/86ewvfa18)

User Story: US-6.1 — Gobal Omni-Search (Cmd+K)

- As a System User,
- I want a universal search bar accessible from anywhere in the application,
- So that I can instantly search for specific database records, navigate to different modules, or execute system actions (like "Add Asset") using only my keyboard.

Acceptance Criteria (Gherkin)

- Scenario: Keyboard Shortcut Activation
  - Given I am anywhere in the application
  - When I press the `Cmd+K` (Mac) or `Ctrl+K` (Windows) keyboard shortcut
  - Then the Omni-Search modal overlay instantly appears over the screen, with the text cursor already focused in the input field.
- Scenario: Searching for Database Records
  - Given the Omni-Search modal is open
  - When I type the serial number "PC1A2B3C" or "Jane Doe"
  - Then the system queries the backend and returns a categorized list of matching Assets, Users, or Master Data.
- Scenario: Searching for System Navigation
  - Given the Omni-Search modal is open
  - When I type "Audit" or "Settings"
  - Then the system displays a "Pages" result group
  - And hitting Enter instantly navigates me to the System Audit Log or Settings dashboard.
- Scenario: Searching for System Actions
  - Given the Omni-Search modal is open
  - When I type "Add Laptop" or "New Webhook"
  - Then the system displays an "Actions" result group
  - And hitting Enter instantly executes that frontend action (e.g., opening the Epic 7 Asset Registration form directly).

![](https://t90181861921.p.clickup-attachments.com/t90181861921/f8ac1e50-b233-4193-93fe-060960533bb5/Omni%20search.png)
UI/UX Specifications & Constraints

- Categorized Results: The search results must not be a flat list. They must be visually grouped by type using sticky sub-headers (e.g., `PAGES`, `REPORTS`, `ASSETS`, `USERS`).
- Keyboard First: The entire interface must be fully navigable using the `Up` and `Down` arrow keys, and selections must be executed with the `Enter` key.
- Visual Hierarchy: "Action" results should feature a distinct leading icon (like a `+` or lightning bolt `⚡`), while "Asset" results should feature their specific category icon (e.g., a laptop or chair icon).

Technical Implementation Tasks

- \[ \] Build the Command Palette UI component using a specialized accessibility library (e.g., `cmdk` or `paletto`).
- \[ \] Implement a static frontend index of all system routes (Pages) and global functions (Actions) to allow for instant, zero-latency client-side filtering of commands.
- \[ \] Write an optimized backend endpoint (`GET /api/search?q={query}`) that executes a multi-table search across the inventory and user databases for dynamic data records.

User Story: US-6.2 — Universal Registry Header & Local Table Filter

- As a System User,
- I want a standardized header on every pillar dashboard containing a subcategory dropdown, a local search bar, and an add button,
- So that I can rapidly switch between item types, search for specific tags within my current view, or initiate a new registration without hunting for buttons.

Acceptance Criteria (Gherkin)

- Scenario: Subcategory Drill-Down via Heading
  _ Given I navigate to the Hardware registry
  _ When I click the downward chevron next to the "Laptops ⌄" heading
  _ Then a dropdown appears listing all Master Data subcategories for that pillar
  _ And selecting a different category instantly filters the grid to show only those records.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/b9a7e259-7d96-4550-96f3-578568a56cc9/Asset%20List%20View%20Dropdown%20-%20Desktop.png)
- Scenario: Local Data Grid Filtering
  _ Given I am viewing a populated data grid
  _ When I type text into the local Search bar located directly above the table \* Then the current grid instantly filters its existing rows to match that text string, without navigating away from the page.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/3a4e3369-1574-4f1c-af1f-e77bc7ccb8de/Asset%20List%20View%20Search%20-%20Desktop.png)

UI/UX Specifications & Constraints

- Typography & Layout: The heading must use an H1 font size with a clickable chevron (`⌄`). Below the heading, the layout must feature a full-width local search bar (`🔍 Search...`), an outline "Filters ⌄" button, and a solid dark-blue primary "+ Add Asset" button.
- Breadcrumbs: The top navigation bar must dynamically render breadcrumbs based on the sidebar grouping (e.g., `IT & Digital > Hardware`).

Technical Implementation Tasks

- \[ \] Build a reusable `RegistryHeader` React component that accepts the pillar context as a prop.
- \[ \] Implement the `Cmd+K` global search listener and modal overlay.
- \[ \] Integrate the local search input state directly with the data table's global filter logic.

User Story: US-6.3 — Hardware Inventory Grid

- As an IT Operator,
- I want a dedicated registry specifically for physical IT equipment,
- So that I can track physical hardware assignments and statuses without sorting through software licenses.

Acceptance Criteria (Gherkin)

- Scenario: Switching Hardware Subcategories
  - Given I am on the Hardware registry viewing "Laptops"
  - When I click the heading dropdown ("Laptops ⌄") and select "Monitors"
  - Then the grid dynamically updates to show only Monitor assets, maintaining the Hardware-specific column structure.
- Scenario: Viewing Hardware-Specific Data
  _ Given I am on the Hardware registry
  _ Then the grid columns default exactly to: `Asset ID`, `Asset Name`, `Serial Number`, `Category`, `Assigned to`, and `Status`.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/129b251b-3431-4bc3-a2c9-cecd27db7c4c/Asset-List-View-Desktop.png)

UI/UX Specifications & Constraints

- Status Badges: The `Status` column must use outline pill badges with specific leading icons:
  - Purple + Spinner Icon = "In Repair"
  - Blue + Grid Icon = "New"
  - Red + Minus Icon = "Defective"
  - Gray + Check Icon = "Assigned"
  - Orange + Alert Icon = "Lost"
  - Green + Check Icon = "Available"
- Category Badges: The `Category` column data (e.g., "Laptop") must also be rendered as a subtle outline pill badge to differentiate it from standard text fields. And `Category` column should be hidden unless the All assets state is selected from the subcategory drop-down.

Technical Implementation Tasks

- \[ \] Build the `HardwareGrid` React component mapped to the exact column definitions.
- \[ \] Write API query to fetch assets strictly where `pillar = 'Hardware'`, passing the dynamic subcategory filter if selected.

User Story: US-6.4 — Software & Licenses Grid

- As an IT Operator,
- I want a dedicated registry for digital assets and software subscriptions,
- So that I can monitor available license seats and catch upcoming renewal dates.

Acceptance Criteria (Gherkin)

- Scenario: Switching Software Subcategories
  _ Given I am on the Software registry viewing "Subscriptions"
  _ When I click the heading dropdown and select "Perpetual Licenses" \* Then the grid dynamically updates to show only those specific software records.
  ![](blob:https://app.clickup.com/4cec8ad8-8bec-4789-8afd-f7c9edbc5b1a)
- Scenario: Viewing Software-Specific Data
  - Given I am on the Software registry
  - Then the grid columns adapt to show `Software Name`, `License Key`, `Total Seats`, `Available Seats`, and `Expiration Date`.

Technical Implementation Tasks

- \[ \] Build the `SoftwareGrid` React component.
- \[ \] Write API query to fetch assets strictly where `pillar = 'Software'`.

User Story: US-6.5 — Furniture & Fixtures Grid

- As a Facilities Manager,
- I want a dedicated registry for physical office assets,
- So that I can track the location and condition of corporate property for auditing purposes.

Acceptance Criteria (Gherkin)

- Scenario: Switching Furniture Subcategories
  _ Given I am on the Furniture registry viewing "Chairs"
  _ When I click the heading dropdown and select "Desks" \* Then the grid dynamically updates to show only Desk records.
  ![](<https://t90181861921.p.clickup-attachments.com/t90181861921/4bbae0a6-dece-4944-948c-adc914185a9e/All%20Asset%20List%20View(Furniture)%20-%20Desktop.png>)
- Scenario: Viewing Furniture-Specific Data
  _ Given I am on the Furniture registry
  _ Then the grid columns focus heavily on `Asset ID`, `Asset Name`, `Category`, `Location` (Building/Floor), and `Condition`.
  ![](<https://t90181861921.p.clickup-attachments.com/t90181861921/4fe6e756-ecc3-4389-90d4-98d610947109/All%20Asset%20List%20View(Furniture)%20-%20Desktop%20(1).png>)

Technical Implementation Tasks

- \[ \] Build the `FurnitureGrid` React component.
- \[ \] Write API query to fetch assets strictly where `pillar = 'Furniture'`.

User Story: US-6.6 — Office Electronics Grid

- As an IT Operator,
- I want a dedicated registry for shared electronic equipment,
- So that I can maintain visibility over high-value shared items that require maintenance.

Acceptance Criteria (Gherkin)

- Scenario: Switching Electronics Subcategories
  _ Given I am on the Electronics registry viewing "Projectors"
  _ When I click the heading dropdown and select "AC Units" \* Then the grid dynamically updates to show only AC Unit records.
  ![](<https://t90181861921.p.clickup-attachments.com/t90181861921/9f9d211a-f528-4b24-8d9c-b3f937dfa782/Office%20Electronics-%20Desktop%20(1).png>)
- Scenario: Viewing Electronics-Specific Data
  _ Given I am on the Electronics registry
  _ Then the grid columns display `Asset ID`, `Asset Name`, `Category`, `Location`, `IP/MAC Address`, and `Maintenance Status`.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/0dc707ba-2b95-4063-922a-e05d35e524dd/Office%20Electronics-%20Desktop.png)

Technical Implementation Tasks

- \[ \] Build the `ElectronicsGrid` React component.
- \[ \] Write API query to fetch assets strictly where `pillar = 'Electronics'`.

User Story: US-6.7 — Advanced Grid Controls (Filtering, Sorting, & Pagination)

- As an IT Operator,
- I want to manipulate the data grids using advanced filters and pagination controls,
- So that I can isolate specific data (e.g., all broken Dell laptops in the Colombo HQ) without scrolling through thousands of rows.

Acceptance Criteria (Gherkin)

- Scenario: Footer Pagination and Row Counts
  _ Given I am viewing any populated grid
  _ When I look at the table footer
  _ Then I see a dynamic count of total records
  _ And I can change the rows per page using a dropdown (e.g., `16 ⌄`) \* And I can navigate pages using standard arrow controls (`< << > >>`).
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/a103ef49-a87e-457b-b00c-c4efcf470a62/Asset-List-View-Desktop.png)
- Scenario: Filter Dropdown Application
  _ Given I click the "Filters ⌄" button next to the local search
  _ When I apply a filter for `Status: In Repair` \* Then the grid instantly refines to show only matching records.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/c2893637-9add-4ec0-8259-8f55f051378c/Asset%20List%20Filter%20View%20-%20Desktop.png)

Technical Implementation Tasks

- \[ \] Build the custom table footer matching the UI mockup.
- \[ \] Implement advanced multi-select filtering logic.

User Story: US-6.8 — Bulk Operations

- As an IT Operator,
- I want to select multiple rows at once and apply a single action to all of them, provided the action makes logical sense for the selected pillar and asset states,
- So that I can mass-update records safely without accidentally assigning a sofa to a person or a location to a cloud software license.

Acceptance Criteria (Gherkin)

- Scenario: Uniform State Selection (Valid Actions)
  _ Given I check the boxes next to 5 laptops that all have the Status "Available"
  _ When the Bulk Action Toolbar appears \* Then the "Assign", "Print QR Code", "Dispose" and "Bulk Transfer" buttons are visible and active.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/d8eb3ec8-facc-4793-87ca-18e9f23868ab/Asset%20List%20Checked%20View%20-%20Desktop.png)
- Scenario: Mixed State Selection (Action Conflict Prevention)
  _ Given I check the box next to an "Available" laptop AND an "Assigned" laptop
  _ When the Bulk Action Toolbar appears \* Then the "Assign to User" button is disabled, because an assigned laptop cannot be assigned again without first being returned.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/ed23e981-fab6-4b2d-9923-eb7c9fc052d2/Bulk%20Tranfer-Desktop.png)
- Scenario: Pillar Constraint — Furniture (No User Assignment)
  - Given I have selected multiple items (e.g., Sofas, Desks) in the Furniture & Fixtures registry
  - When the Bulk Action Toolbar appears
  - Then the "Change Location" button is available
  - But the "Assign to User" button is completely hidden from the UI, because furniture is assigned to physical spaces, not individual employees.
- Scenario: Pillar Constraint — Software & Portable Hardware (No Location Transfer)
  - Given I have selected multiple records in either the Software registry OR portable items (e.g., Laptops, Mobiles) in the Hardware registry
  - When the Bulk Action Toolbar appears
  - Then the "Change Location" button is completely hidden, because digital assets do not exist physically, and portable hardware locations are dictated by the assigned user.
- Scenario: Bulk Action Execution
  _ Given I have selected multiple valid assets
  _ When I click a valid action, fill out the required modal inputs, and confirm \* Then all selected assets are updated in a single database transaction.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/4f31b44b-375e-4739-957f-78176458fa00/Bulk%20Tranfer%20pop%20up%20-Desktop.png)

UI/UX Specifications & Constraints

- Dynamic Action Rendering: The Bulk Action Toolbar must evaluate the `pillar` and `status` of all selected rows on the fly. If an action is logically impossible for the pillar (like locating software), the button should be removed entirely to save UI space.
- Disabled Actions Tooltip: If a bulk action button is rendered but disabled due to a _status_ conflict, hovering over it must display a tooltip explaining why (e.g., "Cannot assign: One or more selected assets are not Available").
- Confirmation Modal: Bulk actions must trigger a confirmation modal warning: "You are about to update 50 assets. This cannot be undone."

Technical Implementation Tasks

- \[ \] Implement row-selection state management within the data table.
- \[ \] Write frontend logic to compute the intersection of valid allowed actions based on the current `Pillar` and `Status` of all selected rows.
- \[ \] Write a transactional backend API endpoint (e.g., `PATCH /api/assets/bulk`) capable of safely processing mass updates and rolling back the transaction if any single item fails business logic validation.
