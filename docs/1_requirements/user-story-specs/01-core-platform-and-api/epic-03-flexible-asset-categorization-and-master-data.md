# Epic 3: Flexible Asset Categorization & Master Data Setup

## Summary

This epic builds the dynamic data foundation of the IDAMS platform. The system is built on four hardcoded pillars: Hardware, Software, Office Furniture, and Office Electronics. This epic allows Global Admins to define their own standardized Master Data (Locations, Departments, Vendors) and build dynamic _Sub-Categories_ (e.g., "Laptops" under Hardware) with custom data schemas.

## In Scope

- Centralized Master Data dashboard with tabbed navigation.
- CRUD management for Locations, Departments, Vendors, Brands, and Models.
- Sub-Category creation strictly nested under the four main system pillars.
- Universal duplicate-entry prevention across all Master Data lists.
- Universal database-level relational safeguards preventing the deletion of _any_ active master data.
- Auto-generated Prefix Codes and a drag-and-drop Custom Field Builder for Sub-Categories.

## Out of Scope / Limitations

- Global Admins cannot create, rename, or delete the 4 Main Pillars (Hardware, Software, Furniture, Electronics); these are hardcoded.
- IT Operators and Standard Employees are strictly restricted from accessing this module.

## Assumptions & Dependencies

- Relies on the RBAC middleware established in Epic 2 to secure these administrative endpoints.

### User Stories

