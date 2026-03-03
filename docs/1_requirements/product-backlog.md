# Product Backlog

Consolidated task-level backlog, from the [Detailed User Story Specifications](./user-story-specs/README.md). Every task maps back to a User Story, Feature, and Epic.

**Last Updated:** 03/03/2026

## Table of Contents

- [Summary](#summary)
- [Epic 1 — Platform Foundation, Master Data & API Gateway](#epic-1--platform-foundation-master-data--api-gateway)
- [Epic 2 — Asset Registry & Tethered Scanning](#epic-2--asset-registry--tethered-scanning)
- [Epic 3 — IT Operations & Hardware Maintenance](#epic-3--it-operations--hardware-maintenance)
- [Epic 4 — Compliance-Driven Disposals](#epic-4--compliance-driven-disposals)
- [Epic 5 — Financial Intelligence & Automated Alerts](#epic-5--financial-intelligence--automated-alerts)

## Summary

| Epic | Name                                           | Features | Stories |  Tasks  |
| :--- | :--------------------------------------------- | :------: | :-----: | :-----: |
| 1    | Platform Foundation, Master Data & API Gateway |    5     |   12    |   36    |
| 2    | Asset Registry & Tethered Scanning             |    5     |   15    |   45    |
| 3    | IT Operations & Hardware Maintenance           |    4     |   12    |   35    |
| 4    | Compliance-Driven Disposals                    |    3     |    6    |   18    |
| 5    | Financial Intelligence & Automated Alerts      |    3     |    9    |   29    |
|      | **TOTAL**                                      |  **20**  | **54**  | **163** |

---

## Epic 1 — Platform Foundation, Master Data & API Gateway

> **Source:** [01-Core-Infrastructure-&-API.md](./user-story-specs/01-Core-Infrastructure-&-API.md)

### Feature 1.1: Enterprise Authentication & Access Control

#### US-1.1.1 — SSO & RBAC Enforcement

> _As a Corporate User, I want to log in using my Microsoft Azure AD credentials, So that my access is secured by corporate MFA and I don't need a separate password._

| Task ID      | Description                                                                                  |
| :----------- | :------------------------------------------------------------------------------------------- |
| TSK-1.1.1.01 | Configure Azure AD App Registration (Client ID / Secret / Tenant ID).                        |
| TSK-1.1.1.02 | Implement OAuth 2.0 / OIDC Authorization Code Flow.                                          |
| TSK-1.1.1.03 | Write RBAC backend middleware to protect API routes.                                         |
| TSK-1.1.1.04 | Implement Azure AD Group-to-Role mapping logic to auto-assign baseline permissions on login. |

#### US-1.1.2 — Role Mapping UI

> _As a Global Admin, I want to use a split-view interface to map active directory users to specific system roles, So that I can safely elevate permissions for IT and Finance staff._

| Task ID      | Description                                                                    |
| :----------- | :----------------------------------------------------------------------------- |
| TSK-1.1.2.01 | Build Master-Detail split-view UI component in React.                          |
| TSK-1.1.2.02 | Implement User Directory Search API endpoint with "Hide already mapped" logic. |
| TSK-1.1.2.03 | Create Database mapping table (`UserRoles`).                                   |

---

### Feature 1.2: Dynamic Schema & Asset Categories

#### US-1.2.1 — Category Creation & Auto-Prefix

> _As a Global Admin, I want to create new hardware categories with an auto-generated Prefix Code, So that future assets registered under this category have standardized IDs (e.g., AST-LAP-001)._

| Task ID      | Description                                                             |
| :----------- | :---------------------------------------------------------------------- |
| TSK-1.2.1.01 | Build the "Add Category" slide-out panel (Sheet component).             |
| TSK-1.2.1.02 | Write JavaScript auto-prefix generation logic (1-word vs 2-word rules). |
| TSK-1.2.1.03 | Implement backend lock to prevent Prefix updates via `PUT` requests.    |

#### US-1.2.2 — Custom Field Builder

> _As a Global Admin, I want to define specific custom attributes (Text, Number, Dropdown) for a category, So that the Asset Registration form dynamically requests the exact right data for that specific hardware._

| Task ID      | Description                                                            |
| :----------- | :--------------------------------------------------------------------- |
| TSK-1.2.2.01 | Design the dynamic field builder UI (add/remove rows, type selection). |
| TSK-1.2.2.02 | Implement JSON/EAV schema storage in the database.                     |
| TSK-1.2.2.03 | Write API to fetch category schema payload for frontend rendering.     |

---

### Feature 1.3: Organizational Master Data Management

#### US-1.3.1 — Location & Department CRUD

> _As a Global Admin, I want to manage a directory of company locations, departments, vendors, brands, and models, So that I can accurately map where an asset physically resides, who owns it, and standardize manufacturer information._

| Task ID      | Description                                                                          |
| :----------- | :----------------------------------------------------------------------------------- |
| TSK-1.3.1.01 | Build standard Data Tables for Locations, Departments, Vendors, Brands, and Models.  |
| TSK-1.3.1.02 | Create simple CRUD Modal forms for each entity.                                      |
| TSK-1.3.1.03 | Implement Brand-Model parent-child relationship (Models filtered by selected Brand). |

#### US-1.3.2 — Relational Deletion Safeguards

> _As a Global Admin, I want the system to prevent me from deleting master data that is currently in use, So that I do not accidentally orphan active assets in the database._

| Task ID      | Description                                                                       |
| :----------- | :-------------------------------------------------------------------------------- |
| TSK-1.3.2.01 | Write backend dependency check queries before executing `DELETE`.                 |
| TSK-1.3.2.02 | Implement frontend UI disabled-states based on "Active Count" relational queries. |

---

### Feature 1.4: Immutable System Audit Log

#### US-1.4.1 — Automated Event Tracking & IP Capture

> _As a Security Auditor, I want the system backend to automatically capture the user, IP address, and payload data of every state change, So that no malicious action goes unrecorded, even if initiated via API._

| Task ID      | Description                                                                                                 |
| :----------- | :---------------------------------------------------------------------------------------------------------- |
| TSK-1.4.1.01 | Create append-only `AuditLogs` database table.                                                              |
| TSK-1.4.1.02 | Write backend middleware interceptor to capture `X-Forwarded-For` IP addresses.                             |
| TSK-1.4.1.03 | Revoke `UPDATE` and `DELETE` database privileges on the Audit table.                                        |
| TSK-1.4.1.04 | Implement backend utility to compute Before/After object states and serialize them into JSON diff payloads. |

#### US-1.4.2 — Audit Log Viewing and Export

> _As a Security Auditor, I want to view, filter, and export the system audit ledger, So that I can conduct forensic investigations into hardware discrepancies._

| Task ID      | Description                                                            |
| :----------- | :--------------------------------------------------------------------- |
| TSK-1.4.2.01 | Build the High-Density Audit UI table with complex Date/Actor filters. |
| TSK-1.4.2.02 | Create visual badges for Action Types (e.g., CREATE, UPDATE, DISPOSE). |
| TSK-1.4.2.03 | Implement "Export Log to CSV" logic.                                   |

---

### Feature 1.5: Open API & Integration Gateway

#### US-1.5.1 — API Key Generation

> _As a Global Admin, I want to generate and revoke secure API keys from the Settings dashboard, So that I can grant external systems programmatic access without sharing user credentials._

| Task ID      | Description                                                                       |
| :----------- | :-------------------------------------------------------------------------------- |
| TSK-1.5.1.01 | Build API Key management UI in Settings.                                          |
| TSK-1.5.1.02 | Implement backend key generation and hashing logic (similar to password storage). |

#### US-1.5.2 — External Data Consumption

> _As a Third-Party System Developer, I want to securely query a REST API for asset assignments, So that our HR system knows if a terminating employee still possesses company hardware._

| Task ID      | Description                                                                         |
| :----------- | :---------------------------------------------------------------------------------- |
| TSK-1.5.2.01 | Implement Token Authentication & Rate Limiting middleware for `/api/v1/external/*`. |
| TSK-1.5.2.02 | Create standard Read-Only endpoints for Assets and Assignments.                     |
| TSK-1.5.2.03 | Write Swagger/OpenAPI documentation for available endpoints.                        |

#### US-1.5.3 — Inbound API Action Triggers

> _As a Third-Party System Developer, I want to trigger specific operational workflows (like assigning a laptop to a new hire) via the REST API, So that our HR system can automate IT onboarding without manual IT admin intervention._

| Task ID      | Description                                                                                     |
| :----------- | :---------------------------------------------------------------------------------------------- |
| TSK-1.5.3.01 | Create `POST /api/v1/external/assets/assign` endpoint with transactional database safety.       |
| TSK-1.5.3.02 | Implement backend logic to auto-select available inventory based on category requests.          |
| TSK-1.5.3.03 | Ensure API-triggered actions are logged in the Audit Log, citing the API Key Name as the Actor. |

#### US-1.5.4 — Outbound Webhooks Configuration

> _As a Global Admin, I want to register external webhook URLs for specific system events, So that other corporate systems receive real-time push updates when asset statuses change._

| Task ID      | Description                                                                                                  |
| :----------- | :----------------------------------------------------------------------------------------------------------- |
| TSK-1.5.4.01 | Build a Webhooks configuration UI in the Integrations Settings tab (Event dropdown, Target URL input).       |
| TSK-1.5.4.02 | Create a `WebhookSubscriptions` database table to store event mappings.                                      |
| TSK-1.5.4.03 | Write an asynchronous backend service to dispatch HTTP POST payloads with retry logic for failed deliveries. |

---

## Epic 2 — Asset Registry & Tethered Scanning

> **Source:** [02-asset-registry-scanning.md](./user-story-specs/02-asset-registry-scanning.md)

### Feature 2.1: Dynamic Asset Registration

#### US-2.1.1 — Standard Asset Generation

> _As a Global Admin, I want to register a new asset using a standardized web form, So that the system automatically verifies its uniqueness and assigns it a permanent, non-editable Asset ID._

| Task ID      | Description                                                                                     |
| :----------- | :---------------------------------------------------------------------------------------------- |
| TSK-2.1.1.01 | Build the base React registration form for standard fields (Name, Location, Vendor).            |
| TSK-2.1.1.02 | Implement backend auto-increment logic for Asset ID generation linked to Epic 1's Prefix codes. |
| TSK-2.1.1.03 | Write database validation rules to enforce unique Serial Numbers per Manufacturer.              |

#### US-2.1.2 — Dynamic Schema Form Rendering

> _As a Global Admin, I want the registration form to dynamically render custom inputs based on the selected category, So that I only see relevant technical specification fields._

| Task ID      | Description                                                                        |
| :----------- | :--------------------------------------------------------------------------------- |
| TSK-2.1.2.01 | Implement frontend logic to fetch category schema via API `onChange`.              |
| TSK-2.1.2.02 | Build dynamic form component renderer supporting Text, Number, and Dropdown types. |
| TSK-2.1.2.03 | Write backend logic to save dynamic form values into the EAV/JSONB payload column. |

#### US-2.1.3 — Financial Proof & Invoice Upload

> _As a Global Admin, I want to attach digital copies of purchase invoices and enter the full initial cost breakdown during registration, So that the organization has verifiable proof of value to feed into the Depreciation engine._

| Task ID      | Description                                                                            |
| :----------- | :------------------------------------------------------------------------------------- |
| TSK-2.1.3.01 | Implement secure Drag & Drop file upload component on the frontend.                    |
| TSK-2.1.3.02 | Integrate cloud storage bucket API for storing and retrieving PDF invoices.            |
| TSK-2.1.3.03 | Add encrypted `PurchaseCost` column to the database to protect financial data at rest. |
| TSK-2.1.3.04 | Build separate Base Price, Tax, and Shipping input fields with auto-calculated Total.  |
| TSK-2.1.3.05 | Implement currency selector dropdown supporting NOK, USD, and LKR.                     |
| TSK-2.1.3.06 | Store original currency code alongside all financial values in the database.           |

#### US-2.1.4 — Consumable Quantity Tracking

> _As a Global Admin, I want to maintain a stock count for low-value items without generating individual Asset IDs, So that I can efficiently manage high-volume inventory levels without database bloat._

| Task ID      | Description                                                                           |
| :----------- | :------------------------------------------------------------------------------------ |
| TSK-2.1.4.01 | Write backend logic flag to bypass ID/QR generation if category type is `Consumable`. |
| TSK-2.1.4.02 | Build simple `+` and `−` quantity adjustment UI for consumable records.               |

#### US-2.1.5 — Bulk CSV/Excel Import

> _As a Global Admin, I want to upload a CSV or Excel file containing hundreds of asset details, So that I can mass-populate the registry during legacy system migration or bulk batch purchases._

| Task ID      | Description                                                                                      |
| :----------- | :----------------------------------------------------------------------------------------------- |
| TSK-2.1.5.01 | Build CSV/Excel parser and column-mapping UI in React.                                           |
| TSK-2.1.5.02 | Implement "All-or-Nothing" bypass logic (Partial Success handling) in the backend import script. |
| TSK-2.1.5.03 | Write logic to auto-generate Asset IDs and QR URLs for every successfully imported row.          |
| TSK-2.1.5.04 | Add Excel (.xlsx) file parsing support using a backend library (e.g., `exceljs` or `SheetJS`).   |

---

### Feature 2.2: Main Asset Registry Grid & Details

#### US-2.2.1 — High-Density Data Grid

> _As a Global Admin, I want to view my inventory in a high-density table with complex filtering and column toggles, So that I can rapidly find specific assets or execute bulk operations._

| Task ID      | Description                                                                                            |
| :----------- | :----------------------------------------------------------------------------------------------------- |
| TSK-2.2.1.01 | Implement ShadCN Data Table with pagination, sorting, and global search.                               |
| TSK-2.2.1.02 | Build multi-select column visibility dropdown.                                                         |
| TSK-2.2.1.03 | Implement bulk-select checkboxes enabling batch actions (like Epic 4 Bulk Disposals).                  |
| TSK-2.2.1.04 | Implement a "Bulk Edit Modal" for updating Location or Status of 50+ selected rows in one transaction. |

#### US-2.2.2 — Asset Details Slide-Out Panel

> _As an IT Support Staff member, I want to click on a grid row to open a Right-Side Slide-Out Panel, So that I can see an asset's complete vitals, assignment history, and take quick actions without losing my place in the grid._

| Task ID      | Description                                                                             |
| :----------- | :-------------------------------------------------------------------------------------- |
| TSK-2.2.2.01 | Build the Slide-Out Sheet React component.                                              |
| TSK-2.2.2.02 | Create layout sections: Header (Status Badges), Vitals, Assignments, and Quick Actions. |
| TSK-2.2.2.03 | Write `GET /api/v1/assets/{id}` endpoint to aggregate relational data for the panel.    |

---

### Feature 2.3: QR Code & Print Engine

#### US-2.3.1 — QR Code Routing Generator

> _As a Global Admin, I want the system to automatically generate a unique URL and 2D QR code for every registered asset, So that scanning the physical sticker routes the scanner directly to the asset's digital profile._

| Task ID      | Description                                                                       |
| :----------- | :-------------------------------------------------------------------------------- |
| TSK-2.3.1.01 | Implement QR code generation library on the backend (e.g., `qrcode` npm package). |
| TSK-2.3.1.02 | Ensure the generated URL points to the secure Mobile Lookup PWA route.            |

#### US-2.3.2 — Print Layout Engine

> _As an IT Operations Admin, I want to select multiple assets and generate a formatted print file, So that I can print 50+ QR stickers on standard A4 sticker paper or send single tags to a thermal printer._

| Task ID      | Description                                                                           |
| :----------- | :------------------------------------------------------------------------------------ |
| TSK-2.3.2.01 | Integrate a PDF generation library (like `pdfmake` or `puppeteer`).                   |
| TSK-2.3.2.02 | Build exact CSS/PDF millimeter dimensions for A4 Grid and Single Thermal layouts.     |
| TSK-2.3.2.03 | Add TIQRI Logo and Asset ID text dynamically beneath the QR code in the print layout. |

---

### Feature 2.4: PWA Mobile Scanner & Standalone Lookup

#### US-2.4.1 — HTML5 Camera Scanner Interface

> _As an IT Admin in the server room, I want to access a mobile scanner interface via my phone's web browser, So that I can scan QR codes without downloading a native app._

| Task ID      | Description                                                                                          |
| :----------- | :--------------------------------------------------------------------------------------------------- |
| TSK-2.4.1.01 | Implement HTML5 `getUserMedia` API and a JavaScript barcode scanning library (e.g., `html5-qrcode`). |
| TSK-2.4.1.02 | Design mobile-first CSS for the camera overlay, reticle, and permission prompts.                     |

#### US-2.4.2 — Standalone Mobile Lookup

> _As an IT Admin, I want scanning a TIQRI QR sticker to instantly trigger a bottom-sheet pop-up, So that I can read the asset's vitals on my mobile device._

| Task ID      | Description                                                               |
| :----------- | :------------------------------------------------------------------------ |
| TSK-2.4.2.01 | Build the mobile Bottom-Sheet React component.                            |
| TSK-2.4.2.02 | Implement haptic feedback API (`navigator.vibrate`) upon successful scan. |
| TSK-2.4.2.03 | Route the decoded URL string to fetch the specific asset payload.         |

#### US-2.4.3 — Mobile "Empty State" Fallbacks

> _As a mobile user, I want the system to gracefully block me from accessing complex desktop screens, So that I don't struggle with broken, unreadable data grids on a small screen._

| Task ID      | Description                                                                     |
| :----------- | :------------------------------------------------------------------------------ |
| TSK-2.4.3.01 | Write CSS Media Queries or React viewport hooks to detect mobile screen widths. |
| TSK-2.4.3.02 | Design and implement the fallback Illustration Card components.                 |

---

### Feature 2.5: Tethered Companion Scanning (WebSockets)

#### US-2.5.1 — Mobile-Desktop Auto-Link

> _As an IT Admin, I want my mobile phone to automatically link to my current desktop browser session when both are signed in under my Azure AD account, So that the two devices can communicate in real-time without manual pairing._

| Task ID      | Description                                                                            |
| :----------- | :------------------------------------------------------------------------------------- |
| TSK-2.5.1.01 | Set up a WebSocket server (e.g., `Socket.io` or native WS).                            |
| TSK-2.5.1.02 | Implement `UserSessionMap` keyed by `user_id` to track desktop and mobile connections. |
| TSK-2.5.1.03 | Build the desktop `ScannerToggle` component (replaces the former pairing QR modal).    |

#### US-2.5.2 — Real-Time Barcode Injection

> _As an IT Admin entering new hardware, I want to scan a 1D manufacturer barcode on a laptop box using my phone, So that the serial number instantly appears in the text field on my desktop monitor without manual typing._

| Task ID      | Description                                                                                               |
| :----------- | :-------------------------------------------------------------------------------------------------------- |
| TSK-2.5.2.01 | Configure the mobile scanner library to recognize 1D formats (Code 128, UPC, EAN).                        |
| TSK-2.5.2.02 | Write WebSocket emitter logic on the mobile PWA client.                                                   |
| TSK-2.5.2.03 | Write WebSocket listener logic on the desktop React client to inject payloads into active form states.    |
| TSK-2.5.2.04 | Implement a temporary memory buffer in React global state for incoming payloads when no input is focused. |
| TSK-2.5.2.05 | Ensure the WebSocket emitter and listener logic satisfies the NFR for sub-500 ms latency.                 |

---

## Epic 3 — IT Operations & Hardware Maintenance

> **Source:** [03-Operations-&-Maintenance.md](./user-story-specs/03-Operations-&-Maintenance.md)

### Feature 3.1: Employee Support Portal & Digital Acceptance

#### US-3.1.1 — View "My Assets"

> _As a Standard Employee, I want to see a list of "My Assets" when I log in, So that I can verify the equipment assigned to me and check return dates._

| Task ID      | Description                                                                                |
| :----------- | :----------------------------------------------------------------------------------------- |
| TSK-3.1.1.01 | Build a simplified, mobile-responsive "My Assets" UI grid.                                 |
| TSK-3.1.1.02 | Implement backend endpoint filtering active assignments by the logged-in user's SSO token. |

#### US-3.1.2 — Digital Acceptance of Responsibility

> _As a Global Admin, I want the system to automatically notify the user via Email and Microsoft Teams when I assign an asset, So that they can click a link to confirm they have received it in good working order._

| Task ID      | Description                                                                             |
| :----------- | :-------------------------------------------------------------------------------------- |
| TSK-3.1.2.01 | Implement email generation template with a unique confirmation token link.              |
| TSK-3.1.2.02 | Implement Microsoft Teams adaptive card notification with a confirmation action button. |
| TSK-3.1.2.03 | Create a public-facing (but token-secured) confirmation landing page.                   |
| TSK-3.1.2.04 | Write backend logic to update assignment status upon confirmation.                      |

#### US-3.1.3 — Asset Chain of Custody / History Tab

> _As an Auditor or Global Admin, I want to view the complete chronological history of a specific asset, So that I can see every assignment, return, and status change since it was purchased._

| Task ID      | Description                                                                                     |
| :----------- | :---------------------------------------------------------------------------------------------- |
| TSK-3.1.3.01 | Build a vertical timeline UI component for the Asset Details Slide-Out Panel.                   |
| TSK-3.1.3.02 | Write backend query to fetch and format asset-specific events from the global System Audit Log. |
| TSK-3.1.3.03 | Add a "Download History as CSV" button specifically for this asset's timeline.                  |

#### US-3.1.4 — Manual Lifecycle Status Management

> _As a Global Admin, I want to manually update the status of an asset to exception states (e.g., "Lost", "Stolen", "Found"), So that the inventory reflects reality when an asset goes missing outside of standard workflows._

| Task ID      | Description                                                                                              |
| :----------- | :------------------------------------------------------------------------------------------------------- |
| TSK-3.1.4.01 | Build a "Change Status" quick-action modal requiring a mandatory justification note.                     |
| TSK-3.1.4.02 | Implement backend state-machine rules preventing invalid transitions (e.g., Lost → Assigned).            |
| TSK-3.1.4.03 | Build a "Custom Status Configuration" UI in Settings for admins to create additional lifecycle statuses. |

---

### Feature 3.2: Assignments & Returns Workflow

#### US-3.2.1 — Asset Check-Out / Assignment

> _As a Global Admin, I want to assign an available asset to a user or a specific location, So that I know exactly who is responsible for the item._

| Task ID      | Description                                                                            |
| :----------- | :------------------------------------------------------------------------------------- |
| TSK-3.2.1.01 | Build "Assign Asset" UI modal with searchable User/Location dropdowns.                 |
| TSK-3.2.1.02 | Implement backend validation to ensure only "Available" assets can be assigned.        |
| TSK-3.2.1.03 | Add an optional "Expected Return Date" calendar picker for tracking temporary loaners. |

#### US-3.2.2 — Request Asset Return

> _As a Global Admin, I want to notify a user to return an assigned asset, So that I can begin the offboarding or reassignment process._

| Task ID      | Description                                                                                       |
| :----------- | :------------------------------------------------------------------------------------------------ |
| TSK-3.2.2.01 | Add the "Request Return" button to the Asset Details side panel for assigned assets.              |
| TSK-3.2.2.02 | Implement the "Requested" status badge/label within the Assigned Assets table rows.               |
| TSK-3.2.2.03 | Create a backend endpoint to trigger a return notification (Email/System Alert) to the custodian. |
| TSK-3.2.2.04 | Update the asset status logic to transition to "Requested" upon button click.                     |

#### US-3.2.3 — Asset Check-In & Condition Review

> _As a Global Admin, I want to process the physical return of an asset and assess its condition, So that its status is accurately updated in the inventory for future use or disposal._

| Task ID      | Description                                                                                                                  |
| :----------- | :--------------------------------------------------------------------------------------------------------------------------- |
| TSK-3.2.3.01 | Implement the "Received" button to transfer an asset from Assigned to Returned list.                                         |
| TSK-3.2.3.02 | Build the "Return-Dialog" modal with mandatory condition radio buttons (Good / Minor Issues / Needs Repair / Beyond Repair). |
| TSK-3.2.3.03 | Add a "Condition Notes" text area within the modal for detailed admin feedback.                                              |
| TSK-3.2.3.04 | Write conditional backend logic: Good → Available; Minor/Repair → In Repair; Beyond Repair → Disposed.                       |
| TSK-3.2.3.05 | Write logic to clear the custodian field and record the return event into the historical ledger.                             |

#### US-3.2.4 — Bulk Location Transfer

> _As a Global Admin, I want to bulk-update the location of multiple assets in a single action, So that I can efficiently reflect large physical moves without editing each asset individually._

| Task ID      | Description                                                                                    |
| :----------- | :--------------------------------------------------------------------------------------------- |
| TSK-3.2.4.01 | Build the "Bulk Edit" modal accessible from the registry grid's bulk-action toolbar.           |
| TSK-3.2.4.02 | Implement backend batch-update endpoint processing multiple asset IDs in a single transaction. |
| TSK-3.2.4.03 | Write Audit Log entries for each individual asset change within the batch.                     |

---

### Feature 3.3: Maintenance Ledger & Issue Triage

#### US-3.3.1 — Tabbed Maintenance Ledger

> _As an IT Operations Admin, I want to view a dedicated ledger with tabs for "Pending Review", "Active Repairs", and "Repair History", So that I can easily track the current status of all broken or out-for-repair hardware._

| Task ID      | Description                                                                                  |
| :----------- | :------------------------------------------------------------------------------------------- |
| TSK-3.3.1.01 | Build the Tabbed Data Table React component.                                                 |
| TSK-3.3.1.02 | Implement API routes to fetch maintenance tickets filtered by their current lifecycle state. |

#### US-3.3.2 — Triage Review Sheet

> _As an IT Operations Admin, I want to click a pending triage ticket to open a Right-Side Review Panel, So that I can assess the user's reported damage alongside the asset's current book value and warranty status._

| Task ID      | Description                                                                      |
| :----------- | :------------------------------------------------------------------------------- |
| TSK-3.3.2.01 | Build the Triage Review Slide-Out Sheet component.                               |
| TSK-3.3.2.02 | Aggregate financial and warranty data into the API response for the triage view. |

---

### Feature 3.4: Vendor Repair Workflow

#### US-3.4.1 — Initiate Repair Modal

> _As an IT Operations Admin, I want to log a "Maintenance Event" and dispatch an item to a vendor, So that I have a history of all repairs and can track expected returns._

| Task ID      | Description                                                                                    |
| :----------- | :--------------------------------------------------------------------------------------------- |
| TSK-3.4.1.01 | Build the "Initiate Repair" modal form.                                                        |
| TSK-3.4.1.02 | Write backend state-machine logic to update status to `In Repair` and un-assign from employee. |

#### US-3.4.2 — Close Repair Modal & TCO Update

> _As a Global Admin, I want to close a repair ticket and log the actual final cost, So that the Asset's "Total Maintenance Cost" updates and it is routed to its next status._

| Task ID      | Description                                                                                        |
| :----------- | :------------------------------------------------------------------------------------------------- |
| TSK-3.4.2.01 | Build the "Close Repair" modal form requiring Final Cost input.                                    |
| TSK-3.4.2.02 | Implement backend aggregation logic to append the new cost to the asset's Total Cost of Ownership. |

---

## Epic 4 — Compliance-Driven Disposals

> **Source:** [04-Compliance-Driven Disposals.md](./user-story-specs/04-Compliance-Driven%20Disposals.md)

### Feature 4.1: Disposal Requests & Administrative Review

#### US-4.1.1 — Initiate Disposal & The Ledger Queue

> _As an IT Ops Admin, I want to request disposal for an asset and select a reason, So that it is removed from active circulation and routed to the Pending Disposal queue for executive review._

| Task ID      | Description                                                                                        |
| :----------- | :------------------------------------------------------------------------------------------------- |
| TSK-4.1.1.01 | Build the Disposals Ledger UI (Tabbed data table: "Pending Approval" and "Disposal History").      |
| TSK-4.1.1.02 | Implement backend logic to change status to `Pending Disposal` and lock the asset from assignment. |
| TSK-4.1.1.03 | Build the read-only "Disposal History" tab with download links to E-Waste certificates.            |

#### US-4.1.2 — Disposal Request Review Sheet

> _As a Global Admin or Finance Manager, I want to click a pending disposal request to view a slide-out panel detailing its financial and technical history, So that I have the necessary context to authorize the write-off._

| Task ID      | Description                                                                                    |
| :----------- | :--------------------------------------------------------------------------------------------- |
| TSK-4.1.2.01 | Build the Disposal Request Review Sheet component.                                             |
| TSK-4.1.2.02 | Write API aggregator to pull Epic 5 financial data (Current Book Value) into the review panel. |

---

### Feature 4.2: Secure Disposal Execution & Compliance

#### US-4.2.1 — The Hard Stop Compliance Modal & Upload

> _As a Global Admin, I want to upload a Certificate of Destruction and confirm physical security checks, So that the organization has legal proof of the disposal for environmental and tax audits._

| Task ID      | Description                                                                                             |
| :----------- | :------------------------------------------------------------------------------------------------------ |
| TSK-4.2.1.01 | Build the Compliance Execution Modal with exact text-match validation logic.                            |
| TSK-4.2.1.02 | Integrate a Drag-and-Drop file upload UI.                                                               |
| TSK-4.2.1.03 | Connect the frontend upload zone to the backend cloud storage bucket (AWS S3 / Azure Blob).             |
| TSK-4.2.1.04 | Add a mandatory "Disposal Method" dropdown and bind it to the frontend form state.                      |
| TSK-4.2.1.05 | Write backend validation to reject the final disposal POST if Method, Asset ID, or checkbox is missing. |

#### US-4.2.2 — Reject Disposal Workflow

> _As a Global Admin, I want to reject a disposal request, provide a mandatory reason, and re-route the asset, So that assets still under warranty or holding value are put back into circulation._

| Task ID      | Description                                                                               |
| :----------- | :---------------------------------------------------------------------------------------- |
| TSK-4.2.2.01 | Build the Rejection Modal component.                                                      |
| TSK-4.2.2.02 | Write backend logic to revert the `Pending Disposal` status to the newly selected status. |
| TSK-4.2.2.03 | Hook into Epic 5's notification engine to alert the original IT Ops admin.                |

---

### Feature 4.3: Bulk Operations & Architectural Safeguards

#### US-4.3.1 — Bulk Disposal Processing

> _As a Global Admin, I want to request disposal for a batch of assets and approve them using a single shared receipt, So that I don't have to upload the same E-Waste PDF 50 times._

| Task ID      | Description                                                                                    |
| :----------- | :--------------------------------------------------------------------------------------------- |
| TSK-4.3.1.01 | Adapt the Compliance Modal to accept an array of selected Asset IDs.                           |
| TSK-4.3.1.02 | Write backend batch processing logic to update multiple rows in a single database transaction. |
| TSK-4.3.1.03 | Optimize the database to store a single file URL reference across multiple asset records.      |

#### US-4.3.2 — Soft Delete Architecture & Finality

> _As a Security Auditor, I want disposed assets to be retained in the database for 7 years, So that they are hidden from the active registry but available for historical tax audits._

| Task ID      | Description                                                                                          |
| :----------- | :--------------------------------------------------------------------------------------------------- |
| TSK-4.3.2.01 | Implement `IsArchived` / `Status = Disposed` global filters across all standard `GET` API endpoints. |
| TSK-4.3.2.02 | Write backend permission logic to block `PUT`/`PATCH` requests for any `Disposed` asset.             |

---

## Epic 5 — Financial Intelligence & Automated Alerts

> **Source:** [05-finance-notification-automation.md](./user-story-specs/05-finance-notification-automation.md)

### Feature 5.1: Global KPI Dashboard & Standard Reporting

#### US-5.1.1 — Admin Dashboard

> _As a Global Admin, I want to see a dashboard upon login with key metrics and pending actions, So that I know exactly what needs my attention today._

| Task ID      | Description                                                                               |
| :----------- | :---------------------------------------------------------------------------------------- |
| TSK-5.1.1.01 | Build responsive CSS Grid layout for KPI metric cards.                                    |
| TSK-5.1.1.02 | Write optimized database aggregation queries to fetch live counts (< 2 s load time).      |
| TSK-5.1.1.03 | Implement click-through deep-linking from KPI widgets to their respective filtered grids. |

#### US-5.1.2 — Standard Reporting

> _As a Global Admin / Auditor, I want to generate and download standard inventory reports, So that I can share this data with stakeholders who don't have system access._

| Task ID      | Description                                                                       |
| :----------- | :-------------------------------------------------------------------------------- |
| TSK-5.1.2.01 | Build Report configuration UI (Date Range and Location parameters).               |
| TSK-5.1.2.02 | Implement robust CSV, Excel (.xlsx), and PDF generation libraries on the backend. |
| TSK-5.1.2.03 | Build an HTML report preview renderer for in-browser viewing before export.       |

---

### Feature 5.2: Dedicated Financials Module & Cost Analysis

#### US-5.2.1 — Depreciation & Write-Offs Ledger

> _As a Finance Director, I want to access a dedicated, RBAC-secured Financials module with a Depreciation Ledger, So that I can view the real-time "Current Book Value" for corporate tax reporting._

| Task ID      | Description                                                                                                    |
| :----------- | :------------------------------------------------------------------------------------------------------------- |
| TSK-5.2.1.01 | Update the UI Sidebar to include a "Financials" accordion menu restricted to Finance/Global Admin.             |
| TSK-5.2.1.02 | Build the Straight-Line Depreciation Ledger data grid.                                                         |
| TSK-5.2.1.03 | Write backend mathematical aggregation logic to calculate depreciation based on `PurchaseDate` and `BaseCost`. |

#### US-5.2.2 — Total Cost of Ownership Engine

> _As a Global Admin, I want to track the "Total Cost of Ownership" (TCO) including repair costs, So that I can monitor reliability and stop buying models that fail frequently._

| Task ID      | Description                                                                                           |
| :----------- | :---------------------------------------------------------------------------------------------------- |
| TSK-5.2.2.01 | Create the TCO Ledger UI tab.                                                                         |
| TSK-5.2.2.02 | Write SQL Views or backend aggregators to sum `BaseCost` with all linked `MaintenanceLogs.FinalCost`. |

#### US-5.2.3 — Write-Offs & Salvage Ledger

> _As a Finance Director, I want to view a financial ledger of the permanent disposal history alongside any captured salvage values, So that I can accurately report write-offs and recouped cash for corporate tax purposes._

| Task ID      | Description                                                                                                   |
| :----------- | :------------------------------------------------------------------------------------------------------------ |
| TSK-5.2.3.01 | Create the "Write-Offs & Salvage Ledger" UI tab within the secured Financials sidebar module.                 |
| TSK-5.2.3.02 | Add an optional `SalvageValue` numeric input to the Epic 4 Compliance Execution Modal.                        |
| TSK-5.2.3.03 | Write backend query to fetch `Disposed` assets joining `PurchaseCost`, depreciated value, and `SalvageValue`. |

---

### Feature 5.3: Automated Alerts & Notification Center

#### US-5.3.1 — CRON Engine & Alert Configuration

> _As a Global Admin, I want to receive a weekly digest of upcoming expiries (Warranties, Licenses), So that I can plan budget and replacements proactively._

| Task ID      | Description                                                                                                                    |
| :----------- | :----------------------------------------------------------------------------------------------------------------------------- |
| TSK-5.3.1.01 | Build the Alert Configuration Rules UI with toggle switches and threshold dropdowns.                                           |
| TSK-5.3.1.02 | Configure a background Scheduler service (e.g., Azure Functions / Hangfire) to run nightly queries.                            |
| TSK-5.3.1.03 | Write email aggregation logic to send 1 summary digest email instead of 100 separate emails.                                   |
| TSK-5.3.1.04 | Implement Microsoft Teams channel/chat notification delivery alongside email alerts.                                           |
| TSK-5.3.1.05 | Write CRON job query to scan for upcoming Software License expirations.                                                        |
| TSK-5.3.1.06 | Write CRON job query to flag active maintenance tickets where `Status == "In Repair"` AND `ExpectedReturnDate < CURRENT_DATE`. |
| TSK-5.3.1.07 | Implement backend routing to send overdue repair alerts to the `CreatedBy` user of that repair ticket.                         |
| TSK-5.3.1.08 | Implement exponential backoff retry logic for the SMTP/Email service for delivery reliability.                                 |

#### US-5.3.2 — Notification Center / Inbox

> _As a User, I want a dedicated Notification Center (Bell Icon) within the application, So that I can quickly view unread system alerts and navigate directly to the affected items._

| Task ID      | Description                                                                                    |
| :----------- | :--------------------------------------------------------------------------------------------- |
| TSK-5.3.2.01 | Build the Notification Center Dropdown UI component with a "Mark all as read" action.          |
| TSK-5.3.2.02 | Create an `AppNotifications` database table to track unread/read states per user.              |
| TSK-5.3.2.03 | Implement deep-linking URL routing from the notification payload to the specific UI component. |

#### US-5.3.3 — Vendor API Sync _(Optional / Phase 2)_

> _As a Global Admin, I want the system to periodically query external Vendor APIs (e.g., Dell, HP, Lenovo) using asset Serial Numbers, So that Warranty Expiry dates are automatically fetched and updated._

| Task ID      | Description                                                                                        |
| :----------- | :------------------------------------------------------------------------------------------------- |
| TSK-5.3.3.01 | Research and integrate available vendor warranty API endpoints (Dell TechDirect, HP ISEE, Lenovo). |
| TSK-5.3.3.02 | Build a configurable Vendor API Sync settings page with enable/disable toggles per vendor.         |
| TSK-5.3.3.03 | Implement a scheduled background job to batch-query vendor APIs using stored Serial Numbers.       |
| TSK-5.3.3.04 | Write resilient error handling with exponential backoff for failed vendor API calls.               |

---

[< Back to Requirements](./README.md)
