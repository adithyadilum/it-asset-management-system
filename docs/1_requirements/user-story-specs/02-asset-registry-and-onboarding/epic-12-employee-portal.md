# Epic 12: Employee Portal & Digital Handshake

## Summary

This epic builds the Employee Portal, a simplified and highly restricted view of the IT Asset Management system intended for standard corporate users. It ensures that non-admin employees can only view the hardware explicitly assigned to them. Crucially, it introduces the "Digital Acceptance" workflow, requiring users to explicitly acknowledge receipt of new equipment or report issues securely via Next.js Server Actions.

## In Scope

- Strict Role-Based Access Control (RBAC) enforcing a 403 Forbidden wall against admin routes.
- A mobile-responsive "My Assets" dashboard featuring dynamically styled asset cards mapped to database pillars.
- In-app notification banners (`EmployeeAlerts`) for pending assignments and upcoming return dates.
- A "Digital Acceptance" transaction workflow updating assignment state and audit logs.
- A "Report Issue / Did Not Receive" rejection pathway.

## Out of Scope / Limitations

- Self-Service Requests: The ability for an employee to browse a catalog and request *new* assets is deferred to a future epic.
- Notification Delivery Infrastructure: While this epic defines the *business rules and triggers* for when alerts should happen (e.g., storing items in the `notification_queue`), the actual email/Slack integration is deferred.

## Assumptions & Dependencies

- Relies on NextAuth.js to identify the user making the request.
- Assumes the database table `asset_assignments` maps precisely to the logged-in user's `id`.

---

### User Stories