- [US-3.1 — Centralized Master Data Dashboard](https://app.clickup.com/t/86ewvcw4t)
- [US-3.2 — Location Data Management](https://app.clickup.com/t/86ewvcw8a)
- [US-3.3 — Department & Cost Center Management](https://app.clickup.com/t/86ewvcw8j)
- [US-3.4 — Vendor Directory Management](https://app.clickup.com/t/86ewvnj36)
- [US-3.5 — Brand Management (Manufacturers)](https://app.clickup.com/t/86ewvcw8z)
- [US-3.6 — Brand & Model Hierarchy Management](https://app.clickup.com/t/86ewvcw9g)
- [US-3.7 — Sub-Category Management (Under the 4 Pillars)](https://app.clickup.com/t/86ewvcw9q)
- [US-3.8 — Automated Sub-Category Prefixing](https://app.clickup.com/t/86ewvcx06)
- [US-3.9 — Custom Field Builder (Schema Engine)](https://app.clickup.com/t/86ewvcx20)

---

## User Story: US-3.1 — Centralized Master Data Dashboard

- As a Global Admin,
- I want a centralized dashboard to access all foundational system lists,
- So that I can easily navigate between configuring Locations, Departments, Vendors, and Categories without losing my place.

### Acceptance Criteria (Gherkin)

- Scenario: Tabbed Navigation
  - Given I am logged in as a Global Admin
  - When I navigate to the "Master Data" section from the main sidebar
  - Then I am presented with a horizontal tab interface (`Categories | Locations | Departments | Vendors | Brands & Models`).
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/8d23ef31-8fbc-48aa-8c2f-57dfa09ae03e/Master-Data.png)

### UI/UX Specifications & Constraints

- Layout: Use a clean, horizontal tab navigation. The active tab must have a distinct underline or background color to indicate state.
- Data Grid Rules: All tables must include pagination (e.g., 10/25/50 rows per page), sortable column headers (indicated by up/down arrows), and a fixed header row so users don't lose context when scrolling.
- Empty States: If a tab has no data, display a flat-vector illustration with a prompt: "No records found. Click 'Add \[Entity\]' to get started."
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/f2c9e4e4-785c-4679-b5fe-c151aa86381d/Master%20Data(No%20records%20found)%20-%20Desktop.png)

### Technical Implementation Tasks

- [ ] Build the `MasterDataLayout` React wrapper component with nested routing for the tabs.
- [ ] Implement a reusable `DataTable` UI component with built-in client-side or server-side pagination and sorting.

---

## User Story: US-3.2 — Location Data Management

- As a Global Admin,
- I want to manage a standardized list of physical company locations,
- So that IT staff always select valid, spell-checked buildings when assigning hardware.

### Acceptance Criteria (Gherkin)

- Scenario: Adding a New Location
  - Given I click "Add Location"
  - When I input "Colombo HQ" and "Floor 3" and click Save
  - Then the location is instantly available in asset registration dropdowns globally.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/dae2e5f2-58c2-42d1-b840-6435c1b4d2a6/Master-Data-Add-modal.png)
- Scenario: Duplicate Prevention
  - Given "Colombo HQ" already exists
  - When I attempt to create another location with the exact same Building Name
  - Then the system blocks the save and displays a validation error: "This location already exists."
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/4348dd46-7dee-4e4b-ab9d-77b018a808be/Master%20Data%20Existing%20Alert-%20Desktop.png)
- Scenario: Bulk Selection and Deletion
  - Given I am viewing a Master Data list (e.g., Locations, Vendors, or Departments).
  - When I select one or more items using the multi-select checkboxes on the grid.
  - And I click the "Delete" button in the bulk actions toolbar.
  - Then the system must remove the selected records from the database.
  - And the UI must refresh to show the updated list with a success notification.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/1a5fdd39-0cae-4c4c-97fa-37773e9f372e/Master%20Data%20Bulk%20actions%20-%20Desktop.png)
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/f5321064-caad-4594-84f8-96dbaa9b50dd/Master%20data%20bulk%20delete.png)
- Scenario: Universal Deletion Safeguard (Archiving)
  - Given a location currently holds active assets
  - When I attempt to delete the location
  - Then the system blocks the hard-delete, disables the trash icon, and requires me to "Archive" it instead (setting `IsActive = false`).
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/3f08928b-7401-4441-a2c6-f9dab628747a/Master%20Data%20Active%20assets%20deletion%20-%20Desktop.png)

### UI/UX Specifications & Constraints

- Modal Design: Use a centered modal overlay (max-width: `500px`) with a dark, semi-transparent backdrop (`bg-black/50`).
- Form Validation: Required fields must have a red asterisk (`*`). If the user clicks Save while a field is empty or duplicate, display inline red text below the input field and keep the modal open.
- Button States: "Cancel" must be an outline/ghost button. "Save" must be a solid primary brand color.
- Individual selection, with multi-select checkboxes.
- Action Feedback: Display a green Toast notification (e.g., "Location saved successfully") in the top-right corner upon successful API response.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/97cff0d7-ab46-4a3e-9928-c8eb77c42c65/Master%20Data%20success%20toast%20-%20Desktop.png)

### Technical Implementation Tasks

- [ ] Create `Locations` table with an `IsActive` boolean column.
- [ ] Write dependency check queries (`SELECT count(*) FROM assets WHERE location_id = X`) before executing `DELETE`.

---

## User Story: US-3.3 — Department & Cost Center Management

- As a Global Admin,
- I want to manage a list of corporate departments,
- So that the system can automatically generate standardized Cost Center IDs (e.g., `tiq-hr`), allowing Finance to accurately group Total Cost of Ownership (TCO) reports by business unit.

### Acceptance Criteria (Gherkin)

- Scenario: Adding a Department & Auto-Generating the ID
  - Given I am on the "Departments" tab of Master Data
  - When I input a new Department Name "Marketing" and a short code "mkt"
  - Then the system automatically generates and locks the Cost Center ID as `tiq-mkt`
  - And the department is saved and becomes available for user and asset mapping.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/c5f32cbf-9f53-4275-8703-3175f417b4dd/add%20department.png)
- Scenario: Duplicate Department/Code Prevention
  - Given the short code "hr" (generating `tiq-hr`) is already assigned to Human Resources
  - When I try to create a new department using that exact same short code
  - Then the system rejects the input
  - And displays an error stating: "This department code is already in use. Codes must be unique."
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/7010209c-306d-47af-a453-b17fb8f658cd/department%20code%20error.png)
- Scenario: Universal Deletion Safeguard
  - Given a department already has users or assets tied to it in the database
  - When I click the "Delete" icon next to it
  - Then the system disables the hard-delete action
  - And prompts me to "Archive" it instead, preserving historical financial reporting.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/673ab982-8924-413a-a85a-99f1b998699b/Archive.png)

### UI/UX Specifications & Constraints

- Auto-Generated Read-Only Field: As the user types the short code (e.g., "mkt"), a disabled, read-only "Preview" field should dynamically show the final system-generated ID (e.g., `tiq-mkt`) so the admin knows exactly how it will be saved.
- Input Formatting: The short code input field should automatically force keystrokes to lowercase and strip out spaces or special characters.

