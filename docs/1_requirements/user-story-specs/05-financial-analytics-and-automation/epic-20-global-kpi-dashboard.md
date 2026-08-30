# Epic 20: Main KPI Dashboard

## Summary

This epic builds the primary "Command Center" landing page for the ITAM system. It replaces empty screens with immediate situational awareness, providing real-time metric cards, pending action counts, and live system activities. It is governed by strict Role-Based Access Control (RBAC), dynamically rendering entirely different widget layouts and hiding sensitive financial metrics from standard IT Operators while providing Finance teams with high-level asset valuation and optimization data.

## In Scope

- A responsive layout featuring a live Refresh tracker and Quick Actions menu.
- Role-specific KPI Metric Cards with dynamic currency conversion (LKR/USD).
- Visual reporting charts (Bar Chart for Allocation, Donut Chart for Status).
- A "Recent Activities" log widget.
- Actionable data tables (`Overdue Returns`, `Pending Disposals`, `High-Maintenance Assets`, `Software Seat Cost Optimization`, `Asset Write-offs`).
- Dynamic rendering logic and table swapping based on user role (Global Admin, IT Operator, Financial Auditor).

## Out of Scope / Limitations

- Date Range Picker: Filtering the entire dashboard by an arbitrary date range is out of scope; metrics represent the real-time, current state.
- Data Export: Downloading these metrics as PDFs or CSVs is pushed to Epic 21 (Standard Reporting).
- Custom Dashboards: Users cannot drag-and-drop or build their own custom widget layouts in this phase; the layout is fixed per role.

### User Stories

