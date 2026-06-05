# Epic 3: Flexible Asset Categorization & Master Data Setup

## Summary

This epic builds the dynamic data foundation of the IT Asset Management platform. The system is built on core pillars (e.g., IT & Digital, Software, Office Furniture, Office Electronics). This epic allows Global Admins to define their own standardized Master Data entities (Locations, Departments, Vendors, Brands, Models, Owners, and Custom Statuses) and build dynamic *Categories* with custom JSONB data schemas.

By leveraging Next.js Server Actions, Drizzle ORM, and comprehensive dependency checking, the system ensures master data integrity, prevents orphaned relational records, and auto-generates sequential prefix codes (e.g., `LOC-0001`, `CAT-0001`). Furthermore, every mutation is securely recorded in the system's Audit Logs.

## In Scope

- Centralized Master Data dashboard with unified management.
- CRUD management for 8 master data entities: Locations, Asset Categories, Brands, Device Models, Vendors, Owners, Departments, and Custom Statuses.
- Category creation strictly nested under main system pillars.
- Universal duplicate-entry prevention across all Master Data lists.
- Universal database-level relational safeguards preventing the deletion of *any* master data record that has linked child references (e.g., assets, users, purchase orders).
- Auto-generated standard Prefix Codes and a Custom Field Builder (JSONB schema) for Categories.
- Image uploads to Vercel Blob for Device Models.
- Immutable Audit Logging of all CREATE, UPDATE, and DELETE actions.

## Out of Scope / Limitations

- Custom role creation for Master Data management (restricted strictly to GlobalAdmin).
- IT Operators, Finance Auditors, and Standard Employees are restricted from mutating these endpoints.

## Assumptions & Dependencies

- Relies on the RBAC middleware established in Epic 2.
- Uses Vercel Blob (or compatible storage) for Model image uploads.
- Relies on the `logAuditAction` utility for tracking configuration changes.

---

### User Stories