### Technical Implementation Tasks

- [ ] Create the `Departments` database table with a strict `UNIQUE` constraint on both the Name and the generated `department_id` column.
- [ ] Write the frontend string-concatenation logic (e.g., `'tiq-' + shortCode.toLowerCase()`) to generate the ID before submitting the payload.
- [ ] Implement relational deletion checks against the `Users` and `Assets` tables to prevent orphaned records.

---

## User Story: US-3.4 — Vendor Directory Management

- As a Global Admin,
- I want to maintain a directory of authorized suppliers and repair centers,
- So that IT Operators can quickly access support contact details when a piece of hardware breaks.

### Acceptance Criteria (Gherkin)

- Scenario: Updating Vendor Details (Data Cascade)
  - Given the vendor "Softlogic" changes their support email
  - When I edit the master record
  - Then the new email is immediately visible on all historical repair tickets and assets tied to that vendor.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/1aa260d9-a424-40c6-9816-6f8a185377e8/Master%20Data%20Vendors%20Edit-%20Desktop.png)
- Scenario: Duplicate Vendor Prevention
  - Given "Dell Technologies" is already a registered vendor
  - When I try to add a new vendor with the exact same Company Name
  - Then the system blocks the creation to prevent split records.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/1c3ae567-07d3-41b5-bcde-83f8eac6f464/Master%20Data%20Vnedor%20Existing%20-%20Desktop.png)
- Scenario: Universal Deletion Safeguard
  - Given a vendor is linked to past purchase orders or repair tickets
  - When I try to delete the vendor
  - Then the system requires me to "Archive" them instead.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/c72ff82d-0fa4-42a2-9937-40ac125206f6/Archive%20Vendors%20with%20Active%20Assets.png)

### UI/UX Specifications & Constraints

- Data Presentation: In the Vendor data grid, the `Support Email` column should render as a clickable HTML `mailto:` link, opening the user's default email client.
- Validation: The Email input field in the modal must use standard Regex validation to ensure proper `@` and domain formatting before allowing submission.

### Technical Implementation Tasks

- [ ] Create `Vendors` database table with a unique constraint on the `CompanyName` column.
- [ ] Ensure the "Edit Vendor" API cascades the updated data naturally via foreign keys.

---

## User Story: US-3.5 — Brand Management (Manufacturers)

- As a Global Admin,
- I want to centrally add, edit, and manage a standardized list of Brands/Manufacturers,
- So that IT Operators are forced to select from a clean, predefined list during asset registration, preventing database fragmentation (e.g., "Dell" vs. "Dell Inc.").

### Acceptance Criteria (Gherkin)

- Scenario: Adding a New Brand
  - Given I navigate to the Master Data > Brands page
  - When I click "Add Brand" and submit a new manufacturer name (e.g., "Apple")
  - Then the system saves the brand to the database
  - And it instantly becomes available as a root-level selection for Model mapping and Asset Registration.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/f6cc4bd8-f44e-4288-a990-38481ff58e9d/Master%20Data%20Add%20Brands-%20Desktop.png)
- Scenario: Duplicate Brand Prevention
  - Given the brand "Lenovo" already exists in the system
  - When I attempt to add a new brand with the exact same name (case-insensitive)
  - Then the system blocks the submission
  - And displays a validation error stating: "This Brand already exists in the system."
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/cf2afb44-d1d7-41aa-b9cc-7a9140e043ff/Master%20Data%20Existing%20Brands-%20Desktop.png)
- Scenario: Editing a Brand Name
  - Given I have a brand saved as "Lennovo" (misspelled)
  - When I click Edit, change it to "Lenovo", and save
  - Then the name updates globally across the system
  - And all Models and Assets previously tied to "Lennovo" automatically reflect the corrected "Lenovo" spelling.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/316aef09-12af-4ac3-bde2-fb42a9a621f6/Master%20Data%20editBrands-%20Desktop.png)
