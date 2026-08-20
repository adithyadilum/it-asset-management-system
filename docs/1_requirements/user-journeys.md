# User Journeys

This document outlines the key end-to-end workflows for each persona using the IDAMS platform. Every journey maps steps to specific screens (wireframe references from the [Desktop Wireframes](../2_design/06_ui_ux_design/desktop-wireframes.md)), identifies cross-persona handoff points, and documents error / exception paths.

## Table of Contents

- [1. Personas](#1-personas)
  - [1.1 Global Administrator](#11-global-administrator)
  - [1.2 IT Operations Admin](#12-it-operations-admin)
  - [1.3 Finance Admin](#13-finance-admin)
  - [1.4 Standard Employee](#14-standard-employee)
  - [1.5 System Actors](#15-system-actors)
- [2. Journey Map](#2-journey-map)
  - [J1 — Authentication & Role-Based Routing](#j1--authentication--role-based-routing)
  - [J2 — Role Mapping](#j2--role-mapping)
  - [J3 — Master Data Management](#j3--master-data-management)
  - [J4 — Category & EAV Schema Builder](#j4--category--eav-schema-builder)
  - [J5 — Single Asset Registration](#j5--single-asset-registration)
  - [J6 — Bulk Import (CSV / Excel)](#j6--bulk-import-csv--excel)
  - [J7 — Asset Assignment](#j7--asset-assignment)
  - [J8 — Return Request & Check-In](#j8--return-request--check-in)
  - [J9 — Tethered Companion Scanning](#j9--tethered-companion-scanning)
  - [J10 — Maintenance Triage & Repair](#j10--maintenance-triage--repair)
  - [J11 — Disposal Intake](#j11--disposal-intake)
  - [J12 — Disposal Approval (Hard-Stop Compliance)](#j12--disposal-approval-hard-stop-compliance)
  - [J13 — Disposal Rejection](#j13--disposal-rejection)
  - [J14 — Bulk Disposal](#j14--bulk-disposal)
  - [J15 — Financial Reporting & Dashboards](#j15--financial-reporting--dashboards)
  - [J16 — Alert Configuration](#j16--alert-configuration)
  - [J17 — Audit Log Review](#j17--audit-log-review)
  - [J18 — QR Code Print](#j18--qr-code-print)
  - [J19 — Employee "My Assets" Portal](#j19--employee-my-assets-portal)
  - [J20 — Digital Acceptance (Custody Confirmation)](#j20--digital-acceptance-custody-confirmation)
  - [J21 — Employee Issue Reporting](#j21--employee-issue-reporting)
  - [J22 — Nightly CRON Alert Engine](#j22--nightly-cron-alert-engine)
  - [J23 — Exception Status Handling (Lost / Missing)](#j23--exception-status-handling-lost--missing)
- [3. Cross-Persona Handoff Matrix](#3-cross-persona-handoff-matrix)
- [4. Error & Exception Path Catalogue](#4-error--exception-path-catalogue)

## 1. Personas

### 1.1 Global Administrator

| Attribute          | Detail                                                                                                                                                                                                                                                                        |
| :----------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Azure AD Group** | Mapped via Settings → User Roles & Access (REQ-FND-1.4); auto-assigned from AD Group attributes (REQ-FND-1.5).                                                                                                                                                                |
| **Description**    | Primary power users and custodians of the asset registry. Responsible for all administrative functions, system configuration, and compliance oversight.                                                                                                                       |
| **Frequency**      | Daily / Continuous.                                                                                                                                                                                                                                                           |
| **Permissions**    | Full CRUD on all modules. Register assets, override lifecycle statuses, manage master data & categories, view all financial data, configure alert thresholds, generate/revoke API keys, register webhooks, approve/reject disposals, assign roles, bulk import, bulk dispose. |
| **Key Needs**      | Efficiency via keyboard shortcuts (`Ctrl+K` search, `Ctrl+/` sidebar), detailed inline error messages, fast page loads (<2 s).                                                                                                                                                |

### 1.2 IT Operations Admin

| Attribute          | Detail                                                                                                                                                                                                       |
| :----------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Azure AD Group** | Auto-assigned via AD group; overridable by Global Admin.                                                                                                                                                     |
| **Description**    | Manages day-to-day asset lifecycle operations — assignments, returns, repairs, triage, and disposal intake.                                                                                                  |
| **Frequency**      | Daily.                                                                                                                                                                                                       |
| **Permissions**    | Assign assets, request returns, process check-ins, dispatch vendor repairs, close repairs, flag for disposal, flag as Missing/Lost. **Cannot** approve disposals, access Financials module, or manage roles. |
| **Key Needs**      | Fast triage flow, slide-out panels with financial context (warranty status, book value), overdue repair visibility.                                                                                          |

### 1.3 Finance Admin

| Attribute          | Detail                                                                                                                                                                                                                            |
| :----------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Azure AD Group** | Auto-assigned from "Finance Team" AD group → baseline "Finance Read-Only".                                                                                                                                                        |
| **Description**    | Reviews dashboards, reports, and cost analysis. Approves or rejects disposal requests with financial context.                                                                                                                     |
| **Frequency**      | Periodic (monthly audits, annual budgets) plus as-needed for disposal approvals.                                                                                                                                                  |
| **Permissions**    | Read-only for Dashboards, Reports, Depreciation Ledger, TCO Ledger, Write-Offs & Salvage (REQ-FIN-5.3). Can reject disposal or approve via Hard-Stop Compliance modal. **Cannot** register assets, assign, or manage master data. |
| **Key Needs**      | Accurate summarised data, clear visualisations, exportable formats (Excel / PDF / CSV).                                                                                                                                           |

### 1.4 Standard Employee

| Attribute          | Detail                                                                                                                                                                                                                               |
| :----------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Azure AD Group** | Default baseline role auto-assigned to all authenticated users.                                                                                                                                                                      |
| **Description**    | General staff (developers, HR, sales) who are assigned IT assets. Interact only with self-service features.                                                                                                                          |
| **Frequency**      | Infrequent (onboarding, asset return, incident reporting).                                                                                                                                                                           |
| **Permissions**    | Read-only "My Assets" portal (REQ-OPS-3.1). Confirm custody via Digital Acceptance link. Submit "Report Issue" damage tickets (REQ-OPS-3.15). **Cannot** edit asset details, access the registry grid, financials, or admin screens. |
| **Key Needs**      | Clarity on assigned equipment, mobile-friendly interface, zero-training required.                                                                                                                                                    |

### 1.5 System Actors

| Actor                         | Description                                                                                                                                                   |
| :---------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **CRON Alert Engine**         | Nightly scheduler (02:00 AM UTC) that scans for threshold breaches and dispatches alert digests via Email, Teams, and In-App.                                 |
| **External API Consumer**     | Third-party systems (e.g., HR, Finance) authenticated via hashed API keys. Rate-limited (100 req/min/key) read-only data fetches and webhook event reception. |
| **External Auditor / Vendor** | No direct system login. Compliance data delivered via exported reports and the immutable audit log CSV export.                                                |

---

## 2. Journey Map

### J1 — Authentication & Role-Based Routing

| Attribute        | Detail                                                |
| :--------------- | :---------------------------------------------------- |
| **Actors**       | All personas.                                         |
| **Trigger**      | User navigates to `assets.tiqri.com`.                 |
| **Precondition** | Active Azure AD (Entra ID) account with TIQRI tenant. |

**Steps:**

1. System redirects the browser to the Microsoft Azure AD login page (external — no IDAMS-managed screen).
2. User authenticates with TIQRI corporate credentials. MFA is handled entirely by Azure AD.
3. Azure AD returns a signed JWT containing user claims (name, email, department, group memberships).
4. IDAMS API parses the token, maps AD groups to baseline system roles (REQ-FND-1.5), and loads the appropriate landing view:
   - **Global Admin / IT Ops / Finance** → **Admin KPI Dashboard** (§5.1 wireframe).
   - **Standard Employee** → **Employee "My Assets" Portal** (§3.1 wireframe).
5. Session established; sidebar and header render role-appropriate navigation items.

**Error Paths:**

| Condition                 | Response                                               |
| :------------------------ | :----------------------------------------------------- |
| Invalid credentials       | Azure AD error page (outside IDAMS).                   |
| Disabled AD account       | JWT rejected → "Account disabled. Contact IT support." |
| Unauthorised route access | `403 Forbidden` + audit log entry (NFR-SEC-02).        |

---

### J2 — Role Mapping

| Attribute   | Detail                                             |
| :---------- | :------------------------------------------------- |
| **Actors**  | Global Admin.                                      |
| **Trigger** | Admin navigates to Settings → User Roles & Access. |
| **Screen**  | Role Mapping — Split-View UI (§1.1 wireframe).     |

**Steps:**

1. Left panel displays system roles: Global Admin, IT Operations, Finance Read-Only, Standard Employee.
2. Admin selects a role → right panel populates with a table of currently mapped users (Name, Email, Department).
3. Admin clicks **"Add User"** → searchable Combobox modal opens. "Hide already mapped" toggle filters users who already have a role assignment.
4. Admin searches for an employee, selects, clicks **"Confirm Mapping"**.
5. User appears instantly in the detail table with the new role.
6. Audit log entry created (`ROLE_CHANGE` action, before/after state).

**End State:** User has elevated / changed system role, effective immediately on their next page load.

---

### J3 — Master Data Management

| Attribute   | Detail                                              |
| :---------- | :-------------------------------------------------- |
| **Actors**  | Global Admin.                                       |
| **Trigger** | Admin navigates to Settings → Master Data.          |
| **Screen**  | Master Data — Table & CRUD Modals (§1.3 wireframe). |

**Steps:**

1. Horizontal tab bar: Categories, Locations, Departments, Vendors, Brands, Models. Admin selects a tab.
2. Independent sortable / filterable grid renders for the selected entity.
3. **Add:** Click "Add New" → centred Dialog with entity-specific form fields (e.g., Location: Building > Floor > Room hierarchy; Brand: parent dropdown → cascading Model).
4. **Edit:** Row action menu (⋯) → "Edit" → same Dialog pre-filled.
5. **Delete:** Row action menu → "Delete" → blocked if referential dependencies exist: _"Cannot delete: Category contains 142 active assets."_ Tooltip suggests archival instead.
6. **Archive:** Sets `IsActive = false` (REQ-FND-1.17) — entity hidden from active dropdowns but historical references preserved.
7. **Bulk Actions:** Select rows via checkboxes → toolbar: "Delete Selected", "Export".

**End State:** Master data entity created / updated / archived. All changes audit-logged.

**Error Paths:**

| Condition              | Response                                                   |
| :--------------------- | :--------------------------------------------------------- |
| Dependent assets exist | Delete blocked with count: _"Contains 142 active assets."_ |
| Duplicate name         | Inline validation error.                                   |

---

### J4 — Category & EAV Schema Builder

| Attribute   | Detail                                               |
| :---------- | :--------------------------------------------------- |
| **Actors**  | Global Admin.                                        |
| **Trigger** | Admin creates or edits an asset category.            |
| **Screen**  | Category Builder — Slide-Out Panel (§1.2 wireframe). |

**Steps:**

1. Right-side Sheet (`w-[480px]`) opens with "Add New Category" or "Edit Category" header.
2. **Basic Info:** Category Name input → system auto-generates a locked 3-letter Prefix Code (e.g., `LAP`). If collision → auto-appends numeric suffix (e.g., `LAP2`) per REQ-FND-1.15.
3. **Category Type:** Asset or Consumable selector.
4. **Custom Fields:** Scrollable list of EAV field definitions. Each row: Field Name, Type dropdown (Text / Number / Dropdown), Required toggle. Drag-and-drop re-ordering via `dnd-kit` (REQ-FND-1.16).
5. Click **"Add Field"** to append a new row.
6. **Save:** Validates all fields → commits schema. Prefix Code locked permanently once saved.

**End State:** Category with EAV schema available for asset registration and the dynamic form rendering pipeline.

---

### J5 — Single Asset Registration

| Attribute   | Detail                                                   |
| :---------- | :------------------------------------------------------- |
| **Actors**  | Global Admin, IT Operations Admin.                       |
| **Trigger** | Admin clicks "+ New Asset" from the Asset Registry grid. |
| **Screen**  | Asset Registration Wizard (§2.1 wireframe).              |

**Steps:**

| Step | Screen                    | Actions                                                                                                                                                                            |
| :--- | :------------------------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | **Basic Info**            | Select Category (triggers dynamic field loading), enter Asset Name, Serial Number (unique validation), select Location (Building > Floor > Room), Brand → cascading Model, Vendor. |
| 2    | **Technical Details**     | Dynamic EAV fields rendered from category schema. E.g., Laptops: CPU, RAM, Storage, OS. Furniture: Dimensions, Material. Fields swap instantly on category change.                 |
| 3    | **Financial Info** (§2.2) | Base Price, Tax, Shipping (auto-calculated Total). Currency selector (NOK / USD / LKR). Invoice PDF drag-and-drop upload.                                                          |
| 4    | **Review & Submit**       | Read-only summary of all data. "Submit" commits the record.                                                                                                                        |

On submit:

- System auto-generates Asset ID (`{PREFIX}-{SEQUENCE}`, e.g., `LAP-0142`).
- QR code generated encoding `assets.tiqri.com/asset/{ASSET_ID}`.
- Initial status set to `Available`.
- Success toast notification.

**Decision Points:**

| Condition               | Outcome                                                                                         |
| :---------------------- | :---------------------------------------------------------------------------------------------- |
| Duplicate Serial Number | Submission blocked: _"Duplicate Serial Number detected (linked to AST-00045)."_ (REQ-REG-2.16). |
| Consumable category     | Serial number field bypassed; quantity tracking enabled instead (REQ-REG-2.5).                  |

**End State:** Asset registered with unique ID, QR code generated, audit event logged.

---

### J6 — Bulk Import (CSV / Excel)

| Attribute   | Detail                                                    |
| :---------- | :-------------------------------------------------------- |
| **Actors**  | Global Admin, IT Operations Admin.                        |
| **Trigger** | Admin uploads a CSV/Excel file from the registry toolbar. |
| **Screens** | Column Mapping UI, Post-Import Summary Modal.             |

**Steps:**

1. Admin drags/drops or selects a file (max 10 MB, 5,000 rows).
2. **Column Mapping UI:** System auto-maps headers; admin confirms or adjusts mappings.
3. **5-Stage Validation Pipeline:** Structural → Type Cast → Referential Lookup → Business Rules → EAV Schema.
4. Rows split into **Valid** and **Invalid** buckets.
5. Valid rows: batch INSERT with row-level micro-transactions. Asset IDs auto-generated (sequence locked via `SELECT...FOR UPDATE`), QR codes created, initial status = `Available`.
6. Invalid rows: collected with per-row error metadata (row number, stage, field, message).
7. Audit log entry created per imported row.
8. **Post-Import Summary Modal:** _"✓ Bulk Import Complete"_ — imported count, failed count, skipped empty rows.
9. **"Download Error Report (CSV)"** link → `import-errors-{timestamp}.csv`.
10. **"View Imported Assets"** → registry grid pre-filtered by batch timestamp.

**Error Paths:**

| Condition                     | Response                                                     |
| :---------------------------- | :----------------------------------------------------------- |
| Intra-batch duplicate serials | Both rows rejected with cross-reference message.             |
| Concurrent import in progress | _"A bulk import is currently in progress."_ (advisory lock). |
| Invalid file format           | Parse error toast.                                           |

**End State:** Valid assets registered; error report available for review and re-import of failed rows.

---

### J7 — Asset Assignment

| Attribute   | Detail                                                               |
| :---------- | :------------------------------------------------------------------- |
| **Actors**  | Global Admin, IT Operations Admin → triggers Employee handoff.       |
| **Trigger** | Admin clicks "Assign" from slide-out footer or grid action menu (⋯). |
| **Screen**  | Asset Assignment Modal (§3.3 wireframe).                             |

**Steps:**

1. **Target Selection:** Searchable Combobox for User (name + department + avatar) or Location (Building > Floor > Room). Team/department-level assignment is **blocked** with tooltip: _"Assets can only be assigned to a User or a Location."_
2. **Options:** Optional Expected Return Date (calendar picker), Notes field.
3. **Confirm:** Click "Confirm Assignment".
4. Asset status transitions to `Assigned`. `acceptance_status` set to `Pending` on the `asset_assignments` record.
5. **Cross-Persona Handoff →** Custody notification dispatched simultaneously via:
   - **Email** — HTML message with token-secured "Confirm Receipt" link.
   - **Microsoft Teams** — Adaptive Card with action button.
   - **In-App Inbox** — Bell icon badge increments.
6. Admin's Asset Details slide-out shows `Pending` badge (yellow) under the Vitals tab.
7. Audit log: `ASSIGN` event recorded.

**Decision Points:**

| Condition                   | Outcome                                                           |
| :-------------------------- | :---------------------------------------------------------------- |
| Asset not `Available`       | Assignment blocked.                                               |
| Target is a Team            | Blocked: _"Assets can only be assigned to a User or a Location."_ |
| Software license seats full | Blocked per BR-04.                                                |

**End State:** Asset assigned, custody notification dispatched, awaiting employee confirmation (→ J20).

---

### J8 — Return Request & Check-In

| Attribute   | Detail                                                                     |
| :---------- | :------------------------------------------------------------------------- |
| **Actors**  | Global Admin, IT Operations Admin (initiator); Employee (physical return). |
| **Trigger** | Admin clicks "Request Return" in Asset Details panel footer.               |
| **Screen**  | Condition Review Modal (§3.4 wireframe).                                   |

**Phase 1 — Return Request:**

1. Single-click action → confirmation toast.
2. Asset status transitions to `Return Requested`.
3. Return notification dispatched to current custodian via Email + Teams + In-App.
4. Grid row shows "Requested" status badge.

**Phase 2 — Physical Check-In:**

1. Employee returns asset physically. Admin opens the check-in flow.
2. **Condition Review Modal:** Mandatory Radio Group:
   - Good Working Condition
   - Working with Minor Issues
   - Needs Repair
   - Beyond Repair
3. Condition Notes textarea for detailed observations.
4. **Status Routing** based on selection:

| Condition           | Next Status        | Route                                 |
| :------------------ | :----------------- | :------------------------------------ |
| Good / Minor Issues | `Available`        | Re-enters active pool.                |
| Needs Repair        | `In Repair`        | Routes to Maintenance Ledger (→ J10). |
| Beyond Repair       | `Pending Disposal` | Routes to Disposal queue (→ J11).     |

5. Assignment record closed, audit event logged.

**End State:** Asset returned to appropriate lifecycle state based on condition assessment.

---

### J9 — Tethered Companion Scanning

| Attribute   | Detail                                                                 |
| :---------- | :--------------------------------------------------------------------- |
| **Actors**  | Global Admin, IT Operations Admin (desktop + mobile).                  |
| **Trigger** | Admin clicks "Enable Mobile Scanner" on the desktop registration form. |
| **Screens** | Desktop status indicator; Mobile PWA Scanner Interface.                |

**Steps:**

1. **Desktop:** Opens WebSocket connection (JWT authenticated), registered as **receiver** for the user's `user_id`. Status badge: _"Waiting for mobile scanner..."_
2. **Mobile:** Admin opens `assets.tiqri.com/scan` on their phone (same Azure AD login). Full-screen camera viewfinder with targeting reticle, flashlight toggle.
3. **Auto-Link:** Mobile opens WebSocket (JWT), registered as **sender**. Server auto-matches sender ↔ receiver by `user_id` (identity-based auto-link — no QR pairing required).
4. Both devices show **"Connected"** indicator + partner device info.
5. Admin focuses the Serial Number input field on desktop.
6. Admin scans a manufacturer barcode with the phone → decoded string sent via `scan_result` WebSocket message.
7. Desktop injects the value into the focused input within <500 ms. Toast: _"✓ SN-DELL-5540-001 injected"_.
8. Mobile: haptic vibration (`navigator.vibrate(200)`) + _"✓ Sent"_ toast.
9. Loop for additional scans (one scan per focus event).
10. Session ends on: disconnect, 30-min inactivity timeout, navigation away, or JWT expiry.

**Standalone Mode (no desktop session):**
Scanning a TIQRI QR code on mobile → navigates to the asset's URL → mobile bottom-sheet with asset vitals + quick actions (Flag for Repair, View Details, Copy ID).

**Error Paths:**

| Condition                   | Response                                                                   |
| :-------------------------- | :------------------------------------------------------------------------- |
| No focused desktop field    | Scan buffered 10 s → discarded. Mobile: _"⚠ No field focused on desktop."_ |
| WiFi lost                   | Auto-reconnect with exponential backoff (1 s → 2 s → 4 s → 8 s, 60 s max). |
| Camera permission denied    | "Camera Permission Required" page with device settings link.               |
| Desktop-only view on mobile | "Desktop Required" empty-state card listing mobile-available actions.      |

**End State:** Serial numbers injected from mobile camera into desktop form fields in real time.

---

### J10 — Maintenance Triage & Repair

| Attribute   | Detail                                                                                                |
| :---------- | :---------------------------------------------------------------------------------------------------- |
| **Actors**  | IT Operations Admin, Global Admin.                                                                    |
| **Trigger** | Employee submits "Report Issue" (→ J21) OR asset returned defective (→ J8).                           |
| **Screens** | Maintenance Ledger (§3.5), Triage Slide-Out (§3.6), Dispatch Modal (§3.7), Close Repair Modal (§3.7). |

**Steps:**

1. Triage ticket appears in the **Maintenance Ledger → Pending Review** tab. Badge count: _"Pending Review (12)"_.
2. Admin clicks row → **Triage Review Slide-Out:** issue details (reporter, date, description, photos) + asset context (warranty status, current book value, assignment history).
3. **Decision Point:**

| Decision           | Action                                                           |
| :----------------- | :--------------------------------------------------------------- |
| Resolve Internally | Close ticket → status reset to `Available` or custom status.     |
| Log Repair Ticket  | Opens **Initiate Repair (Dispatch) Modal** → proceeds to step 4. |

4. **Dispatch Modal:** Vendor selector, RMA Ticket Number, Estimated Cost, Expected Return Date, Notes. Confirm → status → `In Repair`, asset un-assigned, record moves to **Active Repairs** tab.
5. **Active Repairs** tab monitors: Asset ID, Vendor, RMA #, Estimated Cost, Expected Return Date, Days Elapsed. Overdue repairs highlighted red.
6. Vendor completes repair → Admin clicks "Complete Repair" → **Close Repair Modal:** Service Date, Final Cost, Post-Repair Action:

| Post-Repair Action | Next Status        | Route                             |
| :----------------- | :----------------- | :-------------------------------- |
| Return to Service  | `Available`        | Re-enters active pool.            |
| Flag for Disposal  | `Pending Disposal` | Routes to Disposal queue (→ J11). |

7. Final Cost updates the TCO engine. Record moves to **Repair History** tab (read-only).

**End State:** Asset either returned to service or flagged for disposal, with maintenance cost captured.

---

### J11 — Disposal Intake

| Attribute   | Detail                                                                   |
| :---------- | :----------------------------------------------------------------------- |
| **Actors**  | IT Operations Admin, Global Admin.                                       |
| **Trigger** | Admin flags a Defective, Available, or post-repair asset for retirement. |

**Steps:**

1. Admin clicks "Initiate Disposal" from the grid action menu or Asset Details slide-out.
2. Status transitions to `Pending Disposal`.
3. Asset removed from the active "Available" inventory pool.
4. Approval task generated in the **Disposals Ledger → Pending Approval** tab (§4.1 wireframe).

**Cross-Persona Handoff:** IT Operations Admin → Finance Admin / Global Admin (for review in J12 / J13).

**End State:** Asset queued for executive/financial review.

---

### J12 — Disposal Approval (Hard-Stop Compliance)

| Attribute   | Detail                                                                                 |
| :---------- | :------------------------------------------------------------------------------------- |
| **Actors**  | Finance Admin, Global Admin. (**Segregation of duties:** requester ≠ approver, BR-01.) |
| **Trigger** | Reviewer clicks a pending disposal row in the Disposals Ledger.                        |
| **Screens** | Disposal Review Slide-Out (§4.2), Hard-Stop Compliance Modal (§4.3).                   |

**Steps:**

1. **Disposal Review Slide-Out:** Original Purchase Cost, Depreciated Book Value, IT admin's justification notes, lifecycle summary (last repair date, total maintenance costs, total assignments).
2. Click **"Approve & Dispose"** → opens **Hard-Stop Compliance Modal**:

| Section               | Requirement                                                                                                                       |
| :-------------------- | :-------------------------------------------------------------------------------------------------------------------------------- |
| Security Checklist    | ☐ _"Confirm: All data has been securely wiped."_ ☐ _"Confirm: Physical asset tags have been removed."_ Both mandatory checkboxes. |
| E-Waste Certificate   | Drag-and-drop PDF upload (Certificate of Destruction). Stored with 7-year retention.                                              |
| Disposal Method       | Mandatory Select: E-Waste Recycling, Sold, Donated.                                                                               |
| Asset ID Confirmation | Text input requiring exact Asset ID (e.g., `LAP-0089`). Compared server-side.                                                     |
| Salvage Value         | Optional numeric input (shown for Sold / Donated). Feeds Write-Offs & Salvage Ledger.                                             |

3. **"Confirm Disposal"** button remains **disabled** until all conditions are satisfied.
4. On confirm: status → `Disposed` or `Donated`. `is_archived = true`. All fields permanently locked. Audit event logged.

**End State:** Asset permanently archived (soft-deleted), E-Waste certificate stored, salvage value feeds the financial ledgers.

**Error Paths:**

| Condition             | Response                                         |
| :-------------------- | :----------------------------------------------- |
| Checkbox unchecked    | Submit button stays disabled.                    |
| E-Waste cert missing  | Submit button stays disabled.                    |
| Asset ID mismatch     | Inline validation error.                         |
| Self-approval attempt | Blocked by BR-01 — must route to different user. |

---

### J13 — Disposal Rejection

| Attribute   | Detail                                                  |
| :---------- | :------------------------------------------------------ |
| **Actors**  | Finance Admin, Global Admin.                            |
| **Trigger** | Reviewer clicks "Reject Request" on a pending disposal. |
| **Screen**  | Disposal Rejection Modal (§4.4 wireframe).              |

**Steps:**

1. **Rejection Modal:** Mandatory justification textarea + status re-routing dropdown (Available, In Repair, etc.).
2. Confirm → asset status updated per selection. Original requester receives an in-app notification with the rejection reason.
3. Audit event logged.

**End State:** Asset re-routed to an active lifecycle status.

---

### J14 — Bulk Disposal

| Attribute   | Detail                                                                   |
| :---------- | :----------------------------------------------------------------------- |
| **Actors**  | Finance Admin, Global Admin.                                             |
| **Trigger** | Admin selects multiple rows in Disposals Ledger → clicks "Bulk Dispose". |
| **Screen**  | Bulk Disposal Processing Modal (§4.5 wireframe).                         |

**Steps:**

1. Summary table of selected Asset IDs, Names, and Book Values.
2. Single shared E-Waste Certificate PDF upload covering the entire batch.
3. Confirmation input: type _"DISPOSE {N} ASSETS"_ (e.g., _"DISPOSE 30 ASSETS"_) to unlock the submit button.
4. Confirm → all assets processed in a single database transaction. Every asset linked to the same certificate URL.

**End State:** Multiple assets disposed simultaneously in one audited transaction.

---

### J15 — Financial Reporting & Dashboards

| Attribute   | Detail                                                                                                                  |
| :---------- | :---------------------------------------------------------------------------------------------------------------------- |
| **Actors**  | Global Admin, Finance Admin.                                                                                            |
| **Trigger** | User logs in (dashboard auto-loads) or navigates to Financials / Reports.                                               |
| **Screens** | Dashboard (§5.1), Depreciation Ledger (§5.3), TCO Ledger (§5.4), Write-Offs & Salvage (§5.5), Report Generation (§5.2). |

**Steps:**

| Step | Screen                          | Detail                                                                                                                                                                                                               |
| :--- | :------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | **Admin KPI Dashboard** (§5.1)  | Widget grid: Total Assets, Pending Approvals, Overdue Returns, Low Stock, Recent Activity, Problem Asset Counts (≥3 repair tickets). Full render <2 s. Widget clicks deep-link to filtered views.                    |
| 2    | **Depreciation Ledger** (§5.3)  | Real-time straight-line depreciation: `Book Value = Base Cost − ((Base Cost − Salvage) / Useful Life × Age)`. Sort by Book Value to surface near-zero EOL assets. RBAC-restricted to Finance / Global Admin.         |
| 3    | **TCO Ledger** (§5.4)           | Original Cost + Total Repair Costs = TCO. Rows where repairs exceed book value highlighted amber/red (repair-vs-replace signal).                                                                                     |
| 4    | **Write-Offs & Salvage** (§5.5) | Disposed assets + salvage values recovered. Summary footer: Total Write-Offs, Total Salvage, Net Position.                                                                                                           |
| 5    | **Report Generation** (§5.2)    | Select report type (Inventory by Dept, Assets by Status, Financial Summary, Compliance Audit), date range, location filter → Generate → HTML preview → export PDF / CSV / Excel (up to 50,000 rows, <10 s download). |

**End State:** Data-driven decision support for budgeting, compliance, and asset lifecycle planning.

---

### J16 — Alert Configuration

| Attribute   | Detail                                             |
| :---------- | :------------------------------------------------- |
| **Actors**  | Global Admin.                                      |
| **Trigger** | Admin navigates to Settings → Alert Configuration. |
| **Screen**  | Alert Configuration — Settings (§5.6 wireframe).   |

**Steps:**

1. Toggle on/off per alert rule:

| Rule                | Threshold Setting                                                         |
| :------------------ | :------------------------------------------------------------------------ |
| Warranty Expiration | Alert X days before expiry (30 / 60 / 90 days).                           |
| License Renewal     | Alert X days before expiry (30 / 60 / 90 days).                           |
| Overdue Returns     | Triggers when an assigned asset passes its Expected Return Date.          |
| Overdue Repairs     | Alert X days after expected return date (7 / 14 / 30 days).               |
| Low Stock           | Alert when consumable quantity falls below X (configurable per category). |

2. Configure email distribution and Teams webhook URL.
3. Save → settings persisted. Next nightly CRON run picks up changes.

**End State:** Alert rules configured and active.

---

### J17 — Audit Log Review

| Attribute   | Detail                                               |
| :---------- | :--------------------------------------------------- |
| **Actors**  | Global Admin.                                        |
| **Trigger** | Admin navigates to Settings → System Audit Log.      |
| **Screen**  | System Audit Log — Filterable Grid (§1.4 wireframe). |

**Steps:**

1. **Filter Panel:** Date Range (calendar picker), Actor (user search), Action Type (multi-select: CREATE, UPDATE, DELETE, ASSIGN, DISPOSE), Entity Type.
2. **Apply Filters** → grid renders matched entries: Timestamp, Actor (name + avatar), Action (colour-coded Badge), Entity, Asset ID, IP Address, Summary.
3. Row click expands to show **Before / After JSON diff**.
4. **"Export Log to CSV"** button exports the currently filtered dataset.

> **Immutability:** No edit or delete actions are available. The audit ledger is append-only and WORM-enforced (NFR-SEC-05).

**End State:** Audit trail reviewed and / or exported for external auditor consumption.

---

### J18 — QR Code Print

| Attribute   | Detail                                                                          |
| :---------- | :------------------------------------------------------------------------------ |
| **Actors**  | Global Admin, IT Operations Admin.                                              |
| **Trigger** | Admin views QR tab in Asset Details or selects assets in grid → "Print Labels". |
| **Screen**  | QR Code Preview & Print (§2.5 wireframe).                                       |

**Steps:**

1. **Single Asset — QR Tab:** QR code image preview (scannable from screen). TIQRI logo + Asset ID text beneath.
2. **"Print Single Tag"** → formatted for Zebra / Dymo thermal printers (label roll).
3. **"Print A4 Grid"** → multi-up layout aligned to Avery 5160 sticker sheets.
4. **Bulk Print:** Select multiple assets in registry grid → "Print Labels" toolbar button → A4 PDF grid generated.

**End State:** Physical QR labels ready for printing and affixing to assets.

---

### J19 — Employee "My Assets" Portal

| Attribute   | Detail                                        |
| :---------- | :-------------------------------------------- |
| **Actors**  | Standard Employee.                            |
| **Trigger** | Employee logs in (auto-routed).               |
| **Screen**  | Employee "My Assets" Portal (§3.1 wireframe). |

**Steps:**

1. System detects non-admin role → routes to the "My Assets" portal.
2. Read-only grid filtered to the employee's Azure AD profile: Asset ID, Name, Category, Status, Assigned Date.
3. Row click → compact read-only detail view with asset vitals.
4. **"Report Issue"** button per row — submits a damage ticket (→ J21).
5. Responsive: single-column card layout on mobile.

**End State:** Employee sees their assigned equipment and can report issues.

---

### J20 — Digital Acceptance (Custody Confirmation)

| Attribute   | Detail                                                             |
| :---------- | :----------------------------------------------------------------- |
| **Actors**  | Standard Employee (triggered by Admin assignment, J7).             |
| **Trigger** | Employee receives custody notification via Email / Teams / In-App. |
| **Screen**  | Digital Acceptance — Confirmation Page (§3.2 wireframe).           |

**Steps:**

1. Employee receives notification within 60 seconds of assignment.
2. Email contains: Asset details (ID, description, serial number, category, assigned by, date, location) + token-secured **"Confirm Receipt"** button. Teams: Adaptive Card with action button. In-App: bell icon badge increments.
3. Employee clicks link → standalone page: `/confirm/{token}`.
4. **Read-Only Asset Card:** Asset ID, Name, Category, Serial Number, Assigned By, Assignment Date.
5. Large **"Confirm Receipt"** primary button.
6. Click → backend validates hashed token → updates `acceptance_status = 'Confirmed'` + `confirmed_at` timestamp → invalidates token → audit log entry.
7. Success state replaces the button: _"✓ Receipt Confirmed on {date}."_ Page becomes inert.
8. Admin's slide-out panel badge updates: `Pending` (yellow) → `Confirmed` (green).

**Escalation Timeline:**

| Day | Event                                                                  |
| :-- | :--------------------------------------------------------------------- |
| 0   | Notification dispatched.                                               |
| 5   | CRON engine sends reminder to employee.                                |
| 7   | Token expires. CRON alerts admin.                                      |
| 7+  | Admin decides: resend confirmation (new token, reset TTL) or unassign. |

**Error Paths:**

| Condition               | Response                                                         |
| :---------------------- | :--------------------------------------------------------------- |
| Token expired (>7 days) | _"This confirmation link expired on {date}. Please contact IT."_ |
| Token already used      | _"ℹ Already Confirmed"_ info page with confirmation timestamp.   |

**End State:** Custody digitally confirmed with timestamp and IP logged.

---

### J21 — Employee Issue Reporting

| Attribute   | Detail                                               |
| :---------- | :--------------------------------------------------- |
| **Actors**  | Standard Employee → routes to IT Operations Admin.   |
| **Trigger** | Employee clicks "Report Issue" from a My Assets row. |

**Steps:**

1. Employee fills in an issue description (text + optional photo attachment).
2. System creates a triage ticket linked to the asset.
3. Ticket routes to the **Maintenance Ledger → Pending Review** tab.

**Cross-Persona Handoff:** Employee → IT Operations Admin (for triage in J10).

**End State:** Issue ticket queued for IT review.

---

### J22 — Nightly CRON Alert Engine

| Attribute   | Detail                                        |
| :---------- | :-------------------------------------------- |
| **Actors**  | CRON Engine (System).                         |
| **Trigger** | Time-based: `0 2 * * *` (02:00 AM UTC daily). |

**Steps:**

1. Acquire PostgreSQL advisory lock (`pg_advisory_lock(42001)`). If already running → skip and log warning.
2. Load active alert configuration rules from the database.
3. Run **5 parallel scans:**

| Scan              | Query Logic                                                              |
| :---------------- | :----------------------------------------------------------------------- |
| `WARRANTY_EXPIRY` | Assets where `warranty_expiry_date` falls within configured threshold.   |
| `LICENSE_RENEWAL` | Software assets where `license_expiry_date` falls within threshold.      |
| `OVERDUE_RETURN`  | Assignments past `expected_return_date` with no check-in.                |
| `OVERDUE_REPAIR`  | Maintenance records past `expected_return_date` with status `In Repair`. |
| `LOW_STOCK`       | Consumables where current quantity < configured threshold.               |

4. Collect matching rows → deduplicate via `notification_key = {entity_id}:{rule_type}:{threshold_date}` (idempotent — no re-notification for the same event).
5. Route alerts to targeted recipients (e.g., overdue repair alerts → dispatching IT Admin, not a global list).
6. Group alerts by recipient → build a single digest per person.
7. Dispatch simultaneously: **Email** (HTML digest), **Teams** (Adaptive Card summary), **In-App Inbox** (individual notification rows).
8. Log execution summary to `cron_execution_log`: `alerts_generated`, `emails_sent/failed`, `teams_sent/failed`, `inbox_entries`, `status`.
9. Release advisory lock.

**Retry Logic:** Exponential backoff: immediate → 30 s → 2 min → 8 min → 30 min (5 attempts max). Channel failures are independent (Teams failure does not block email delivery).

**End State:** Stakeholders proactively notified of threshold breaches; no duplicate alerts.

**Error Paths:**

| Condition            | Response                                                   |
| :------------------- | :--------------------------------------------------------- |
| DB connection loss   | Terminate, release lock, log `CRITICAL`, retry next night. |
| SMTP / Teams failure | Independent retry per channel (5 attempts with backoff).   |
| Digest >50 items     | Truncated with "View all in IDAMS" deep-link.              |

---

### J23 — Exception Status Handling (Lost / Missing)

| Attribute   | Detail                                                               |
| :---------- | :------------------------------------------------------------------- |
| **Actors**  | Global Admin, IT Operations Admin.                                   |
| **Trigger** | Admin manually changes asset status during physical inventory audit. |

**Steps:**

1. Admin initiates status change to `Lost` or `Missing` from the Asset Details slide-out or grid action menu.
2. System prompts for **mandatory justification notes** (state-machine guard, REQ-OPS-3.13).
3. Status updated. Asset removed from the `Available` pool.
4. **Recovery Paths:**

| Current Status | Action   | Next Status | Notes                        |
| :------------- | :------- | :---------- | :--------------------------- |
| Missing        | Located  | `Available` | Verification notes required. |
| Missing        | Upgraded | `Lost`      | After prolonged search.      |
| Lost           | Found    | `Available` | Verification notes required. |

5. **Blocked Transitions:** `Lost → Assigned` and `Missing → Assigned` are invalid — asset must be recovered first.
6. Audit event logged with justification.

**End State:** Asset exception documented with full audit trail.

---

## 3. Cross-Persona Handoff Matrix

| Source Persona        | Target Persona               | Handoff Event                                      | Journey Link       |
| :-------------------- | :--------------------------- | :------------------------------------------------- | :----------------- |
| Global / IT Admin     | Standard Employee            | Asset assignment triggers custody notification.    | J7 → J20           |
| Global / IT Admin     | Standard Employee            | Return request notification dispatched.            | J8 → Employee      |
| Standard Employee     | IT Operations Admin          | "Report Issue" creates triage ticket.              | J21 → J10          |
| IT Operations Admin   | Finance Admin / Global Admin | Disposal intake flags asset for executive review.  | J11 → J12/J13      |
| Finance Admin         | IT Operations Admin          | Disposal rejection notification sent to requester. | J13 → notification |
| CRON Engine           | IT Operations Admin          | Overdue repair / return alerts dispatched.         | J22 → J10          |
| CRON Engine           | Standard Employee            | Day-5 custody reminder notification.               | J22 → J20          |
| CRON Engine           | Global Admin / Finance Admin | Warranty / license expiry digest.                  | J22 → J15          |
| External API Consumer | IDAMS                        | API triggers assignment workflow.                  | External → J7      |

---

## 4. Error & Exception Path Catalogue

| ID   | Context             | Error Condition                                   | System Response                                                                        | Requirement   |
| :--- | :------------------ | :------------------------------------------------ | :------------------------------------------------------------------------------------- | :------------ |
| E-01 | Asset Registration  | Duplicate Serial Number                           | Block submission: _"Duplicate Serial Number detected (linked to AST-00045)."_          | REQ-REG-2.16  |
| E-02 | Assignment          | Target is a Team / Department                     | Block: _"Assets can only be assigned to a User or a Location."_                        | REQ-OPS-3.3   |
| E-03 | Assignment          | Asset not `Available`                             | Block: _"Asset is currently checked out to [User Name]."_                              | State Machine |
| E-04 | State Transition    | Invalid transition attempted                      | `400 Bad Request` with descriptive message.                                            | REQ-OPS-3.13  |
| E-05 | State Transition    | Missing justification for Lost/Missing            | Submission blocked until mandatory notes provided.                                     | REQ-OPS-3.13  |
| E-06 | Master Data Delete  | Referential dependencies exist                    | Block: _"Cannot delete: Category contains 142 active assets."_ Suggest archival.       | REQ-FND-1.10  |
| E-07 | Category Creation   | Prefix Code collision                             | Auto-resolve: append numeric suffix (e.g., `LAP` → `LAP2`).                            | REQ-FND-1.15  |
| E-08 | Disposal Hard Stop  | Checkboxes unchecked / cert missing / ID mismatch | "Confirm Disposal" button stays disabled.                                              | REQ-DSP-4.4   |
| E-09 | Disposed Asset Edit | PUT/PATCH on archived asset                       | `403 Forbidden`: _"Disposed assets are permanently archived and cannot change state."_ | NFR-SEC-07    |
| E-10 | Bulk Import         | Row validation failure                            | Skip row, add to error bucket. Downloadable error CSV with per-row details.            | REQ-REG-2.10  |
| E-11 | Bulk Import         | Intra-batch duplicate serial                      | Both rows rejected: _"Duplicate Serial Number within uploaded file (rows 12 and 47)."_ | REQ-REG-2.10  |
| E-12 | Bulk Import         | Concurrent import in progress                     | Block: _"A bulk import is currently in progress."_                                     | Advisory Lock |
| E-13 | Digital Acceptance  | Token expired (>7 days)                           | _"This confirmation link expired on {date}. Please contact IT."_                       | REQ-OPS-3.2   |
| E-14 | Digital Acceptance  | Token already consumed                            | _"ℹ Already Confirmed"_ info page.                                                     | REQ-OPS-3.2   |
| E-15 | Tethered Scanner    | No focused desktop field                          | Scan buffered 10 s → discarded. Mobile: _"⚠ No field focused on desktop."_             | REQ-REG-2.14  |
| E-16 | Tethered Scanner    | WiFi connection lost                              | Auto-reconnect with exponential backoff (1 s → 60 s max).                              | REQ-REG-2.14  |
| E-17 | Tethered Scanner    | Camera permission denied                          | "Camera Permission Required" page with settings link.                                  | REQ-REG-2.13  |
| E-18 | Mobile Navigation   | Desktop-only view on mobile                       | "Desktop Required" empty-state card listing mobile-available actions.                  | REQ-REG-2.15  |
| E-19 | CRON Engine         | Database connection loss                          | Terminate, release lock, log `CRITICAL`, retry next night.                             | NFR-REL-05    |
| E-20 | CRON Engine         | SMTP / Teams delivery failure                     | Exponential backoff (5 attempts). Channels independent.                                | NFR-REL-05    |
| E-21 | API Gateway         | Rate limit exceeded (100 req/min/key)             | `429 Too Many Requests`.                                                               | NFR-PERF-06   |
| E-22 | RBAC                | Unauthorised route access                         | `403 Forbidden` + audit log entry.                                                     | NFR-SEC-02    |
| E-23 | Disposal Approval   | Self-approval attempt (requester = approver)      | Blocked by BR-01 (segregation of duties).                                              | BR-01         |
| E-24 | Software Licence    | Over-allocation (seats exhausted)                 | Blocked: _"All licence seats are allocated."_                                          | BR-04         |

---

[< Back to Requirements](./README.md)
