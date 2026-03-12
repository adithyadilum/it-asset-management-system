# Epic 12: Employee Portal & Digital Handshake

## Summary

This epic builds the Employee Portal, a simplified and highly restricted view of the IDAMS system intended for standard corporate users. It ensures that non-admin employees can only view the hardware explicitly assigned to them. Crucially, it introduces the "Digital Acceptance" workflow, requiring users to explicitly acknowledge receipt of new equipment, legally binding them to the company's IT acceptable use policy.

## In Scope

- Strict Role-Based Access Control (RBAC) enforcing a 403 Forbidden wall against admin routes.
- A mobile-responsive "My Assets" dashboard featuring asset cards.
- In-app notification banners for pending assignments and upcoming return dates.
- A "Digital Acceptance" modal with a mandatory acknowledgment checkbox.
- A "Report Issue / Did Not Receive" rejection pathway.

## Out of Scope / Limitations

- Self-Service Requests: The ability for an employee to browse a catalog and request _new_ assets, or log detailed IT support tickets, is deferred to a future epic. The "Service Requests" sidebar item will act as a disabled placeholder for now.
- Notification Delivery Infrastructure: While this epic defines the _business rules and triggers_ for when alerts should happen (e.g., escalating after 72 hours), the actual technical integration with SMTP servers and Microsoft Teams API to deliver those messages is deferred to the future Notifications & Alerts Epic. In this epic, the backend will merely log the events to a queue.

## Assumptions & Dependencies

- Assumes Epic 1 (Azure AD SSO) accurately maps standard employees to a `user_id` that matches the `Assigned To` field in the Assets database.

### User Stories

- [US-12.1 — Secure Portal Routing & Role Restriction](https://app.clickup.com/t/86ewvnqg3)
- [US-12.2 — "My Assets" Dashboard](https://app.clickup.com/t/86ewvnqg7)
- [US-12.3 — Digital Acceptance & Escalating Reminders](https://app.clickup.com/t/86ewvnqgg)
- [US-12.4 — Asset Return Reminders & Admin Requests](https://app.clickup.com/t/86ewvnqgn)

---

## User Story: US-12.1 — Secure Portal Routing & Role Restriction

- As a System Administrator,
- I want standard employees to be strictly confined to the Employee Portal,
- So that they cannot view, edit, or tamper with the global asset registry, financial ledgers, or admin dashboards.

### Acceptance Criteria (Gherkin)

- Scenario: Default Employee Login Routing
  - Given a user logs in via Microsoft SSO
  - When their system role resolves to "Standard Employee"
  - Then the application automatically routes them to the `/portal/my-assets` dashboard
  - And the left-hand navigation sidebar is heavily restricted, showing only "My Dashboard", "My Assets", and "Service Requests".
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/484ca4ab-d2ca-47c1-ab07-de7264aaecce/My-assets.png)
- Scenario: Admin Route Bypass Attempt
  - Given I am logged in as a Standard Employee
  - When I attempt to bypass the UI by manually typing an admin URL (e.g., `/registry/hardware` or `/settings`)
  - Then the backend API rejects any data fetching
  - And the frontend aggressively intercepts the route, displaying a full-screen 403 Forbidden error page stating "You do not have permission to view this directory."
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/f9ea167c-d752-44d2-89e4-63c36d722b64/Employee%20potal%20Error%20403%20Screen-%20Desktop.png)

### Technical Implementation Tasks

- [ ] Implement a React Higher-Order Component (HOC) or Route Guard (e.g., `<ProtectedRoute allowedRoles={['admin']} />`) around all Epic 6, 7, and 8 components.
- [ ] Write strict backend middleware ensuring API endpoints validate the JWT role before returning global asset arrays.

---

## User Story: US-12.2 — "My Assets" Dashboard

- As a Standard Employee,
- I want to log in and immediately see a clean list of the equipment assigned to me,
- So that I know exactly what corporate property I am currently responsible for.

### Acceptance Criteria (Gherkin)

- Scenario: Viewing Active Assignments
  - Given I am logged into the Employee Portal
  - When the dashboard loads
  - Then I see a "Welcome back, \[First Name\]" greeting
  - And I see a grid of Asset Cards representing the items currently assigned to me.
  - And each card displays the Asset Type (e.g., Laptop), an Icon/Image, the Model Name, Asset ID, Date Assigned, and an "Active" status badge.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/b0375786-7f41-4f89-b6b4-0fa3f37527e7/My-assets.png)
- Scenario: Mobile Responsiveness
  - Given I access the portal on a smartphone
  - When the dashboard renders
  - Then the sidebar collapses into a hamburger menu
  - And the Asset Cards stack vertically in a single column to fit the screen perfectly.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/73b62fa6-bd15-45df-8b67-854c71e8b2fe/Employee-Portal-Mobile.png)