- Scenario: Safe Deactivation (Soft Delete)
  - Given I want to remove a defunct brand like "Compaq"
  - When I click the "Deactivate" toggle
  - Then the system visually marks the brand as inactive
  - And prevents it from appearing in any dropdowns for _new_ asset registrations
  - But preserves the brand name on all _historical_ assets that were previously registered under it.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/ab698cf0-e546-4443-bad1-ea518af8f301/Delete%20Brand.png)

### UI/UX Specifications & Constraints

- Simple Interface: Brand management does not require a complex slide-out panel; a simple centralized modal for Adding/Editing is sufficient.
- List View: The Brands data grid should display the `Brand Name`, `Status` (Active/Inactive), and a `Model Count` column showing how many specific hardware models are currently nested under that brand.

### Technical Implementation Tasks

- [ ] Build a standard CRUD interface (Create, Read, Update, Deactivate) for the `Brands` database table.
- [ ] Enforce a strict `UNIQUE` database constraint on the Brand Name column to prevent identical entries at the schema level.
- [ ] Implement a Soft Delete (`is_active` boolean) rather than a Hard Delete to preserve historical asset integrity.

---

## User Story: US-3.6 — Brand & Model Hierarchy Management

- As a Global Admin,
- I want to establish a linked parent-child relationship between Brands (e.g., Apple) and Models (e.g., MacBook Pro),
- So that data entry is streamlined and users cannot accidentally log impossible combinations.

### Acceptance Criteria (Gherkin)

- Scenario: Adding Child Models
  - Given the "Dell" brand exists
  - When I select "Dell" and click "Save Model", typing "Latitude 5540"
  - Then the model is permanently linked to the Dell brand.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/4a972c0d-8eed-48a9-be97-472f6c2931f3/Master%20Data%20Add%20modal%20-%20Desktop.png)
- Scenario: Duplicate Model Prevention
  - Given "Latitude 5540" already exists under "Dell"
  - When I try to add "Latitude 5540" to Dell again
  - Then the system blocks it. _(Note: The same model name can exist under different brands, but not the same brand)._
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/c146baff-4ce6-4410-8780-e96b8fa5bfd9/Master%20Data%20Adding%20duplicate%20modal%20prevention%20-%20Desktop.png)
- Scenario: Dependent Dropdown Enforcement
  - Given I am registering a new asset
  - When I select "Dell" from the Brand dropdown
  - Then the Model dropdown automatically filters to only show models linked to Dell.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/37031747-5bf0-4bf0-abca-60283e213300/brand%20model.png)
- Scenario: Universal Deletion Safeguard
  - Given an asset is currently registered as a "Latitude 5540"
  - When I try to delete the "Dell" brand or the "Latitude 5540" model
  - Then the system blocks the deletion.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/a6ee3e7a-5300-401d-945b-8e5cec92b15d/model.png)

### UI/UX Specifications & Constraints

- Layout: Use an Expandable Row Data Table (Accordion style). Clicking a Brand row expands it downward, revealing a nested sub-table of all associated Models with a slightly darker background to indicate hierarchy.
- Contextual Actions: The "Add Model" button must be located _inside_ the expanded Brand row, not at the top of the page, ensuring the user knows exactly which brand they are adding to.

### Technical Implementation Tasks

- [ ] Create `Brands` and `Models` tables with a `brand_id` foreign key.
- [ ] Build the frontend dependent-dropdown logic for asset registration forms.

---

## User Story: US-3.7 — Sub-Category Management (Under the 4 Pillars)

- As a Global Admin,
- I want to create custom Sub-Categories strictly nested under the four main system pillars (Hardware, Software, Furniture, Electronics),
- So that specific asset types automatically route to the correct registration screens and dropdown menus in the main application.

### Acceptance Criteria (Gherkin)

- Scenario: Assigning to a Main Pillar
  - Given I am creating a new Sub-Category
  - When I name it "Laptops" and select the "Hardware" pillar from the parent dropdown
  - Then the "Laptops" sub-category is saved
  - And it will now only appear in the dropdowns on the dedicated "Hardware Registration" screen.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/cea8b388-fec6-4fec-b92d-f2ba99f71bf9/Master%20Data%20Add%20new%20category%20-%20Desktop.png)
- Scenario: Duplicate Sub-Category Prevention
  - Given "Laptops" already exists under the Hardware pillar
  - When I attempt to create another sub-category named "Laptops"
  - Then the system blocks the creation.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/ab3f6b53-4d0d-4494-a55a-03254ea94a03/Master%20Data%20Add%20existing%20category%20-%20Desktop.png)