- [US-12.1 — Secure Portal Routing & Role Restriction](#user-story-us-121--secure-portal-routing--role-restriction)
- [US-12.2 — "My Assets" Dashboard](#user-story-us-122--my-assets-dashboard)
- [US-12.3 — Digital Acceptance & Rejection Workflow](#user-story-us-123--digital-acceptance--rejection-workflow)
- [US-12.4 — Asset Return Reminders & Admin Requests](#user-story-us-124--asset-return-reminders--admin-requests)

---

## User Story: US-12.1 — Secure Portal Routing & Role Restriction

- **As a** System Administrator,
- **I want** standard employees to be strictly confined to the Employee Portal,
- **So that** they cannot view, edit, or tamper with the global asset registry, financial ledgers, or admin dashboards.

### Acceptance Criteria (Gherkin)

- **Scenario: Default Employee Login Routing**
  - **Given** a user logs in via Microsoft SSO
  - **When** their system role resolves to "Employee"
  - **Then** the application automatically routes them to the `/my-assets` dashboard
  - **And** the left-hand navigation sidebar displays only the paths explicitly permitted for their role.

- **Scenario: Admin Route Bypass Attempt**
  - **Given** I am logged in as an Employee
  - **When** I attempt to bypass the UI by manually typing an admin URL (e.g., `/assets/hardware` or `/settings`)
  - **Then** the backend API rejects any data fetching via `canManageAssets` and `isGlobalAdmin` blocks.
  - **And** the frontend aggressively intercepts the route, displaying a 403 Forbidden error page.

### Technical Implementation Tasks

#### Frontend
- [x] Implement the role-aware Sidebar component that filters the standard navigation.
- [x] Implement post-login routing logic directing `Employee` roles to `/my-assets`.
- [x] Reuse the `403 Forbidden` error page component from Epic 2 for route interception.

#### Backend
- [x] Write strict backend guards ensuring all admin server actions (`getAssetsByPillar`, `getAssetDetailsById`, etc.) validate the JWT role and throw `Unauthorized` errors for Employees.

---

## User Story: US-12.2 — "My Assets" Dashboard

- **As a** Standard Employee,
- **I want** to log in and immediately see a clean list of the equipment assigned to me,
- **So that** I know exactly what corporate property I am currently responsible for.

### Acceptance Criteria (Gherkin)

- **Scenario: Viewing Active Assignments & Dynamic Icons**
  - **Given** I am logged into the Employee Portal
  - **When** the `/my-assets` dashboard loads
  - **Then** the backend executes `getCurrentEmployeeAssets()`
  - **And** I see a grid of Asset Cards representing the items currently assigned to me.
  - **And** the system dynamically renders an appropriate icon (e.g., Laptop, Software, Monitor) based on the asset's Pillar or a textual heuristic fallback.

- **Scenario: Mobile Responsiveness**
  - **Given** I access the portal on a smartphone
  - **When** the dashboard renders
  - **Then** the Asset Cards stack vertically (`grid-cols-1`) to fit the screen perfectly, utilizing Tailwind responsive utilities.

- **Scenario: Empty State Fallback**
  - **Given** I am a new employee with no active assignments
  - **When** I log in to the portal
  - **Then** the UI displays an Empty State component clearly indicating: "We couldn't find any hardware linked to your profile."

### UI/UX Specifications & Constraints

- **Read-Only UI:** The asset cards must be strictly read-only. Clicking on them should not open the complex Admin slide-out panel.

### Technical Implementation Tasks

#### Frontend
- [x] Build the `MyAssetsPage` layout with a responsive CSS Grid.
- [x] Build the `AssetCard` component displaying asset type icon, model name, status badge, and assigned date.
- [x] Build the `getAssetPresentation` utility to dynamically map DB pillars to React `lucide` icons.
- [x] Implement the `<Empty>` state fallback for users with 0 records.

#### Backend
- [x] Create the `getCurrentEmployeeAssets` Server Action fetching only records `WHERE assignedToUserId = currentUser.id` and filtering for specific valid states (`assigned`, `overdue`, `requested`).

---

## User Story: US-12.3 — Digital Acceptance & Rejection Workflow

- **As an** IT Administrator,
- **I want** employees to explicitly acknowledge when they receive new hardware, or securely report if something is wrong,
- **So that** I have a digital paper trail proving the asset was delivered and accepted under policy.

### Acceptance Criteria (Gherkin)

- **Scenario: Rendering the Alert Banner**
  - **Given** an IT Admin has assigned a new item to me in "Pending Approval" state
  - **When** I load the dashboard
  - **Then** the `EmployeeAlerts` component fetches `getPortalAlertsAction`
  - **And** renders an interactive banner asking me to review the pending item.

- **Scenario: Transactional Acceptance**
  - **Given** I click the "Review & Accept" button
  - **When** I confirm receipt via the `acceptAssignmentAction`
  - **Then** the backend validates the payload using Zod
  - **And** an atomic transaction updates the `asset_assignments` table to `state: 'assigned'` and `acceptanceStatus: 'accepted'`.
  - **And** marks the corresponding alert in `notificationQueue` as `isProcessed: true`.
  - **And** logs the exact change to the system Audit Log.

- **Scenario: Secure Rejection (Did Not Receive)**
  - **Given** I received an alert for an asset I do not physically possess
  - **When** I click to reject and provide a mandatory reason
  - **Then** the `rejectAssignmentAction` runs, returning the `asset_assignments` to `state: 'returned'` and `acceptanceStatus: 'rejected'`.
  - **And** automatically makes the main asset `status: 'Available'` again.
  - **And** appends my provided rejection reason into the assignment's database `notes`.

### Technical Implementation Tasks

#### Frontend
- [x] Build the `EmployeeAlerts` banner component integrating with the portal notification store.
- [x] Provide UI workflows for both Acceptance and Rejection with modal confirmations.

#### Backend
- [x] Build `acceptAssignmentAction` managing atomic updates for assignments and the notification queue.
- [x] Build `rejectAssignmentAction` including Zod validation for the mandatory rejection reason string.
- [x] Wire up Drizzle ORM transactions to guarantee state synchronicity between the `assets`, `asset_assignments`, and `notification_queue` tables.
- [x] Generate system Audit Logs (`logAuditActionTx`) on both acceptance and rejection.

---

## User Story: US-12.4 — Asset Return Reminders & Admin Requests

- **As a** Standard Employee,
- **I want** to see portal banners when a temporary loaner is expiring, or when IT explicitly requests a device back,
- **So that** I can back up my files and bring the device to the IT desk on time.

### Acceptance Criteria (Gherkin)

- **Scenario: Viewing Pending Alerts**
  - **Given** I have a pending return request triggered by an IT admin or an expected return date
  - **When** I log into the employee dashboard
  - **Then** the `getPortalAlertsAction` returns the active notification
  - **And** the `EmployeeAlerts` component renders a distinct visual banner prompting me to return the equipment.

### Technical Implementation Tasks

#### Frontend
- [x] Integrate the return reminder UI via the generic `EmployeeAlerts` wrapper.

#### Backend
- [x] Implement the `getPortalAlertsAction` resolving active alerts from the database for the specific user.