- [US-20.1 — KPI Widgets & Data Definitions](#user-story-us-201--kpi-widgets--data-definitions)
- [US-20.2 — Global Admin View (Full Access)](#user-story-us-202--global-admin-view-full-access)
- [US-20.3 — IT Operator View (Operational Access)](#user-story-us-203--it-operator-view-operational-access)
- [US-20.4 — Finance View (Financial Access)](#user-story-us-204--finance-view-financial-access)
- [US-20.5 — Dashboard Interactions & Deep-Linking](#user-story-us-205--dashboard-interactions--deep-linking)

---

## User Story: US-20.1 — KPI Widgets & Data Definitions

- As an IT Asset Manager,
- I want a centralized dashboard displaying real-time financial metrics, lifecycle visualizations, and actionable alerts,
- So that I can monitor the total value of our hardware, track departmental inventory distribution, and quickly resolve maintenance and return issues.

### Acceptance Criteria (Gherkin)

- Scenario: Top Row KPI Cards
  - Given the dashboard is loaded
  - Then up to 4 cards display aggregated data (based on role permissions):
    1. Total Asset Value: Sum of `Current Book Value` for all active assets. Dynamically converted to the user's preferred currency (LKR/USD) using live exchange rates.
    2. Total Active Assets: Count of all assets in active statuses.
    3. Assets in Repair: Count of all assets currently in maintenance.
    4. Expiring Software: Count of software licenses nearing expiration.

- Scenario: Middle Row Visualizations
  - Then the `Department Allocation` bar chart displays the count of assigned assets grouped by department.
  - And the `Inventory Status` donut chart displays the global distribution of lifecycle states alongside the global Utilization Rate.
  - And the `Recent Activities` list displays a feed of the latest audit logs.

- Scenario: Bottom Row Actionable Tables
  - Then a dual-pane table layout displays role-specific operational or financial data.
  - And tables like `Overdue Returns` provide a quick "Send Reminder" action button.
  - And tables like `High-Maintenance Assets` flag specific hardware, providing a quick "Flag for Disposal" action button.

### Technical Implementation Tasks

#### Frontend

- [x] Build the responsive dashboard layout with 3 rows: KPI Cards (top), Visualizations (middle), Data Tables (bottom).
- [x] Build the `DashboardHeader` with a manual refresh button and live "Last refreshed X time ago" indicator.
- [x] Integrate charting components for `DepartmentAllocationChart` and `InventoryStatusChart`.
- [x] Build the `DataTablesContainer` supporting a left pane (with tabs) and a right pane.

#### Backend

- [x] Create a backward-compatible `getDashboardBatchData` server action that delegates to role-specific operations (`getAdminDashboardData`, `getITDashboardData`, `getFinanceDashboardData`).
- [x] Write optimized SQL aggregation queries (using Drizzle) to ensure dashboard load times stay under 2 seconds.

---

## User Story: US-20.2 — Global Admin View (Full Access)

- As a Global Admin,
- I want to see the complete, unrestricted version of the dashboard,
- So that I have total visibility over both the operational logistics and the financial health of the system.

### Acceptance Criteria (Gherkin)

- Scenario: Unrestricted Dashboard Rendering
  - Given I log in with the `Global Admin` role
  - When the dashboard loads
  - Then all 4 KPI Cards are visible (`Total Asset Value`, `Total Active Assets`, `Assets in Repair`, `Expiring Software`).
  - And the middle row displays all 3 widgets: `Department Allocation`, `Inventory Status`, and `Recent Activities`.
  - And the left data table section displays tabs for `Overdue Returns` and `Pending Disposals`.
  - And the right data table section displays `High-Maintenance Assets`.

### Technical Implementation Tasks

#### Frontend

- [x] Render `AdminDashboardView` mapping to the specific layout rules and passing down currency exchange rates.

---

## User Story: US-20.3 — IT Operator View (Operational Access)

- As an IT Operator,
- I want to see a dashboard focused entirely on logistics and hardware health, with sensitive financial totals hidden,
- So that I can focus on my daily tasks (repairs, returns, assignments) without accessing corporate financial data.

### Acceptance Criteria (Gherkin)

- Scenario: Hiding Financial Metrics
  - Given I log in with the `IT Operator` role
  - When the dashboard loads
  - Then the `Total Asset Value` KPI card is completely removed from the DOM.
  - And the middle row adjusts to a 2-column CSS Grid, displaying only `Department Allocation` and `Inventory Status` (hiding `Recent Activities`).
  - And the left data table section displays ONLY the `Overdue Returns` tab (omitting pending disposals).
  - And the right data table section displays `High-Maintenance Assets`.

### Technical Implementation Tasks

#### Frontend

- [x] Render `ITDashboardView`, omitting financial data structures.
- [x] Adjust the CSS grid (`grid-cols-1 lg:grid-cols-2`) for the middle row visualizations.

#### Backend

- [x] Ensure `getITDashboardData` strictly omits sensitive payloads (returns empty arrays for ledgers, disposals, and activities).

---

## User Story: US-20.4 — Finance View (Financial Access)

- As a Financial Auditor,
- I want to see a dashboard focused on asset valuation, write-offs, and software optimization,
- So that I can monitor capital expenditure without being cluttered by minor hardware repairs or overdue return logistics.

### Acceptance Criteria (Gherkin)

- Scenario: Emphasizing Financial Data
  - Given I log in with the `Financial Auditor` role
  - When the dashboard loads
  - Then the KPI metrics strictly focus on financial indicators.
  - And the middle row displays all 3 widgets: `Department Allocation`, `Inventory Status`, and `Recent Activities`.
  - And the bottom left data table section displays tabs for `Top High-Value Assets` and `Asset Write-offs` (replacing operational tabs).
  - And the bottom right data table section displays `Software Seat Cost Optimization` (replacing the lemons table).

### Technical Implementation Tasks

#### Frontend

- [x] Render `FinanceDashboardView`, passing down `apiRates` and `currencyCode` for cross-currency ledger formatting.
- [x] Map the `useTopHighValueAssetsColumns`, `useWriteOffsColumns`, and `useSoftwareOptimizationColumns` hooks to the data tables.

#### Backend

- [x] Create the `getFinanceDashboardData` fetcher returning aggregated data for write-offs, highest-value active assets, and software license utilization vs. cost.

---

## User Story: US-20.5 — Dashboard Interactions & Deep-Linking

- As a Dashboard User,
- I want to click on action buttons to jump directly to the relevant workflows,
- So that the dashboard acts as an interactive launchpad, not just a static picture.

### Acceptance Criteria (Gherkin)

- Scenario: Inline Quick Actions (Operational)
  - Given I am looking at the `Overdue Returns` widget (as Admin/IT)
  - When I click the "Send Reminder" button next to an assignment
  - Then the system triggers the `sendAssignmentReminderAction` and displays a success toast.
  - Given I am looking at the `High-Maintenance Assets` widget
  - When I click "Flag for Disposal" next to a Lemon asset
  - Then the Epic 17 "Initiate Disposal" modal opens directly over the dashboard via the `DisposeAssetsRequestDialog`.

### Technical Implementation Tasks

#### Frontend

- [x] Bind the "Send Reminder" inline button to the `sendAssignmentReminderAction` server action.
- [x] Embed the `DisposeAssetsRequestDialog` component in the admin and IT views, hooked to the "Flag for Disposal" action button.