- Scenario: Universal Deletion Safeguard
  - Given the "Laptops" sub-category contains active assets
  - When I attempt to delete it
  - Then the delete button is disabled, forcing me to Archive it instead.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/4e303829-23ec-4ff2-9e8f-6696f72dcef6/Cat-Active%20asset%20delete.png)

### UI/UX Specifications & Constraints

- Form UI: Because Category creation includes Auto-Prefixes and Schema Builders, this must use a Right-Side Slide-Out Panel (Sheet) covering 40% of the screen width, rather than a small modal.
- Pillar Selection: The first input in the panel must be a locked dropdown or radio group allowing the user to select _only_ one of the 4 Main Pillars.

### Technical Implementation Tasks

- [ ] Create the `SubCategories` database table. Add an ENUM or foreign key column linking it to the 4 hardcoded Main Pillars (Hardware, Software, Furniture, Electronics).
- [ ] Implement relational deletion safeguards linking Sub-Categories to the main `Assets` table.

---

## User Story: US-3.8 — Automated Sub-Category Prefixing

- As a Global Admin,
- I want the system to automatically generate a locked tracking prefix code when I make a Sub-Category,
- So that every piece of equipment automatically follows a globally unique ID format (e.g., `AST-LAP-001`).

### Acceptance Criteria (Gherkin)

- Scenario: Prefix Generation & Locking
  - Given I am creating a new Sub-Category
  - When I type "Wireless Keyboard"
  - Then the Prefix field auto-populates with "WKE"
  - And once saved, the Prefix field becomes permanently read-only.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/deed73a2-c980-4062-a2fd-175035657dcd/Master-Data-Add-new-category.png)
- Scenario: Unique Prefix Validation
  - Given the prefix "LAP" already exists
  - When the system generates "LAP" for a new "Laser Pointer" sub-category
  - Then the system automatically appends a number (e.g., "LAP2") to ensure uniqueness.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/b7f314a2-89c1-4948-b64b-4a253a27edda/Master-Data-Edit-category.png)

### UI/UX Specifications & Constraints

- Interaction: The Prefix field must generate its value dynamically "on-blur" (when the user clicks out of the Sub-Category Name field).
- Visual Lock: After creation, the Prefix input must have a gray background (`bg-gray-100`) and display a small "padlock" icon to indicate it is immutable.

### Technical Implementation Tasks

- [ ] Write string-manipulation logic for auto-prefix generation.
- [ ] Block `PUT`/`PATCH` requests from modifying the `Prefix` column after initial creation.

---

## User Story: US-3.9 — Custom Field Builder (Schema Engine)

- As a Global Admin,
- I want to define specific custom questions for each Sub-Category,
- So that when registering a Laptop (Hardware), IT is asked for RAM, but when registering a Desk (Office Furniture), Facilities is asked for Dimensions.

### Acceptance Criteria (Gherkin)

- Scenario: Defining Custom Attributes
  - Given I am editing the "Monitors" sub-category
  - When I add a field called "Screen Resolution" (Type: Dropdown) and mark it "Required"
  - Then this schema is saved and dynamically renders on the Hardware Registration form.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/32d3e3c3-5c18-49f6-a5eb-59716958178a/Master-Data-Add-new-category.png)
- Scenario: Drag-and-Drop Reordering
  - Given I have multiple fields defined
  - When I drag and drop the fields
  - Then the new sequence dictates the order on the final registration form.

### UI/UX Specifications & Constraints

- Builder UI: Located at the bottom of the Sub-Category slide-out panel. Must use a drag-and-drop React library (like `dnd-kit`). Each field row should have a "grip" icon (`⋮⋮`) on the left to indicate it is draggable.
- Dropdown Option UI: If the user selects "Dropdown" as the data type, a secondary UI must appear allowing them to type comma-separated values (e.g., `1080p, 1440p, 4K`) to populate the choices.

### Technical Implementation Tasks

- [ ] Implement JSONB (or EAV relational) schema storage to save sub-category definitions.
- [ ] Write `GET /api/sub-categories/{id}/schema` to fetch the payload for dynamic frontend rendering.
