# Desktop Wireframes & Screen Catalogue

This document catalogues every distinct desktop screen and overlay in the IDAMS platform, organised by Epic. Each entry describes the layout, key components, and links the wireframe mockup image from the user story specifications.

> **Image Path Convention:** All wireframe images are stored in `docs/1_requirements/user-story-specs/images/` and referenced relatively from that folder.

## Table of Contents

- [1. Epic 1 — Platform Foundation, Master Data & API Gateway](#1-epic-1--platform-foundation-master-data--api-gateway)
  - [1.1 Role Mapping — Split-View UI](#11-role-mapping--split-view-ui)
  - [1.2 Category Builder — Slide-Out Panel](#12-category-builder--slide-out-panel)
  - [1.3 Master Data — Table & CRUD Modals](#13-master-data--table--crud-modals)
  - [1.4 System Audit Log — Filterable Grid](#14-system-audit-log--filterable-grid)
- [2. Epic 2 — Asset Registry & Tethered Scanning](#2-epic-2--asset-registry--tethered-scanning)
  - [2.1 Asset Registration Wizard](#21-asset-registration-wizard)
  - [2.2 Invoice & Financial Details](#22-invoice--financial-details)
  - [2.3 Asset Registry — High-Density Data Grid](#23-asset-registry--high-density-data-grid)
  - [2.4 Asset Details — Slide-Out Panel](#24-asset-details--slide-out-panel)
  - [2.5 QR Code Preview & Print Layout](#25-qr-code-preview--print-layout)
- [3. Epic 3 — IT Operations & Hardware Maintenance](#3-epic-3--it-operations--hardware-maintenance)
  - [3.1 Employee "My Assets" Portal](#31-employee-my-assets-portal)
  - [3.2 Digital Acceptance — Confirmation Page](#32-digital-acceptance--confirmation-page)
  - [3.3 Asset Assignment Flow](#33-asset-assignment-flow)
  - [3.4 Request Return & Condition Review](#34-request-return--condition-review)
  - [3.5 Maintenance Ledger — Tabbed Grid](#35-maintenance-ledger--tabbed-grid)
  - [3.6 Triage Review — Slide-Out Panel](#36-triage-review--slide-out-panel)
  - [3.7 Repair Workflow — Dispatch & Close Modals](#37-repair-workflow--dispatch--close-modals)
- [4. Epic 4 — Compliance-Driven Disposals](#4-epic-4--compliance-driven-disposals)
  - [4.1 Disposals Ledger — Pending Approval](#41-disposals-ledger--pending-approval)
  - [4.2 Disposal Review — Slide-Out Panel](#42-disposal-review--slide-out-panel)
  - [4.3 Hard Stop Compliance — Execution Modal](#43-hard-stop-compliance--execution-modal)
  - [4.4 Disposal Rejection Modal](#44-disposal-rejection-modal)
  - [4.5 Bulk Disposal Processing](#45-bulk-disposal-processing)
  - [4.6 Disposal History — Archived Records](#46-disposal-history--archived-records)
- [5. Epic 5 — Financial Intelligence & Automated Alerts](#5-epic-5--financial-intelligence--automated-alerts)
  - [5.1 Admin KPI Dashboard](#51-admin-kpi-dashboard)
  - [5.2 Report Generation & Preview](#52-report-generation--preview)
  - [5.3 Depreciation Ledger](#53-depreciation-ledger)
  - [5.4 Total Cost of Ownership (TCO)](#54-total-cost-of-ownership-tco)
  - [5.5 Write-Offs & Salvage Ledger](#55-write-offs--salvage-ledger)
  - [5.6 Alert Configuration — Settings](#56-alert-configuration--settings)
  - [5.7 Notification Centre — Bell Dropdown](#57-notification-centre--bell-dropdown)
- [6. Wireframe Image Index](#6-wireframe-image-index)



## 1. Epic 1 — Platform Foundation, Master Data & API Gateway

### 1.1 Role Mapping — Split-View UI

**Screen:** Settings → User Roles & Access

**Layout Description:**
A master-detail split-view interface for mapping Azure AD users to system roles.

| Zone          | Content                                                                                                        |
| :------------ | :------------------------------------------------------------------------------------------------------------- |
| **Left Panel (Master List)** | Vertical list of system roles (Global Admin, IT Operations, Finance Read-Only, Standard Employee). Selecting a role highlights it and populates the right panel. |
| **Right Panel (Detail)**     | Table of users currently assigned to the selected role. Each row shows Name, Email, Department. A trash icon per row enables "Remove Access" (reverts user to Standard Employee). |
| **Add Action**               | "Add User" button opens a searchable Combobox modal. "Hide already mapped" toggle filters out users with existing role assignments. On confirm, user appears in the detail table instantly. |

**Wireframe References:**

![Role Mapping — View Roles](../../1_requirements/user-story-specs/images/User-roles-and-access-view.png)
![Role Mapping — Add User](../../1_requirements/user-story-specs/images/User-roles-and-access-add.png)

**Linked Stories:** US-1.1.2

---

### 1.2 Category Builder — Slide-Out Panel

**Screen:** Settings → Master Data → Categories → Add / Edit

**Layout Description:**
A right-side Slide-Out Sheet (`w-[480px]`) for creating and editing asset categories with their dynamic EAV schemas.

| Zone              | Content                                                                                                        |
| :---------------- | :------------------------------------------------------------------------------------------------------------- |
| **Header**        | "Add New Category" or "Edit Category" title with ✕ close button.                                              |
| **Basic Info**    | Category Name text input. Auto-populated Prefix Code field (read-only with lock icon once saved). Category Type selector (Asset / Consumable). |
| **Custom Fields** | Scrollable list of defined custom fields. Each row: Field Name, Type dropdown (Text, Number, Dropdown), Required toggle. Drag handles for re-ordering via `dnd-kit`. "Add Field" button at bottom. |
| **Footer**        | Cancel and Save buttons. Save validates all fields before committing.                                          |

**Wireframe References:**

![Add New Category](../../1_requirements/user-story-specs/images/Master-Data-Add-new-category.png)
![Edit Category](../../1_requirements/user-story-specs/images/Master-Data-Edit-category.png)

**Linked Stories:** US-1.2.1, US-1.2.2



### 1.3 Master Data — Table & CRUD Modals

**Screen:** Settings → Master Data (Locations / Departments / Vendors / Brands / Models)

**Layout Description:**
Standard Data Grid pattern with tabbed navigation for each entity type. Each tab renders an independent sortable/filterable table with CRUD modal support.

| Zone               | Content                                                                                                       |
| :----------------- | :------------------------------------------------------------------------------------------------------------ |
| **Tab Bar**        | Horizontal tabs: Categories, Locations, Departments, Vendors, Brands, Models. Active tab underlined.          |
| **Toolbar**        | Search input, "Add New" button. Bulk action toolbar appears on checkbox selection (Delete Selected, Export).    |
| **Data Grid**      | Columns vary by entity (e.g., Location: Name, Building, Floor, Room, Active Asset Count). Sortable headers. Row action menu (⋯): Edit, Delete. |
| **Delete State**   | Delete action disabled with tooltip: "Cannot delete: Category contains active assets." when referential dependencies exist. |
| **Add/Edit Modal** | Centred Dialog with entity-specific form fields. Brands table supports parent-child: Model dropdown filtered by selected Brand. |

**Wireframe References:**

![Master Data — Main View](../../1_requirements/user-story-specs/images/Master-Data.png)
![Master Data — Add Modal](../../1_requirements/user-story-specs/images/Master-Data-Add-modal.png)
![Master Data — Bulk Actions](../../1_requirements/user-story-specs/images/Master-Data-Bulk-actions.png)

**Linked Stories:** US-1.3.1, US-1.3.2


### 1.4 System Audit Log — Filterable Grid

**Screen:** Settings → System Audit Log

**Layout Description:**
A high-density, read-only data grid displaying the immutable event ledger with advanced filter capabilities.

| Zone            | Content                                                                                                        |
| :-------------- | :------------------------------------------------------------------------------------------------------------- |
| **Filter Panel** | Collapsible filter sidebar or top filter row. Filters: Date Range (calendar picker), Actor (user search), Action Type (multi-select: CREATE, UPDATE, DELETE, ASSIGN, DISPOSE), Entity Type (Asset, Location, User, etc.). "Apply Filters" button. |
| **Data Grid**   | Columns: Timestamp, Actor (name + avatar), Action (colour-coded Badge: CREATE green, UPDATE blue, DELETE red), Entity, Asset ID, IP Address, Summary. Row click could expand to show Before/After JSON diff. |
| **Export**       | "Export Log to CSV" button in toolbar exports currently filtered dataset.                                       |
| **Immutability** | No edit or delete actions available in the UI. Purely read-only.                                               |

**Wireframe References:**

![Audit Log — Default View](../../1_requirements/user-story-specs/images/System-audit-log.png)
![Audit Log — Filter Panel Open](../../1_requirements/user-story-specs/images/System-audit-log-apply-filters.png)
![Audit Log — Filtered Results](../../1_requirements/user-story-specs/images/System-audit-log-filtered.png)

**Linked Stories:** US-1.4.2



## 2. Epic 2 — Asset Registry & Tethered Scanning

### 2.1 Asset Registration Wizard

**Screen:** Assets → New Asset (Multi-Step Wizard)

**Layout Description:**
A multi-step form wizard that guides administrators through asset creation. The form dynamically adapts based on the selected category's EAV schema.

| Step | Title              | Content                                                                                                        |
| :--- | :----------------- | :------------------------------------------------------------------------------------------------------------- |
| 1    | **Basic Info**     | Category selector (triggers dynamic field loading), Asset Name, Serial Number (unique validation), Location dropdown (Building > Floor > Room), Brand dropdown → cascading Model dropdown, Vendor selector. |
| 2    | **Tech Details**   | Dynamic fields rendered from the category's EAV JSON schema. E.g., for Laptops: CPU, RAM, Storage, OS. For Monitors: Screen Size, Panel Type, Resolution. For Furniture: Dimensions, Material. Fields swap instantly on category change. |
| 3    | **Financial Info** | Base Price, Tax Amount, Shipping Cost (separate fields with auto-calculated Total). Currency selector (NOK, USD, LKR). Invoice PDF drag-and-drop upload zone. |
| 4    | **Review & Submit** | Read-only summary of all entered data across steps. "Submit" button commits the record, auto-generates Asset ID (prefix + sequence) and QR code. |

**Wireframe Reference:**

![Asset Registration Wizard](../../1_requirements/user-story-specs/images/Asset-Registry-Wizard.png)

**Linked Stories:** US-2.1.1, US-2.1.2



### 2.2 Invoice & Financial Details

**Screen:** Assets → New Asset → Step 3 (Financial Info)

**Layout Description:**
The financial data capture step within the registration wizard, featuring separate cost breakdown fields and a secure file upload zone.

| Zone                | Content                                                                                                        |
| :------------------ | :------------------------------------------------------------------------------------------------------------- |
| **Cost Breakdown**  | Three numeric input fields: Base Price, Tax Amount, Shipping Cost. Auto-calculated "Total Initial Cost" displayed below (read-only). |
| **Currency**        | Dropdown selector with flag emoji prefixes: 🇳🇴 NOK, 🇺🇸 USD, 🇱🇰 LKR. Selected currency stored alongside all financial values. |
| **Invoice Upload**  | Drag-and-drop zone with dashed border. Accepts PDF only. On drop: shows filename, file size, and upload progress bar. "Remove" link to clear and re-upload. |
| **Validation**      | All three cost fields required. Non-negative constraint. Inline errors on invalid input.                       |

**Wireframe Reference:**

![Invoice Upload & Financial Details](../../1_requirements/user-story-specs/images/Attach-invoice.png)

**Linked Stories:** US-2.1.3



### 2.3 Asset Registry — High-Density Data Grid

**Screen:** Assets → Asset Registry (Main Grid)

**Layout Description:**
The central hub for viewing, filtering, and managing the complete IT inventory. Follows the standard Data Grid composite pattern.

| Zone              | Content                                                                                                        |
| :---------------- | :------------------------------------------------------------------------------------------------------------- |
| **Toolbar**       | Global search input, facet filter dropdowns (Category, Status, Location, Custodian), Column Visibility "View" button (multi-select checklist), action buttons (+ New Asset, 🖨 Print Labels). |
| **Data Grid**     | Sticky header row. Columns: ☐ (checkbox), Asset ID, Name, Category, Status (colour-coded Badge), Location, Custodian, Purchase Date, Book Value, ⋯ (action menu). Pagination: 10/25/50/100 rows per page. |
| **Bulk Toolbar**  | Appears when ≥1 row selected. Actions: "Bulk Edit" (Location/Status), "Print Labels", "Bulk Dispose" (Epic 4). Selection count displayed. |
| **Row Interaction** | Single click opens the Asset Details Slide-Out Panel from the right. Grid scroll position and active filters are preserved. |
| **Action Menu (⋯)** | Per-row dropdown: Edit, Assign, Request Return, View History, Print QR, Dispose.                             |
| **Dropdown View** | Column visibility dropdown to showing/hiding columns customization of the grid view.                           |

**Wireframe References:**

![Asset Registry — Grid View](../../1_requirements/user-story-specs/images/Asset-List-View-Desktop.png)
![Asset Registry — Dropdown](../../1_requirements/user-story-specs/images/Asset%20List%20View%20Dropdown%20-%20Desktop.png)

**Linked Stories:** US-2.2.1



### 2.4 Asset Details — Slide-Out Panel

**Screen:** Asset Registry → Row Click → Right-Side Sheet

**Layout Description:**
A comprehensive right-side Slide-Out Sheet (`w-[480px]`) displaying all information about a single asset across multiple tabs.

| Zone         | Content                                                                                                        |
| :----------- | :------------------------------------------------------------------------------------------------------------- |
| **Header**   | Asset ID (bold), Asset Name, Status Badge (colour-coded). ✕ close button top-right.                           |
| **Tab: Vitals** | Key-value list: Category, Serial Number, Location (Building > Floor > Room), Custodian (name + department), Brand/Model, Warranty Status + Expiry Date, Current Status. |
| **Tab: Technical Details** | Category-specific custom fields rendered from the EAV schema (e.g., CPU, RAM, Storage, OS for Laptops). Read-only display with field labels matching the Category Builder definitions. |
| **Tab: Purchase / Financial** | Purchase Date, Vendor, Invoice PDF download link, Cost Breakdown (Base, Tax, Shipping, Total), Currency, Current Book Value (depreciated), Total Cost of Ownership (TCO). |
| **Tab: QR Code** | QR code image preview (scannable). Print options: "Print Single Tag (Zebra/Dymo)" and "Print A4 Grid". TIQRI logo + Asset ID text beneath the QR image. |
| **Tab: History** | Vertical Timeline component showing all lifecycle events: Assignments, Returns, Status Changes, Repairs, Edits. Each entry: Timestamp, Action, Old Value → New Value, Actor. "Download History as CSV" button at footer. |
| **Footer**   | Contextual action buttons based on current status. Available: [Edit] [Assign] [Print QR]. Assigned: [Edit] [Request Return] [Print QR]. In Repair: [Edit] [Close Repair]. |

**Wireframe References:**

![Asset Details — Assigned State](../../1_requirements/user-story-specs/images/Asset-Details-(Assigned)-Desktop.png)
![Asset Details — Technical Specs](../../1_requirements/user-story-specs/images/Tech-Details-Desktop.png)
![Asset Details — Purchase Info](../../1_requirements/user-story-specs/images/Purchase-Details-Desktop.png)

**Linked Stories:** US-2.2.2



### 2.5 QR Code Preview & Print Layout

**Screen:** Asset Details → QR Code Tab

**Layout Description:**
Preview and print controls for the asset's QR code label.

| Zone             | Content                                                                                                        |
| :--------------- | :------------------------------------------------------------------------------------------------------------- |
| **QR Preview**   | Rendered QR code image encoding `assets.tiqri.com/asset/{ASSET_ID}`. Scannable directly from screen.          |
| **Label Layout** | TIQRI Logo (top), QR code (centre), Asset ID text (bottom).                                                   |
| **Print Options**| "Print Single Tag" — formatted for Zebra/Dymo thermal printers (label roll). "Print A4 Grid" — multi-up layout aligned to Avery 5160 sticker sheets. Bulk print available from registry grid toolbar for multiple selected assets. |

**Wireframe Reference:**

![QR Code Preview & Print](../../1_requirements/user-story-specs/images/Asset-Details-(QR-preview)-Desktop.png)

**Linked Stories:** US-2.3.1, US-2.3.2



## 3. Epic 3 — IT Operations & Hardware Maintenance

### 3.1 Employee "My Assets" Portal

**Screen:** Employee View → My Assets

**Layout Description:**
A simplified, mobile-responsive read-only grid filtered to show only assets assigned to the currently logged-in employee.

| Zone           | Content                                                                                                        |
| :------------- | :------------------------------------------------------------------------------------------------------------- |
| **Grid**       | Simplified columns: Asset ID, Name, Category, Status, Assigned Date. No bulk actions, no edit capabilities.     |
| **Row Click**  | Opens a compact detail view (read-only) with assigned asset vitals.                                            |
| **Actions**    | "Report Issue" button per row submits a damage/issue ticket to IT (routes to Maintenance Ledger Pending tab).  |
| **Responsive** | Single-column card layout on mobile devices. Fully usable without horizontal scrolling.                        |

**Wireframe Reference:**

![Employee "My Assets" Portal](../../1_requirements/user-story-specs/images/My-assets.png)

**Linked Stories:** US-3.1.1



### 3.2 Digital Acceptance — Confirmation Page

**Screen:** Public Token-Secured Landing Page (`/confirm/{token}`)

**Layout Description:**
A standalone page accessed via a unique link sent by email or Microsoft Teams adaptive card when an asset is assigned to an employee.

| Zone           | Content                                                                                                        |
| :------------- | :------------------------------------------------------------------------------------------------------------- |
| **Header**     | IDAMS logo, "Asset Custody Confirmation" heading.                                                              |
| **Asset Card** | Read-only summary: Asset ID, Name, Category, Serial Number, Assigned By (admin), Assignment Date.              |
| **Action**     | Large "Confirm Receipt" primary button. Clicking transitions assignment status from "Assigned (Pending)" → "Assigned (Confirmed)". |
| **Post-Click** | Success state replaces the button: "✓ Receipt Confirmed on {date}". Page becomes inert — no further action possible. |
| **Expiry**     | If the token has expired (7 days), the page displays: "This confirmation link has expired. Please contact IT support." |

**Wireframe Reference:**

![Digital Acceptance — Confirm Receipt](../../1_requirements/user-story-specs/images/Confirm-reciept.png)

**Linked Stories:** US-3.1.2



### 3.3 Asset Assignment Flow

**Screen:** Asset Details → Assign Action → Assign Asset Modal

**Layout Description:**
A two-step flow: selecting an asset from the registry and then assigning it via a modal dialog.

| Zone                          | Content                                                                                                        |
| :---------------------------- | :------------------------------------------------------------------------------------------------------------- |
| **Pre-Selection (Registry)**  | Admin selects an asset from the grid (or opens its slide-out panel) and clicks "Assign" in the action bar.     |
| **Assignment Modal — Target** | Searchable Combobox for selecting the target: User (name + department + avatar) or Location (Building > Floor > Room). Team/department-level assignments are blocked with explanation tooltip. |
| **Assignment Modal — Options**| Optional "Expected Return Date" calendar picker (for temporary loaners/equipment loans). Notes field for assignment context. |
| **Assignment Modal — Footer** | "Cancel" and "Confirm Assignment" buttons. On confirm: asset status → Assigned, custody notification dispatched (email + Teams). |

**Wireframe References:**

![Asset Assignment — Selection View](../../1_requirements/user-story-specs/images/Asset-Assignment-to-User.png)
![Assign Asset Modal](../../1_requirements/user-story-specs/images/Assign-Asset.png)

**Linked Stories:** US-3.2.1



### 3.4 Request Return & Condition Review

**Screen:** Asset Details → Request Return / Check-In Flow

**Layout Description:**
Two connected interaction points: initiating a return request and processing the physical check-in with condition assessment.

**Request Return:**

| Zone              | Content                                                                                                        |
| :---------------- | :------------------------------------------------------------------------------------------------------------- |
| **Trigger**       | "Request Return" button in the Asset Details slide-out panel footer (visible only for Assigned assets).         |
| **Action**        | Sends a return notification to the current custodian via email and Teams. Asset row in the grid shows a "Requested" status badge/label. No modal — single-click action with confirmation toast. |

**Condition Review (Check-In Modal):**

| Zone              | Content                                                                                                        |
| :---------------- | :------------------------------------------------------------------------------------------------------------- |
| **Header**        | "Check-In Asset: {Asset ID}" modal title.                                                                      |
| **Condition**     | Mandatory Radio Group: Good Working Condition, Working with Minor Issues, Needs Repair, Beyond Repair.         |
| **Notes**         | "Condition Notes" textarea for detailed observations.                                                           |
| **Status Routing**| Condition selection drives automatic status update: Good → Available, Minor Issues/Needs Repair → routes to Maintenance (In Repair), Beyond Repair → routes to Disposal (Pending Disposal). |
| **Footer**        | "Cancel" and "Confirm Check-In". On confirm: assignment record closed, status updated, audit event logged.      |

**Wireframe References:**

![Request Return](../../1_requirements/user-story-specs/images/Request-Return.png)
![Condition Review Modal](../../1_requirements/user-story-specs/images/Review-Condition.png)

**Linked Stories:** US-3.2.2, US-3.2.3



### 3.5 Maintenance Ledger — Tabbed Grid

**Screen:** Operations → Maintenance

**Layout Description:**
A tabbed data grid following the Tabbed Ledger pattern, providing a pipeline view of all maintenance and repair activity.

| Tab                  | Content                                                                                                        |
| :------------------- | :------------------------------------------------------------------------------------------------------------- |
| **Pending Review**   | Employee-submitted issue reports and defective return check-ins awaiting IT triage. Columns: Ticket ID, Asset ID, Reporter, Issue Description, Date Submitted, Priority. Row click → Triage Review slide-out. Badge count in tab label: "Pending Review (12)". |
| **Active Repairs**   | Assets dispatched to vendors. Columns: Asset ID, Vendor, RMA Ticket #, Estimated Cost, Expected Return Date, Days Elapsed. Status indicators for overdue repairs (red highlight). |
| **Repair History**   | Closed repair records. Columns: Asset ID, Vendor, Final Cost, Service Date, Outcome (Repaired / Flagged for Disposal). Read-only. |

**Wireframe Reference:**

![Maintenance Ledger — Tabbed View](../../1_requirements/user-story-specs/images/Track-maintenance.png)

**Linked Stories:** US-3.3.1



### 3.6 Triage Review — Slide-Out Panel

**Screen:** Maintenance → Pending Review → Row Click → Right-Side Sheet

**Layout Description:**
A right-side Slide-Out Sheet presenting the full context needed for an IT admin to make a triage decision on a reported issue.

| Zone            | Content                                                                                                        |
| :-------------- | :------------------------------------------------------------------------------------------------------------- |
| **Header**      | Asset ID, Asset Name, "Pending Review" status badge.                                                           |
| **Issue Detail**| Reporter name + department, date submitted, issue description (full text), attached photos (if any).           |
| **Asset Context**| Current Warranty Status (Active / Expired + date), Current Book Value (depreciated), Assignment History summary. This context helps admins decide between repair vs. disposal. |
| **Footer**      | Two action buttons: "Resolve Internally" (closes ticket, status → Available or custom) and "Log Repair Ticket" (opens Initiate Repair modal, routes to Active Repairs tab). |

**Wireframe Reference:**

![Triage Review — Slide-Out](../../1_requirements/user-story-specs/images/pending-maintenance.png)

**Linked Stories:** US-3.3.2



### 3.7 Repair Workflow — Dispatch & Close Modals

**Screen:** Maintenance → Initiate Repair / Close Repair Modals

**Layout Description:**
Two sequential modal dialogs managing the vendor repair lifecycle.

**Initiate Repair (Dispatch) Modal:**

| Field                  | Type           | Description                                                     |
| :--------------------- | :------------- | :-------------------------------------------------------------- |
| Vendor                 | Select         | Dropdown of registered vendors from Master Data.                |
| RMA Ticket Number      | Text Input     | External vendor reference number for tracking.                  |
| Estimated Repair Cost  | Number Input   | Vendor's quoted cost ($).                                       |
| Expected Return Date   | Date Picker    | Vendor's estimated completion date.                             |
| Notes                  | Textarea       | Additional dispatch instructions.                               |

On confirm: asset status → In Repair, asset un-assigned from current employee, record moves to "Active Repairs" tab.

**Close Repair (Completion) Modal:**

| Field                  | Type           | Description                                                     |
| :--------------------- | :------------- | :-------------------------------------------------------------- |
| Service Date           | Date Picker    | Actual date the repair was completed.                           |
| Final Cost             | Number Input   | Actual cost charged by vendor ($). Updates TCO.                 |
| Post-Repair Action     | Radio Group    | "Return to Service" (status → Available) or "Flag for Disposal" (status → Pending Disposal, routes to Epic 4). |

**Wireframe References:**

![Dispatch to Vendor — Initiate Repair](../../1_requirements/user-story-specs/images/Dispatch.png)
![Close Repair Modal](../../1_requirements/user-story-specs/images/Complete-repair.png)

**Linked Stories:** US-3.4.1, US-3.4.2



## 4. Epic 4 — Compliance-Driven Disposals

### 4.1 Disposals Ledger — Pending Approval

**Screen:** Operations → Disposals → Pending Approval Tab

**Layout Description:**
A tabbed data grid displaying disposal requests awaiting executive/financial review.

| Zone              | Content                                                                                                        |
| :---------------- | :------------------------------------------------------------------------------------------------------------- |
| **Tab Bar**       | Two tabs: "Pending Approval" (active queue) and "Disposal History" (archived records).                         |
| **Toolbar**       | Search, filter by Category/Requester. Bulk select checkboxes for batch processing (Epic 4.3).                  |
| **Data Grid**     | Columns: Asset ID, Name, Category, Current Book Value, Requester, Request Date, Justification (truncated), Status. Row click → Disposal Review slide-out panel. |
| **Bulk Actions**  | On ≥1 selection: "Bulk Dispose" button appears in toolbar (opens Bulk Compliance modal).                       |

**Wireframe Reference:**

![Disposals Ledger — Pending Approval](../../1_requirements/user-story-specs/images/Asset%20Disposal%20Pending-%20Desktop.png)

**Linked Stories:** US-4.1.1



### 4.2 Disposal Review — Slide-Out Panel

**Screen:** Disposals → Pending Approval → Row Click → Right-Side Sheet

**Layout Description:**
A right-side review panel presenting all financial and contextual data needed for an executive or financial reviewer to approve or reject a disposal request.

| Zone            | Content                                                                                                        |
| :-------------- | :------------------------------------------------------------------------------------------------------------- |
| **Header**      | Asset ID, Name, "Pending Disposal" status badge.                                                               |
| **Financial**   | Original Purchase Cost, Current Depreciated Book Value (computed), Depreciation Method (Straight-Line), Useful Life, Age. |
| **Justification**| IT admin's justification notes explaining why the asset should be disposed.                                   |
| **History**     | Brief lifecycle summary: last repair date, total maintenance costs, total assignments.                          |
| **Footer**      | Two action buttons: "Reject Request" (opens Rejection modal) and "Approve & Dispose" (opens Hard Stop Compliance modal). |

**Wireframe Reference:**

![Disposal Review — Slide-Out](../../1_requirements/user-story-specs/images/Request%20Disposal%20Review-%20Desktop.png)

**Linked Stories:** US-4.1.2



### 4.3 Hard Stop Compliance — Execution Modal

**Screen:** Disposals → Approve & Dispose → Compliance Execution Modal

**Layout Description:**
A multi-section modal that enforces mandatory compliance checks before an asset can be permanently disposed. The "Confirm Disposal" button remains disabled until all conditions are satisfied.

| Section             | Content                                                                                                       |
| :------------------ | :------------------------------------------------------------------------------------------------------------ |
| **Security Checklist** | Required checkboxes: ☐ "Confirm: All data has been securely wiped", ☐ "Confirm: Physical asset tags have been removed". Both must be checked. |
| **E-Waste Certificate** | Drag-and-drop PDF upload zone for the Certificate of Destruction. Required for E-Waste disposals. File name and size displayed on upload. Stored with 7-year retention policy. |
| **Disposal Method** | Mandatory Select dropdown: "E-Waste Recycling", "Sold", "Donated". Selection determines which downstream fields are optional (e.g., Salvage Value for "Sold"). |
| **Asset ID Confirmation** | Text input requiring the exact Asset ID to be typed (e.g., `AST-LAP-089`). Acts as a final deliberate confirmation — compared server-side. |
| **Salvage Value**   | Optional numeric input (shown when Disposal Method = "Sold" or "Donated"). Feeds into the Write-Offs & Salvage Ledger (Epic 5). |
| **Footer**          | "Cancel" and **"Confirm Disposal"** (disabled until all conditions met). On confirm: status → Disposed/Donated, `is_archived = true`, fields locked, audit event logged. |

**Wireframe Reference:**

![Hard Stop Compliance Modal](../../1_requirements/user-story-specs/images/Asset%20disposal%20modal%20(accept%20request)%20-%20Desktop.png)

**Linked Stories:** US-4.2.1



### 4.4 Disposal Rejection Modal

**Screen:** Disposals → Reject Request → Rejection Modal

**Layout Description:**
A dialog for rejecting a disposal request with mandatory reasoning.

| Zone             | Content                                                                                                        |
| :--------------- | :------------------------------------------------------------------------------------------------------------- |
| **Reason**       | Mandatory Textarea: reviewer must explain the rejection (e.g., "Asset still has 2 years of warranty remaining"). |
| **Re-route**     | Status re-routing Select dropdown: the reviewer selects the new status for the asset (e.g., "Available", "In Repair"). Defaults to "Available". |
| **Notification** | On confirm: the original requester receives an in-app notification with the rejection reason. Asset status updated per selection. |
| **Footer**       | "Cancel" and "Confirm Rejection".                                                                              |

**Wireframe Reference:**

![Disposal Rejection Modal](../../1_requirements/user-story-specs/images/Request%20rejection-%20Desktop.png)

**Linked Stories:** US-4.2.2



### 4.5 Bulk Disposal Processing

**Screen:** Disposals → Pending Approval → Bulk Selection → Bulk Compliance Modal

**Layout Description:**
An extended version of the Hard Stop Compliance modal designed for batch disposal of multiple assets in a single transaction.

| Zone                     | Content                                                                                                       |
| :----------------------- | :------------------------------------------------------------------------------------------------------------ |
| **Selected Assets**      | Summary table showing all selected Asset IDs, Names, and Book Values. Total count prominently displayed.       |
| **Shared Certificate**   | Single E-Waste PDF upload zone covering the entire batch. All assets linked to the same certificate URL.       |
| **Confirmation Input**   | Text input requiring exact phrase: "DISPOSE {N} ASSETS" (e.g., "DISPOSE 30 ASSETS") to unlock the button.     |
| **Footer**               | "Cancel" and "Confirm Bulk Disposal" (disabled until text matches). Processes all assets in a single database transaction. |

**Wireframe References:**

![Bulk Disposal — Selection & Actions](../../1_requirements/user-story-specs/images/Asset%20Disposal%20Pending%20bulk%20actions%20-%20Desktop.png)
![Bulk Disposal — Confirmation Modal](../../1_requirements/user-story-specs/images/Asset%20Disposal%20Pending%20bulk%20actions%20-%20Desktop%202.png)

**Linked Stories:** US-4.3.1



### 4.6 Disposal History — Archived Records

**Screen:** Operations → Disposals → Disposal History Tab

**Layout Description:**
A read-only data grid showing all finalised disposal records. All fields are permanently locked for disposed assets.

| Zone              | Content                                                                                                        |
| :---------------- | :------------------------------------------------------------------------------------------------------------- |
| **Data Grid**     | Columns: Asset ID, Name, Category, Disposal Method, Disposal Date, Book Value at Disposal, Salvage Value, Disposed By. Row click opens a read-only detail view. |
| **Certificate**   | Direct download links to E-Waste Certificates of Destruction per asset (stored with 7-year retention).         |
| **Visibility**    | Disposed assets are filtered out of the main Asset Registry grid by default. Visible only in this Disposal History tab and to Auditors. |
| **Immutability**  | No edit, re-assign, or status change actions available. `PUT/PATCH` requests to disposed assets are blocked server-side (NFR-SEC-07). |

**Wireframe Reference:**

![Disposal History — Archived Records](../../1_requirements/user-story-specs/images/Asset%20Disposal%20HistoryDesktop.png)

**Linked Stories:** US-4.3.2



## 5. Epic 5 — Financial Intelligence & Automated Alerts

### 5.1 Admin KPI Dashboard

**Screen:** Dashboard (Landing Page for Global Admins)

**Layout Description:**
A responsive widget grid providing an at-a-glance overview of the organisation's IT asset portfolio health.

| Widget                     | Content                                                                                                        |
| :------------------------- | :------------------------------------------------------------------------------------------------------------- |
| **Total Assets**           | Aggregate count of all registered (non-archived) assets. Click navigates to Asset Registry grid.               |
| **Pending Approvals**      | Count of items awaiting action (Disposal Requests, Pending Assignments). Click → relevant pending queue.        |
| **Overdue Returns**        | List of assets past their Expected Return Date. Click → Asset Registry filtered by overdue status.             |
| **Low Stock Alerts**       | Consumable items below configured threshold quantities. Click → filtered consumable grid.                      |
| **Recent Activity Log**    | Vertical activity feed showing the latest system events (assignments, disposals, repairs) with actor, action, and relative timestamp. |
| **Problem Asset Counts**   | Chart/card showing frequently failing assets — assets with ≥3 repair tickets. Click → filtered maintenance grid. |

**Layout:** Responsive CSS Grid: `repeat(auto-fit, minmax(320px, 1fr))`. Skeleton loaders while data resolves. Target: full render < 2 seconds (NFR-PERF-01). Single-column stack on mobile.

**Wireframe Reference:**

![Admin KPI Dashboard](../../1_requirements/user-story-specs/images/Dashboard%20-%20Desktop.png)

**Linked Stories:** US-5.1.1



### 5.2 Report Generation & Preview

**Screen:** Reports → Generate Report

**Layout Description:**
A configuration panel for generating on-demand reports with in-browser HTML preview and multi-format export.

| Zone                | Content                                                                                                        |
| :------------------ | :------------------------------------------------------------------------------------------------------------- |
| **Parameters**      | Date Range picker (start/end), Location filter (optional), Report Type selector (Inventory by Department, Assets by Status, Financial Summary, Compliance Audit). |
| **Generate Button** | "Generate Report" triggers server-side computation. Progress indicator shown during processing.                 |
| **HTML Preview**    | Report renders as formatted HTML directly in the browser. Tables, charts, and summary sections visible for in-browser review before export. |
| **Export Actions**   | Three export buttons: "Download PDF", "Download CSV", "Download Excel (.xlsx)". Must handle up to 50,000 rows (NFR-PERF-04). Download initiates within 10 seconds. |

**Wireframe References:**

![Report Configuration](../../1_requirements/user-story-specs/images/Report%20Generation%20-%20Desktop.png)
![Report HTML Preview](../../1_requirements/user-story-specs/images/Report%20Generation%20preview%20-%20Desktop.png)

**Linked Stories:** US-5.1.2



### 5.3 Depreciation Ledger

**Screen:** Financials → Depreciation Ledger

**Layout Description:**
A data grid within the RBAC-restricted Financials module showing real-time straight-line depreciation calculations for all tracked assets.

| Zone              | Content                                                                                                        |
| :---------------- | :------------------------------------------------------------------------------------------------------------- |
| **Access**        | Sidebar accordion: Financials → Depreciation. Restricted to Finance/Global Admin roles.                        |
| **Data Grid**     | Columns: Asset ID, Name, Category, Purchase Date, Base Cost, Useful Life (years), Salvage Value, Age (computed), Annual Depreciation, **Current Book Value** (computed in real-time). |
| **Calculation**   | Straight-line formula: `Current Book Value = Base Cost - ((Base Cost - Salvage Value) / Useful Life × Age)`. Minimum value = Salvage Value (floor). |
| **Filtering**     | Filter by Category, Location, Date Range. Sort by Book Value to surface near-zero assets approaching end-of-life. |

**Wireframe Reference:**

![Depreciation Ledger](../../1_requirements/user-story-specs/images/Depreciation%20Ledger%20-%20Desktop.png)

**Linked Stories:** US-5.2.1



### 5.4 Total Cost of Ownership (TCO)

**Screen:** Financials → TCO Ledger

**Layout Description:**
A data grid aggregating the true cost of each asset by combining purchase price with all historical maintenance expenses.

| Zone              | Content                                                                                                        |
| :---------------- | :------------------------------------------------------------------------------------------------------------- |
| **Data Grid**     | Columns: Asset ID, Name, Category, Original Cost, Total Repair Costs (sum of all maintenance `FinalCost` records), **TCO** (Original + Repairs), Current Book Value, TCO vs. Book Value ratio. |
| **Flagged Rows**  | Rows where total repair costs exceed the current depreciated book value are highlighted (amber/red) with a warning icon — signals repair-vs-replace decision point. |
| **Drill-Down**    | Row click opens Asset Details slide-out, pre-navigated to the Financial tab showing the full cost breakdown.    |

**Wireframe Reference:**

![Total Cost of Ownership (TCO)](../../1_requirements/user-story-specs/images/Total%20Cost%20of%20Ownership%20(TCO)%20-%20Desktop.png)

**Linked Stories:** US-5.2.2



### 5.5 Write-Offs & Salvage Ledger

**Screen:** Financials → Write-Offs & Salvage

**Layout Description:**
A tab within the Financials module listing all disposed assets alongside their final financial position.

| Zone              | Content                                                                                                        |
| :---------------- | :------------------------------------------------------------------------------------------------------------- |
| **Data Grid**     | Columns: Asset ID, Name, Category, Disposal Date, Disposal Method, Book Value at Disposal, Salvage Value Recovered, **Net Loss/Gain** (Salvage - Book Value). |
| **Totals Row**    | Summary footer showing aggregate: Total Write-Offs, Total Salvage Recovered, Net Financial Position.           |
| **Data Source**    | Salvage Value is captured during the Hard Stop Compliance modal (Epic 4, §4.3) via the optional `SalvageValue` numeric input. |

**Wireframe Reference:**

![Write-Offs & Salvage Ledger](../../1_requirements/user-story-specs/images/Write-Offs%20&%20Salvage%20-%20Desktop.png)

**Linked Stories:** US-5.2.3



### 5.6 Alert Configuration — Settings

**Screen:** Settings → Alert Configuration

**Layout Description:**
An administrative configuration page allowing Global Admins to enable/disable automated alert rules and set threshold parameters.

| Rule Type              | Controls                                                                                                       |
| :--------------------- | :------------------------------------------------------------------------------------------------------------- |
| **Warranty Expiration**| Toggle switch (On/Off). Threshold dropdown: "Alert X days before expiry" (30, 60, 90 days).                    |
| **License Renewal**    | Toggle switch. Threshold dropdown: same as above.                                                              |
| **Overdue Returns**    | Toggle switch. Triggers when an assigned asset passes its Expected Return Date with no check-in.               |
| **Overdue Repairs**    | Toggle switch. Threshold: "Alert X days after expected return date" (7, 14, 30). Routes to the `CreatedBy` user who dispatched the repair. |
| **Low Stock**          | Toggle switch. Threshold: "Alert when quantity falls below X" (configurable per consumable category).           |

All rules feed the nightly CRON engine (see [CRON Alert Engine](../05_business_logic/cron-alert-engine.md)). Alerts dispatched via Email + Microsoft Teams.

**Wireframe Reference:**

![Alert Configuration — Settings](../../1_requirements/user-story-specs/images/Alerts%20&%20Notifications%20Settings%20-%20Desktop.png)

**Linked Stories:** US-5.3.1



### 5.7 Notification Centre — Bell Dropdown

**Screen:** Global Header → Bell Icon → Popover Dropdown

**Layout Description:**
A notification inbox accessible from the persistent header bar on every page.

| Zone              | Content                                                                                                        |
| :---------------- | :------------------------------------------------------------------------------------------------------------- |
| **Trigger**       | Bell icon in the Global Header. Red badge with unread count (e.g., "3"). Badge hidden when count = 0.         |
| **Dropdown List** | Scrollable list of notification items. Each item: icon (alert type), title (e.g., "Warranty Expiring: LAP-0142"), description snippet, relative timestamp ("2 hours ago"), read/unread state (bold vs. normal). |
| **Actions**       | "Mark all as read" link at top. Individual click marks notification as read and navigates via deep-link to the relevant asset details slide-out panel. |
| **Empty State**   | When no notifications: "You're all caught up! ✓" message with muted icon.                                      |
| **Storage**       | Backed by `notifications` database table tracking read/unread state per user. Items persist until explicitly dismissed or aged out. |

**Wireframe Reference:**

![Notification Centre — Bell Dropdown](../../1_requirements/user-story-specs/images/Notifications%20-%20Desktop.png)

**Linked Stories:** US-5.3.2



## 6. Wireframe Image Index

Complete index of all wireframe mockup images, organised by Epic and screen.

| #  | Filename                                             | Epic | Screen / Component                                |
| :- | :--------------------------------------------------- | :--- | :------------------------------------------------ |
| 1  | `User-roles-and-access-view.png`                     | 1    | Role Mapping — Master-Detail View                 |
| 2  | `User-roles-and-access-add.png`                      | 1    | Role Mapping — Add User Modal                     |
| 3  | `Master-Data-Add-new-category.png`                   | 1    | Category Builder — Add New Category               |
| 4  | `Master-Data-Edit-category.png`                      | 1    | Category Builder — Edit Category                  |
| 5  | `Master-Data.png`                                    | 1    | Master Data — Main Table View                     |
| 6  | `Master-Data-Add-modal.png`                          | 1    | Master Data — Add Item Modal                      |
| 7  | `Master-Data-Bulk-actions.png`                       | 1    | Master Data — Bulk Actions Toolbar                |
| 8  | `System-audit-log.png`                               | 1    | System Audit Log — Default View                   |
| 9  | `System-audit-log-apply-filters.png`                 | 1    | System Audit Log — Filter Panel Open              |
| 10 | `System-audit-log-filtered.png`                      | 1    | System Audit Log — Filtered Results               |
| 11 | `Asset-Registry-Wizard.png`                          | 2    | Asset Registration — Multi-Step Wizard            |
| 12 | `Attach-invoice.png`                                 | 2    | Invoice Upload & Financial Details                |
| 13 | `Asset-List-View-Desktop.png`                        | 2    | Asset Registry — High-Density Data Grid           |
| 14 | `Asset List View Dropdown - Desktop.png`             | 2    | Asset Registry — Column Visibility Dropdown       |
| 15 | `Asset-Details-(Assigned)-Desktop.png`               | 2    | Asset Details — Slide-Out (Assigned State)        |
| 16 | `Tech-Details-Desktop.png`                           | 2    | Asset Details — Technical Specifications Tab      |
| 17 | `Purchase-Details-Desktop.png`                       | 2    | Asset Details — Purchase / Financial Tab          |
| 18 | `Asset-Details-(QR-preview)-Desktop.png`             | 2    | Asset Details — QR Code Preview & Print           |
| 19 | `My-assets.png`                                      | 3    | Employee "My Assets" Portal                       |
| 20 | `Confirm-reciept.png`                                | 3    | Digital Acceptance — Confirmation Page            |
| 21 | `Asset-Assignment-to-User.png`                       | 3    | Asset Assignment — Selection View                 |
| 22 | `Assign-Asset.png`                                   | 3    | Assign Asset Modal                                |
| 23 | `Request-Return.png`                                 | 3    | Request Return Action                             |
| 24 | `Review-Condition.png`                               | 3    | Return Check-In — Condition Review Modal          |
| 25 | `Track-maintenance.png`                              | 3    | Maintenance Ledger — Tabbed Grid                  |
| 26 | `pending-maintenance.png`                            | 3    | Triage Review — Slide-Out Panel                   |
| 27 | `Dispatch.png`                                       | 3    | Initiate Repair — Dispatch to Vendor Modal        |
| 28 | `Complete-repair.png`                                | 3    | Close Repair — Final Cost Entry Modal             |
| 29 | `Dashboard - Desktop.png`                            | 5    | Admin KPI Dashboard                               |
| 30 | `Asset Disposal Pending- Desktop.png`                | 4    | Disposals Ledger — Pending Approval Tab           |
| 31 | `Request Disposal Review- Desktop.png`               | 4    | Disposal Review — Slide-Out Panel                 |
| 32 | `Asset disposal modal (accept request) - Desktop.png`| 4    | Hard Stop Compliance — Execution Modal            |
| 33 | `Request rejection- Desktop.png`                     | 4    | Disposal Rejection Modal                          |
| 34 | `Asset Disposal Pending bulk actions - Desktop.png`  | 4    | Bulk Disposal — Selection & Actions Toolbar       |
| 35 | `Asset Disposal Pending bulk actions - Desktop 2.png`| 4    | Bulk Disposal — Confirmation Modal                |
| 36 | `Asset Disposal HistoryDesktop.png`                  | 4    | Disposal History — Archived Records               |
| 37 | `Report Generation - Desktop.png`                    | 5    | Report Configuration UI                           |
| 38 | `Report Generation preview - Desktop.png`            | 5    | Report HTML Preview                               |
| 39 | `Depreciation Ledger - Desktop.png`                  | 5    | Straight-Line Depreciation Ledger                 |
| 40 | `Total Cost of Ownership (TCO) - Desktop.png`        | 5    | TCO Ledger                                        |
| 41 | `Write-Offs & Salvage - Desktop.png`                 | 5    | Write-Offs & Salvage Ledger                       |
| 42 | `Alerts & Notifications Settings - Desktop.png`      | 5    | Alert Configuration Settings                      |
| 43 | `Notifications - Desktop.png`                        | 5    | Notification Centre — Bell Dropdown               |
| 44 | `Employee-Portal-Mobile.png`                         | 3    | Employee Portal — Mobile View                     |

[< Back to Design Docs](../README.md)