### UI/UX Specifications & Constraints

- Read-Only UI: The asset cards must be strictly read-only. Clicking on them should not open the complex 700px Admin slide-out panel, as employees do not need to see depreciation values or MAC addresses.

### Technical Implementation Tasks

- [ ] Build the `EmployeeDashboard` React layout and responsive `AssetCard` components.
- [ ] Write a locked-down API endpoint (`GET /api/v1/my-assets`) that _forces_ the database query to filter strictly by the requesting user's ID (`WHERE assigned_to = jwt.user_id`).

---

## User Story: US-12.3 — Digital Acceptance & Escalating Reminders

- As an IT Administrator,
- I want employees to explicitly acknowledge when they receive new hardware, and be automatically reminded if they forget,
- So that I have a digital paper trail proving the asset was delivered, without having to manually chase users for a signature.

### Acceptance Criteria (Gherkin)

- Scenario: New Assignment Alert Banner & Initial Notification Trigger
  - Given an IT Admin has just assigned a new Monitor to me
  - When the system records the assignment
  - And when I log in, a prominent blue "Action Required" banner appears at the top of my dashboard.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/80677873-0864-45a8-927b-721117fe396c/Employee%20Portal%20-%20Desktop.png)
- Scenario: Escalating Reminder Engine (Trigger Logic)
  - Given an asset assignment is in a "Pending Acceptance" state
  - When 24 hours, 48 hours, and 72 hours pass without the user clicking "Confirm Receipt"
  - Then the system queues escalating reminder events for the Notification Engine.
  - And on the 72-hour event, the payload flags the issuing IT Admin.
- Scenario: Acknowledgment Checkbox & Confirmation
  - Given I click the "Review & Accept" button
  - When I check the mandatory acknowledgment box
  - Then the "Confirm Receipt" button becomes active
  - And clicking it updates the asset's assignment status to "Confirmed", which will permanently halt the queued reminders.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/fa5c4519-0175-4266-95b7-b51a30576983/Confirm-reciept.png)

### Technical Implementation Tasks

- [ ] Build the Acceptance Modal component and checkbox validation logic.
- [ ] Write the backend endpoint (`POST /api/v1/assignments/{id}/accept`) to log the digital signature timestamp.
- [ ] _Mock/Stub_ a notification queue table in the database where the system can log `PENDING_ACCEPTANCE` and `REMINDER_ESCALATED` events, ready for the future Notification Service to consume.

---

## User Story: US-12.4 — Asset Return Reminders & Admin Requests

- As a Standard Employee,
- I want to see portal banners when a temporary loaner is expiring, or when IT explicitly requests a device back,
- So that I can back up my files and bring the device to the IT desk on time.

### Acceptance Criteria (Gherkin)

- Scenario: Scheduled Return Alert
  - Given I have a device assigned to me with an "Expected Return Date" of Feb 28, 2026
  - When the current date falls within 14 days of that return date
  - Then a prominent yellow "Reminder" banner appears on my dashboard
  - And the system queues an `UPCOMING_RETURN` event for the future Notification Engine.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/7fa0b4d6-094f-4d45-968d-abe03514ddff/Employee%20Portal%20-%20Desktop%20(1).png)
- Scenario: Admin-Initiated Return Request (Ad-Hoc)
  - Given an IT Admin manually clicks the "Request Return" button on my laptop from their Admin interface (Epic 14 feature)
  - When the action is triggered
  - Then the system queues an `URGENT_RETURN_REQUESTED` event
  - And a red "Urgent Action Required" banner instantly appears on my Employee Dashboard stating: "IT has requested the immediate return of \[Asset Name\]."
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/36dfdcb9-6bfa-431b-a821-d7d859e06bf1/Employee%20Portal%20-%20Desktop%20(2).png)

### Technical Implementation Tasks

- [ ] Conditionally render the yellow and red alert banners on the Employee Dashboard based on assignment statuses.
- [ ] Build WebSocket or polling logic on the frontend to display the Admin-Initiated "Request Return" banner in real-time.
- [ ] Ensure the backend logic for date-math correctly flags records so the future Notification Engine knows which ones require emails.
