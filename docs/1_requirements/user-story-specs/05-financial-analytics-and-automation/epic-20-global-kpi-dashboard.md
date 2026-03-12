# Epic 20: Main KPI Dashboard

## Summary

This epic builds the primary "Command Center" landing page for the ITAM system. It replaces empty screens with immediate situational awareness, providing real-time metric cards, pending action counts, and a live feed of recent system activities. It is governed by strict Role-Based Access Control (RBAC), dynamically hiding sensitive financial metrics from standard IT Operators while providing Finance teams with high-level asset valuation data.

## In Scope

- A responsive Desktop/Mobile layout featuring a global Date Range picker.
- 4 top-row KPI Metric Cards with percentage-change indicators.
- Visual reporting charts (Bar Chart for Allocation, Donut Chart for Status).
- A "Recent Activities" log widget.
- Actionable data tables for "Overdue Returns/Pending Approvals" and "High-Maintenance Assets".
- Dynamic rendering logic based on user role (Global Admin, IT Operator, Finance).

## Out of Scope / Limitations

- Data Export: Downloading these metrics as PDFs or CSVs is pushed to Epic 21 (Standard Reporting).
- Custom Dashboards: Users cannot drag-and-drop or build their own custom widget layouts in this phase; the layout is fixed.

### User Stories