- [US-3.1 — Centralized Master Data Dashboard & Access Control](#user-story-us-31--centralized-master-data-dashboard--access-control)
- [US-3.2 — Location Data & Hierarchy Management](#user-story-us-32--location-data--hierarchy-management)
- [US-3.3 — Department & Cost Center Management](#user-story-us-33--department--cost-center-management)
- [US-3.4 — Vendor & Owner Directory Management](#user-story-us-34--vendor--owner-directory-management)
- [US-3.5 — Brand Management (Manufacturers)](#user-story-us-35--brand-management-manufacturers)
- [US-3.6 — Brand & Model Hierarchy Management](#user-story-us-36--brand--model-hierarchy-management)
- [US-3.7 — Category Management (Under Pillars)](#user-story-us-37--category-management-under-pillars)
- [US-3.8 — Custom Status Management](#user-story-us-38--custom-status-management)
- [US-3.9 — Automated Code Generation & Audit Logging](#user-story-us-39--automated-code-generation--audit-logging)

---

## User Story: US-3.1 — Centralized Master Data Dashboard & Access Control

- **As a** Global Admin,
- **I want** a centralized dashboard to access all foundational system lists,
- **So that** I can easily navigate between configuring Locations, Departments, Vendors, and Categories through a unified interface while ensuring unauthorized staff cannot alter system defaults.

### Acceptance Criteria (Gherkin)

- **Scenario: Tabbed Navigation & Data Rendering**
  - **Given** I am logged in as a Global Admin
  - **When** I navigate to the "Master Data" settings section
  - **Then** I am presented with an interface supporting tabs/sections for Locations, Categories, Brands, Models, Vendors, Owners, Departments, and Custom Statuses.
  - **And** the data is displayed in paginated tables with sorting capabilities.

- **Scenario: Empty State Rendering**
  - **Given** I navigate to the "Brands" tab
  - **When** no brands exist in the database
  - **Then** the data table renders an empty state illustration stating "No records found. Click 'Add Brand' to get started."

- **Scenario: Unauthorized Access Attempt**
  - **Given** I am logged in as an IT Operator or Finance Auditor
  - **When** I attempt to bypass UI restrictions and trigger a Master Data Server Action directly
  - **Then** the Server Action immediately halts execution
  - **And** returns a strict error: "Forbidden: only Global Administrators can manage master data."

### Technical Implementation Tasks

#### Frontend
- [x] Build the `MasterDataLayout` React wrapper component for centralized navigation.
- [x] Implement a reusable `DataTable` UI component with built-in selection, empty states, and bulk actions.
- [x] Build reusable add/edit modals relying on the unified `createMasterDataRecord` action.

#### Backend
- [x] Implement `currentUser.role !== 'GlobalAdmin'` guards at the very top of `createMasterDataRecord`, `updateMasterDataRecord`, and `deleteMasterDataRecords`.

---

## User Story: US-3.2 — Location Data & Hierarchy Management

- **As a** Global Admin,
- **I want** to manage a standardized list of physical company locations and nested sub-locations,
- **So that** IT staff always select valid, hierarchical buildings when assigning hardware.

### Acceptance Criteria (Gherkin)

- **Scenario: Adding a Hierarchical Location**
  - **Given** I click to add a location
  - **When** I input a location name "Floor 3" and select "Colombo HQ" as the `parentId`
  - **Then** the location is saved with a system-generated code (e.g., `LOC-0005`) and linked as a child entity.
  - **And** it is instantly available in asset registration dropdowns globally as "Colombo HQ > Floor 3".

- **Scenario: Toggling Location Active State**
  - **Given** a location is temporarily closed for renovation
  - **When** I edit the location and toggle `isActive` to `false`
  - **Then** the location remains in the database for historical reporting
  - **But** it is filtered out of all new asset assignment dropdowns (`eq(locations.isActive, true)`).

- **Scenario: Universal Deletion Safeguard (Relational Block)**
  - **Given** a location currently holds active assets, assignments, or child locations
  - **When** I attempt to delete the location via the bulk-delete action
  - **Then** the system counts the relational dependencies
  - **And** actively blocks the entire batch deletion, returning a precise error message (e.g., "Delete blocked: selected locations are referenced by 1 asset assignment.").

### Technical Implementation Tasks

#### Backend
- [x] Implement `searchLocations` with proper `canManageAssets` role checks.
- [x] Write relational dependency queries (`countChildLocations`, `countLocationAssignments`, `countLinkedAssetsForEntity`) inside `deleteMasterDataRecords` to prevent orphaned constraints.

---

## User Story: US-3.3 — Department & Cost Center Management

- **As a** Global Admin,
- **I want** to manage a list of corporate departments,
- **So that** the system can automatically generate standardized Cost Center IDs, allowing Finance to accurately group Total Cost of Ownership (TCO) reports by business unit.

### Acceptance Criteria (Gherkin)

- **Scenario: Adding a Department & Auto-Generating the ID**
  - **Given** I am creating a new department
  - **When** I input a new Department Name "Human Resources" and short code "HR"
  - **Then** the system automatically generates a secondary sequence code (`DEP-0001`) and standardizes the internal Cost Center ID.

- **Scenario: Relational User Block**
  - **Given** a department is actively assigned to users in the database
  - **When** I select it and execute a bulk delete action
  - **Then** the system blocks the deletion, returning "Delete blocked: selected departments are assigned to X users."
  - **And** advises me to re-map the users or set the department to inactive instead.

### Technical Implementation Tasks

#### Backend
- [x] Implement department validation schema (Zod) enforcing shortCode lengths.
- [x] Write server-side code generation logic mapping short codes into internal Cost Centers.
- [x] Implement relational deletion checks against the `users` table via `countLinkedUsersForDepartments`.

---

## User Story: US-3.4 — Vendor & Owner Directory Management

- **As a** Global Admin,
- **I want** to maintain directories of authorized suppliers (Vendors) and asset entities (Owners),
- **So that** IT Operators can track asset provenance, purchases, and maintenance contacts.

### Acceptance Criteria (Gherkin)

- **Scenario: Form Validation for Vendor Details**
  - **Given** I am adding a new vendor
  - **When** I input an improperly formatted email address (e.g., "support@dell") or a malformed website URL
  - **Then** the Zod validation schema intercepts the submission
  - **And** returns specific field-level error messages to the UI without touching the database.

- **Scenario: Deletion Safeguard for Purchases & Maintenance**
  - **Given** a Vendor is linked to historical Asset Purchases (`asset_purchases` table) or Maintenance Tickets (`maintenance_tickets` table)
  - **When** I try to delete the vendor via bulk selection
  - **Then** the backend aborts the transaction
  - **And** returns a strict prevention error (e.g., "Delete blocked: selected vendors are referenced by X purchase records.").

### Technical Implementation Tasks

#### Backend
- [x] Handle unified insertion/updating for `vendors` and `owners` inside the master data Server Actions using Zod `vendorSchema` and `ownerSchema`.
- [x] Build safe relational delete blocks: `countVendorPurchaseReferences` and `countVendorMaintenanceReferences`.

---

## User Story: US-3.5 — Brand Management (Manufacturers)

- **As a** Global Admin,
- **I want** to centrally add and manage a standardized list of Brands/Manufacturers,
- **So that** IT Operators select from predefined choices, preventing database fragmentation.

### Acceptance Criteria (Gherkin)

- **Scenario: Duplicate Brand Prevention**
  - **Given** the brand "Lenovo" already exists in the system
  - **When** I attempt to add a new brand with the exact same name
  - **Then** the backend database unique constraints catch the collision
  - **And** return a "Database error: this brand may already exist" message.

- **Scenario: Deletion Prevention (Linked Models)**
  - **Given** the brand "Lenovo" has device models registered under it
  - **When** I attempt a bulk delete action on the brand
  - **Then** the system checks `countLinkedModelsForBrands`
  - **And** blocks the deletion, indicating models are still referencing the brand.

### Technical Implementation Tasks

#### Backend
- [x] Create the `createBrand` specialized server action utilizing Zod validation schemas.
- [x] Implement database-level uniqueness constraints and active/inactive flag states.
- [x] Protect brands in `deleteMasterDataRecords` via the `countLinkedModelsForBrands` relational lock.

---

## User Story: US-3.6 — Brand & Model Hierarchy Management

- **As a** Global Admin,
- **I want** to establish a linked parent-child relationship between Brands (e.g., Apple) and Models (e.g., MacBook Pro) alongside Category mappings,
- **So that** I can upload reference images and strict technical specifications for hardware.

### Acceptance Criteria (Gherkin)

- **Scenario: Defining Models with Images**
  - **Given** I am adding a new device model
  - **When** I select a parent Brand, a parent Category, and attach an image file
  - **Then** the backend utilizes `uploadFileToStorage` to push the file to cloud storage (e.g., Vercel Blob)
  - **And** stores the resulting URL string in the `imageUrl` column of the `models` table along with the generated `MDL-{id}` code.

- **Scenario: Updating Model Specifications**
  - **Given** an existing model has outdated technical details
  - **When** I submit an edit with new JSON stringified technical details
  - **Then** the `updateMasterDataRecord` action updates the specific model while retaining the original image URL if no new file is uploaded.

### Technical Implementation Tasks

#### Backend
- [x] Integrate `uploadFileToStorage` capabilities inside the `createMasterDataRecord` switch block for `device-models`.
- [x] Maintain explicit foreign key validations for both `brandId` and `categoryId`.
- [x] Ensure `deleteMasterDataRecords` blocks the removal of models actively linked to items in the `assets` table.

---

## User Story: US-3.7 — Category Management (Under Pillars)

- **As a** Global Admin,
- **I want** to create custom Asset Categories grouped by high-level Pillars (e.g., IT & Digital, Software),
- **So that** distinct asset types can possess their own flexible JSON schemas for specifications.

### Acceptance Criteria (Gherkin)

- **Scenario: Category Creation with Custom Schema**
  - **Given** I am creating a "Monitors" category
  - **When** I define custom specification requirements (e.g., Resolution, Refresh Rate)
  - **Then** the backend stores this as a stringified `JSONB` structure in the `customSchema` column for future dynamic form rendering.

- **Scenario: Pillar Enforcement**
  - **Given** I attempt to save a category
  - **When** the `pillar` value is unrecognized (e.g., "Vehicles")
  - **Then** the system strictly validates against the `CATEGORY_PILLARS` constant set
  - **And** returns a validation failure: "Invalid pillar provided."

### Technical Implementation Tasks

#### Backend
- [x] Build the specialized `createCategory` Server Action.
- [x] Validate category data structure, enforcing required properties and storing custom schemas natively in Postgres `JSONB`.
- [x] Validate incoming pillar strings against predefined application constants (`IT & Digital`, `Software`, `Office Furniture`, `Office Electronics`).

---

## User Story: US-3.8 — Custom Status Management

- **As a** Global Admin,
- **I want** to define Custom Statuses with visual themes and icons,
- **So that** asset lifecycles can be tagged with organization-specific vocabulary beyond standard hardcoded states.

### Acceptance Criteria (Gherkin)

- **Scenario: Defining a Themed Status**
  - **Given** I am in the Custom Statuses tab
  - **When** I create a new status named "Pending E-Waste" with a "Trash" icon and "Destructive/Red" color theme
  - **Then** the system saves the `name`, `iconName`, and `colorTheme`
  - **And** the status becomes available for IT Operators to apply to end-of-life assets.

- **Scenario: Audit Tracing on Status Creation**
  - **Given** I create a new status
  - **When** the transaction is committed
  - **Then** the `createdById` column securely records my Global Admin ID for accountability.

### Technical Implementation Tasks

#### Backend
- [x] Add `statuses` entity handling to the master data action switch blocks.
- [x] Utilize the `customStatusSchema` to validate `name`, `iconName`, and `colorTheme`.
- [x] Store the creator's ID natively on insertion.

---

## User Story: US-3.9 — Automated Code Generation & Audit Logging

- **As a** Global Admin,
- **I want** the system to automatically generate sequential tracking prefix codes for all master data records and log all changes,
- **So that** the entire system remains strictly uniform, searchable by IDs, and completely auditable for SOC2 compliance.

### Acceptance Criteria (Gherkin)

- **Scenario: Entity Prefix Standardization**
  - **Given** I insert a new master data record across any entity
  - **When** the transaction commits
  - **Then** the backend computes the `max(id) + 1` dynamically
  - **And** prepends the correct 3-letter abbreviation via `MASTER_DATA_CODE_PREFIX` (e.g., CAT, BRD, MDL, VND) with a padded 4-digit sequence (e.g., `CAT-0012`).

- **Scenario: Comprehensive Audit Logging**
  - **Given** I create, edit, or bulk-delete any master data record
  - **When** the Server Action executes the Drizzle ORM query successfully
  - **Then** the system immediately fires `logAuditAction()`
  - **And** records the `entityType`, `entityId`, `actionType` (CREATE/UPDATE/DELETE), `performedById`, and JSON diffs of `oldData` and `newData` securely in the audit table.

### Technical Implementation Tasks

#### Backend
- [x] Define a strict dictionary of code prefixes for all 8 entities (`locations: 'LOC'`, `vendors: 'VND'`, etc.).
- [x] Implement the `formatMasterDataCode` generator padding IDs to 4 zero-filled digits.
- [x] Ensure `logAuditAction` is injected after every successful `insert`, `update`, and `delete` across all switch cases in `master-data.ts`.