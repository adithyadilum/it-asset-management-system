# Epic 2: System Permissions & Role-Based Access Control

## Summary

This epic governs what authenticated users are allowed to do inside the system. It enforces a strict, four-tier Role-Based Access Control (RBAC) architecture and provides Global Admins with a dedicated split-view control panel to seamlessly map employees to operational or financial roles.

## In Scope

- A split-view Administrator Control Panel for bulk and manual role mapping.
- Interactive UI modals for granting and revoking access.
- Enforcement of the four core system roles: Global Admin, IT Operator, Financial Auditor, and Standard Employee.
- UI/UX adjustments based on roles (hiding unauthorized sidebar navigation and action buttons via authorization utilities).

## Out of Scope / Limitations

- The Standard Employee role, its backend data isolation logic, and the "My Assets" self-service portal are completely out of scope for this Epic (these will be comprehensively covered in a dedicated Employee Portal Epic).
- Custom role creation (administrators cannot invent new permission tiers; they are hardcoded to the four enterprise standards).

## Assumptions & Dependencies

- Relies on successful authentication and session token generation completed in Epic 1.
- Uses `getAuthenticatedUser()` Server Action to fetch authoritative role state.

---

### User Stories

- [US-2.1 — Administrator Control Panel for System Permissions](#user-story-us-21--administrator-control-panel-for-system-permissions)
- [US-2.2 — Global Admin Role Capabilities](#user-story-us-22--global-admin-role-capabilities)
- [US-2.3 — IT Operator Role Capabilities](#user-story-us-23--it-operator-role-capabilities)
- [US-2.4 — Financial Auditor Role Capabilities](#user-story-us-24--financial-auditor-role-capabilities)
- [US-2.5 — Default "Least Privilege" Access Assignment](#user-story-us-25--default-least-privilege-access-assignment)

---

## User Story: US-2.1 — Administrator Control Panel for System Permissions

- **As a** System Administrator,
- **I want** an easy-to-use interface to manage what employees can do in the system,
- **So that** I can securely elevate IT staff to manage hardware and Finance staff to view reports, without needing a developer to write code.

### Acceptance Criteria (Gherkin)

- **Scenario: Bulk User Selection & Mapping**
  - **Given** I am viewing the Role Assignment control panel and click "Add User"
  - **When** the assignment popup window appears
  - **Then** I can search for and select multiple users at once to add to the mapping selection list
  - **And** clicking "Confirm Mapping" assigns all selected users to the target role simultaneously via a single atomic database transaction.

- **Scenario: Removing a User During Selection**
  - **Given** I am in the "Add User" popup and have selected multiple employees
  - **When** I click the trash icon next to a selected user _before_ confirming
  - **Then** the user is removed from the temporary selection list.

- **Scenario: Searching for a Non-Existent User**
  - **Given** I am in the "Add User" popup
  - **When** I search for a user who does not exist in the system (query matches no email or name)
  - **Then** a message appears stating: "No users found."
  - **And** the "Confirm Mapping" button remains disabled.

- **Scenario: Revoking Elevated Access**
  - **Given** a user is currently assigned to an elevated role
  - **When** I click the trash icon next to their name in the role list
  - **Then** a confirmation popup appears titled "Remove User Access"
  - **And** after clicking "Confirm Removal", the user is removed from that role and falls back to the "Employee" role.

- **Scenario: Global Admin Anti-Lockout (Server-Side Guard)**
  - **Given** I am logged in as a "Global Admin"
  - **When** I attempt to remove my own Global Admin role (either via UI or directly hitting the API)
  - **Then** the system throws an error stating "Action Prohibited: You cannot modify your own role."
  - **And** my role remains unchanged to prevent accidental lockouts.

### UI/UX Specifications & Constraints

- **Layout:** Must utilize a Master-Detail split-view component. The left column lists the 4 core roles, and the right panel displays the users assigned to the selected role.
- **Add User Modal:** Triggered by the "Add User" button. Must support multi-select functionality with dynamic user searching.
- **Revocation Modal:** Triggered by the trash icon in the active role list. Must strictly include a destructive action button to confirm removal.
- **Anti-Lockout UX:** The trash icon next to the active user's own name in the Role Mapping screen must be styled with low opacity and a `cursor-not-allowed` hover state.

### Technical Implementation Tasks

#### Frontend

- [x] Build the Master-Detail split-view layout component: left panel listing the 4 roles, right panel displaying assigned users.
- [x] Build the "Add User" modal with a searchable input, multi-select user list, and a "Confirm Mapping" CTA.
- [x] Build the "Remove User Access" confirmation modal with destructive-action styling.
- [x] Implement self-lockout prevention logic: disable the trash icon on the current user's own row.
- [x] Build the "No users found" empty state for the user search within the Add User modal.

#### Backend

- [x] Integrate roles into the `Users` table (`role` column enum: 'GlobalAdmin', 'ITOperator', 'FinancialAuditor', 'Employee').
- [x] Create an `assignUsersRoleBulk` server action accepting an array of user IDs.
- [x] Create a `removeUserFromManagedRole` server action to gracefully revert users to the `Employee` role.
- [x] Write backend validation to reject any request targeting the active user's own role (anti-lockout fail-safe).
- [x] Create a `searchUsers(query: string)` server action to power the user search in the Add User modal.
- [x] Implement Audit Logging (`logAuditAction`) for all role modifications (UPDATE actions on the users entity).

---

## User Story: US-2.2 — Global Admin Role Capabilities

- **As a** Global Admin,
- **I want** full, unrestricted read and write access to the entire application,
- **So that** I can configure system settings, map roles, build master data schemas, and oversee all IT operations without blockers.

### Acceptance Criteria (Gherkin)

- **Scenario: Full System Navigation**
  - **Given** I am logged in as a "Global Admin" (`isGlobalAdmin = true`)
  - **When** I view the application interface
  - **Then** all sidebar navigation menus (Dashboard, Assets, Financials, Master Data, System Log, Settings) are visible and clickable.
  - **And** all Server Actions execute without throwing `Forbidden` errors.

### UI/UX Specifications & Constraints

- **Visibility:** The Global Admin sees the interface exactly as it is designed, with zero hidden tabs or missing buttons.

### Technical Implementation Tasks

#### Frontend

- [x] Implement role-aware rendering in the Sidebar component that displays all navigation items when `isGlobalAdmin` evaluates to true.
- [x] Ensure all action buttons (Edit, Delete, Assign, Dispose, etc.) render without restriction for this role across all pages (`canManageAssets`, `canAccessFinancials`, `canAccessOperations`).

#### Backend

- [x] Expose role evaluation utility functions in `src/lib/auth/roles.ts`.
- [x] Enforce authorization inside server actions by validating `currentUser.role === 'GlobalAdmin'` for sensitive operations like `searchUsers` and `assignUserRole`.

---

## User Story: US-2.3 — IT Operator Role Capabilities

- **As an** IT Operator,
- **I want** full read/write access to hardware records but be restricted from system configuration settings,
- **So that** I can efficiently assign, return, and repair assets without the risk of accidentally altering the database schemas or roles.

### Acceptance Criteria (Gherkin)

- **Scenario: Hardware Operations Access**
  - **Given** I am logged in as an "IT Operator" (`canManageAssets = true`, `canAccessOperations = true`)
  - **When** I view the Main Asset Registry
  - **Then** I have full access to click "Add Asset", "Assign", "Return", and "Flag for Dispose".

- **Scenario: Settings & Configuration Block**
  - **Given** I am logged in as an "IT Operator"
  - **When** I look at the main sidebar navigation
  - **Then** the "Settings", "System Log", and Financial reporting tabs are completely hidden from view.

- **Scenario: Blocked Server Action Execution**
  - **Given** I am logged in as an "IT Operator"
  - **When** I attempt to bypass the UI by manually executing a Role Assignment server action
  - **Then** the backend strictly rejects the request with a "Forbidden: Only Global Administrators can modify roles" exception.

### UI/UX Specifications & Constraints

- **Sidebar UI:** Dynamically remove restricted routes from the sidebar component so the user doesn't even know they exist.

### Technical Implementation Tasks

#### Frontend

- [x] Implement conditional sidebar rendering utilizing `canAccessFinancials` and `isGlobalAdmin` to hide financial ledgers, system logs, and role management settings.
- [x] Allow access to Asset creation/assignment interfaces via `canManageAssets` evaluations.

#### Backend

- [x] Write authorization guards within server actions (e.g. `assignUserRole`) to reject invocations from users holding the `ITOperator` role attempting unauthorized modifications.

---

## User Story: US-2.4 — Financial Auditor Role Capabilities

- **As a** Financial Auditor,
- **I want** global read-only access to all hardware registries and financial ledgers,
- **So that** I can review depreciation, warranty statuses, and Total Cost of Ownership (TCO) without the risk of accidentally deleting or re-assigning physical hardware.

### Acceptance Criteria (Gherkin)

- **Scenario: Global Read Access**
  - **Given** I am logged in as a "Financial Auditor" (`canViewAssetRegistry = true`, `canAccessFinancials = true`)
  - **When** I navigate to the Asset Registry or Financials tabs
  - **Then** I can view all hardware data across all locations globally.

- **Scenario: Action Restriction (No Write Access)**
  - **Given** I am logged in as a "Financial Auditor" (`canManageAssets = false`, `canAccessOperations = false`)
  - **When** I open an Asset Details panel
  - **Then** the "Edit", "Dispose", "Assign", and "Delete" buttons are hidden from the UI.

### UI/UX Specifications & Constraints

- **Action Buttons:** Instead of showing disabled buttons, completely remove destructive/operational action buttons from the DOM to keep the interface clean and avoid confusing the auditor.
- **Export Enablement:** The auditor must still be able to see and click all "Export CSV" and "Download Report" buttons.

### Technical Implementation Tasks

#### Frontend

- [x] Implement conditional rendering logic utilizing `canManageAssets(role)` to remove all write-action buttons (Edit, Assign, Dispose, Delete) from the DOM.
- [x] Ensure financial reporting navigation and export functionalities remain visible and fully functional (`canAccessFinancials`).

#### Backend

- [x] Enforce authorization inside operational Server Actions to ensure they return a `Forbidden` rejection if a `FinancialAuditor` tries to bypass the UI to execute an asset mutation.

---

## User Story: US-2.5 — Default "Least Privilege" Access Assignment

- **As an** Admin,
- **I want** every new employee logging into the system to default to the lowest possible permission level,
- **So that** our sensitive financial and hardware data is protected by default, requiring a conscious action from an administrator to grant elevated access.

### Acceptance Criteria (Gherkin)

- **Scenario: First-Time Login Default**
  - **Given** a newly hired employee logs into the asset management system for the very first time
  - **When** they authenticate successfully via SSO
  - **Then** the backend automatically creates their internal profile and assigns them the baseline "Employee" role.

- **Scenario: Admin Explicit Elevation**
  - **Given** a user currently holds the default "Employee" role
  - **When** a Global Admin explicitly uses the Role Assignment panel to upgrade them to an "IT Operator"
  - **Then** their permissions are instantly elevated and logged in the Audit database.

- **Scenario: Revocation Fallback**
  - **Given** an administrator revokes a user's specialized role
  - **When** the `removeUserFromManagedRole` action executes
  - **Then** the database actively falls back the user to the "Employee" baseline rather than leaving them in a null state.

### Technical Implementation Tasks

#### Backend

- [x] Ensure Just-in-Time (JIT) provisioning logic defaults all new users strictly to the `Employee` role string instead of null.
- [x] Implement `removeUserFromManagedRole` to perform an update explicitly setting the role back to `Employee`.

#### Database

- [x] Structure the `UserRole` type and database enum to enforce only `GlobalAdmin`, `ITOperator`, `FinancialAuditor`, or `Employee` values.