- [US-20.1 — KPI Widgets & Data Definitions](https://app.clickup.com/t/86ewvtbc3)
- [US-20.2 — Global Admin View (Full Access)](https://app.clickup.com/t/86ewvtbd8)
- [US-20.3 — IT Operator View (Operational Access)](https://app.clickup.com/t/86ewvtbeh)
- [US-20.4 — Finance View (Financial Access)](https://app.clickup.com/t/86ewvtbg2)
- [US-20.5 — Dashboard Interactions & Deep-Linking](https://app.clickup.com/t/86ewvtbhe)

---

## User Story: US-20.1 — KPI Widgets & Data Definitions

- As an IT Asset Manager,
- I want a centralized dashboard displaying real-time financial metrics, lifecycle visualizations, and actionable alerts,
- So that I can monitor the total value of our hardware, track departmental inventory distribution, and quickly resolve maintenance and return issues.

### Acceptance Criteria (Gherkin)

- Scenario: Top Row KPI Cards
  - Given the dashboard is loaded
  - Then the following 4 cards display aggregated data:
    1. Total Asset Value: Sum of `Current Book Value` for all active assets. Displays Month-over-Month (MoM) percentage change.
    2. Total Active Assets: Count of all assets where `Status IN ('Available', 'Assigned', 'New')`. Displays Week-over-Week (WoW) change.
    3. Assets in Repair: Count of all assets where `Status == 'In Repair'`. Displays the number of items pending vendor return.
    4. Expiring Software (30 Days): Count of software licenses with an expiration date < 30 days from today.
- Scenario: Middle Row Visualizations
  - Then the `Asset Allocation by Department` bar chart displays the count of assigned assets grouped by the `Department` of the active custodian.
  - And the `Current Inventory Status` donut chart displays the global distribution of lifecycle states (New, Assigned, Lost, In Repair, Disposed).
- Scenario: Bottom Row Actionable Tables
  - Then the `Overdue Returns` tab displays assets where `Expected Return Date < Today`, providing a quick "Send Reminder" action button.
  - And the `High-Maintenance Assets (Lemons)` table flags specific hardware with a `Repair Count >= 3`, providing a quick "Flag for Disposal" action button.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/10a97a5a-e631-444b-a5b4-f634f0a004eb/Dashboard%20-%20Desktop.png)

### Technical Implementation Tasks

#### Frontend

- [ ] Build the responsive dashboard layout with 3 rows: KPI Cards (top), Visualizations (middle), Actionable Tables (bottom).
- [ ] Build the 4 KPI Metric Card components displaying: primary value, MoM/WoW percentage change indicator (green arrow up / red arrow down), and a descriptive label.
- [ ] Integrate a charting library (e.g., Recharts, Chart.js, or ApexCharts) to render the `Asset Allocation by Department` bar chart and the `Current Inventory Status` donut chart.
- [ ] Build the bottom-row actionable data tables with tabs: `Overdue Returns` and `High-Maintenance Assets (Lemons)`.
- [ ] Add a global Date Range picker to the dashboard header for filtering all widgets by a selected time period.

#### Backend

- [ ] Create a `GET /api/v1/dashboard/kpis` endpoint returning aggregated KPI data: total asset value (with MoM delta), active asset count (with WoW delta), in-repair count, and expiring software count.
- [ ] Create a `GET /api/v1/dashboard/charts` endpoint returning: department allocation data (group by custodian department) and status distribution data (group by status).
- [ ] Create a `GET /api/v1/dashboard/overdue-returns` endpoint returning assets where `expected_return_date < CURRENT_DATE`.
- [ ] Create a `GET /api/v1/dashboard/high-maintenance` endpoint returning assets with a repair count ≥ 3 from the `MaintenanceTickets` table.
- [ ] Write optimized SQL aggregation queries with proper indexing to ensure dashboard load time stays under 2 seconds.

---

## User Story: US-20.2 — Global Admin View (Full Access)

- As a Global Admin,
- I want to see the complete, unrestricted version of the dashboard,
- So that I have total visibility over both the operational logistics and the financial health of the system.

### Acceptance Criteria (Gherkin)

- Scenario: Unrestricted Dashboard Rendering
  - Given I log in with the `Global Admin` role
  - When the dashboard loads
  - Then the `Total Asset Value` ($1.24M) card is fully visible.
  - And I have full access to view and interact with every widget, chart, and actionable table presented in US-20.1.

![](https://t90181861921.p.clickup-attachments.com/t90181861921/ac4920af-b1da-4e4b-9183-7523750f6104/Dashboard%20-%20Desktop.png)

### Technical Implementation Tasks

#### Frontend

- [ ] Ensure the Global Admin role renders all dashboard widgets without any conditional hiding.

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
  - And the top row adjusts dynamically to display the remaining 3 operational cards (Total Active Assets, Assets in Repair, Expiring Software) spanning the full width of the container.
- Scenario: Operational Tables
  - Then I have full access to the `Recent Activities`, `Overdue Returns`, and `High-Maintenance Assets` tables so I can perform my daily duties.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/61d625e3-9392-483c-8f0d-c70fa36d7de5/Dashboard%20IT%20ops%20-%20Desktop.png)

### Technical Implementation Tasks

#### Frontend

- [ ] Implement conditional rendering logic on the dashboard layout: hide the `Total Asset Value` KPI card when `user.role === 'ITOperator'` and adjust the CSS Grid to fill the remaining 3 cards at full width.

#### Backend

- [ ] Ensure the `GET /api/v1/dashboard/kpis` endpoint omits the `totalAssetValue` field from the response payload when the requesting JWT lacks financial permissions.

---

## User Story: US-20.4 — Finance View (Financial Access)

- As a Finance Manager,
- I want to see a dashboard focused on asset valuation, departmental distribution, and pending write-offs,
- So that I can monitor capital expenditure without being cluttered by operational IT tasks like software renewals or minor repairs.

### Acceptance Criteria (Gherkin)

- Scenario: Emphasizing Financial Data
  - Given I log in with the `Finance` role
  - When the dashboard loads
  - Then the `Total Asset Value` KPI card is prominently displayed.
  - And operational cards like `Expiring Software` and `Assets in Repair` are hidden.
  - And the `Asset Allocation by Department` bar chart is visible for cost-center analysis.
- Scenario: Tab Default Overrides
  - Then the bottom data table defaults to the `Pending Approvals` tab (showing pending disposals requiring financial sign-off) rather than the `Overdue Returns` tab.
  - And the operational `High-Maintenance Assets` table is hidden or replaced by a `Recent Write-Offs` summary.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/146a2fbf-749e-4a7e-bbf6-a537d892023a/Dashboard%20finance%20audit%20-%20Desktop.png)

### Technical Implementation Tasks

#### Frontend

- [ ] Implement Finance-role conditional rendering: show `Total Asset Value` card, hide `Expiring Software` and `Assets in Repair` cards, default bottom table to the `Pending Approvals` tab, and replace `High-Maintenance Assets` with `Recent Write-Offs`.

#### Backend

- [ ] Create a `GET /api/v1/dashboard/pending-approvals` endpoint returning pending disposal requests requiring financial sign-off.
- [ ] Create a `GET /api/v1/dashboard/recent-writeoffs` endpoint returning recently disposed assets with their write-off values.

---

## User Story: US-20.5 — Dashboard Interactions & Deep-Linking

- As a Dashboard User,
- I want to click on metrics and action buttons to jump directly to the relevant workflows,
- So that the dashboard acts as an interactive launchpad, not just a static picture.

### Acceptance Criteria (Gherkin)

- Scenario: Deep-Linking to Filtered Grids
  - Given I am viewing the dashboard
  - When I click the "Assets in Repair (34)" KPI card
  - Then I am navigated to `Operations > Maintenance & Repairs`.
  - And the grid is pre-filtered to the `Active Repairs` tab.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/a2fcd393-170d-4d37-a0db-a2847bcc199c/Dashboard%20-%20Desktop.png)
- Scenario: Inline Quick Actions
  - Given I am looking at the `Overdue Returns` widget
  - When I click the "Send Reminder" button next to User 1
  - Then the system queues an escalating reminder email (triggering the Epic 12/23 notification engine) and displays a success toast.
  - Given I am looking at the `High-Maintenance Assets` widget
  - When I click "Flag for Disposal" next to a Lemon asset
  - Then the Epic 17 "Initiate Disposal" modal opens directly over the dashboard.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/10f7fdcc-3c60-422f-b30e-75d03b6891a8/Dashboard%20-%20Desktop1.png)

### Technical Implementation Tasks

#### Frontend

- [ ] Implement URL deep-linking on KPI cards: clicking each card navigates to the corresponding Operations page with filter query parameters pre-applied (e.g., `/operations/maintenance?tab=active`).
- [ ] Bind the "Send Reminder" inline button to the `POST /api/v1/assets/{id}/request-return` endpoint and display a success toast.
- [ ] Bind the "Flag for Disposal" inline button to open the Epic 17 "Initiate Disposal" modal as an overlay on the dashboard.
