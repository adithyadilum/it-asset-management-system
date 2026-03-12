# Epic 23: Automated Alerts & Notification

## Summary

This epic builds the proactive communication layer of the ITAM system. It introduces a user-facing Notification Center (Inbox) for in-app alerts, and an administrative Settings interface to configure specific trigger rules and delivery channels (In-App, Email, MS Teams). Behind the scenes, it utilizes both event-driven triggers (for immediate actions like Disposal Requests) and a scheduled CRON engine (for time-based warnings like expiring warranties).

## In Scope

- Global Notification Center (Bell Icon) dropdown with unread badges and deep-linking.
- `Settings > Alerts & Notifications` configuration page.
- Event-driven triggers (e.g., Role elevation, new disposal requests).
- CRON-driven scheduled triggers (e.g., Warranty Expiration, Past-Due Repairs).
- Multi-channel delivery routing (In-App, Email, MS Teams integration).

## Out of Scope / Limitations

- Vendor API Sync: Automatically pinging Dell or HP to fetch updated warranty dates is deferred to a future Phase 2 epic.
- Custom Webhooks: Users cannot build custom JSON webhooks to third-party apps outside of the native Email and MS Teams channels.

### User Stories

- [US-23.1 — The Notification Center (Inbox)](https://app.clickup.com/t/86ewvyudf)
- [US-23.2 — Alert Configuration & Multi-Channel Delivery](https://app.clickup.com/t/86ewvyufd)
- [US-23.3 — The Scheduled CRON Engine](https://app.clickup.com/t/86ewvyug9)
- [US-23.4 — External Dispatch (Email & Teams Integration)](https://app.clickup.com/t/86ewvyuhn)

---

## User Story: US-23.1 — The Notification Center (Inbox)

- As a System User,
- I want a dedicated Notification Center within the application header,
- So that I can quickly view unread system alerts, see when they occurred, and navigate directly to the affected items.

### Acceptance Criteria (Gherkin)

- Scenario: Receiving an In-App Notification
  - Given a background event triggers an alert assigned to my user ID
  - When I look at the top navigation bar
  - Then the Bell icon displays a numeric badge representing my unread alerts.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/fc9814a4-6900-414a-aacc-71279aafd084/Alerts%20%26%20Notifications%20Settings%20-%20Desktop1.png)
- Scenario: Viewing the Inbox Dropdown
  - Given I click the Bell icon
  - Then a dropdown menu appears listing my recent notifications.
  - And each item displays the alert message (e.g., "Asset AST-LAP-089 requires your approval for disposal.") and a relative timestamp (e.g., "2 hours ago").
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/d2efc6a7-824e-4907-8377-01f5cbdb1101/Notifications%20-%20Desktop2.png)
- Scenario: Deep-Linking & Mark as Read
  - Given the dropdown is open
  - When I click directly on an alert item
  - Then the system navigates me to the exact workflow or slide-out panel associated with that alert.
  - And the individual alert is marked as "Read" and the badge count decreases.
- Scenario: Bulk Action
  - When I click the "Mark all as read" button at the bottom of the dropdown
  - Then all pending notifications are cleared from the active unread state.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/a5d65565-0389-478a-943d-1dafadbb976e/Notifications%20-%20Desktop3.png)

### UI/UX Specifications & Constraints

- Scrollable Container: The notification dropdown must have a fixed maximum height (e.g., `400px`) with `overflow-y: auto` to prevent it from growing off-screen if a user has 50 unread alerts.
- Visual Hierarchy: Unread alerts should have a distinct visual cue (e.g., a subtle blue background or a bold font) that disappears once the item is marked as read.

### Technical Implementation Tasks

- [ ] Create an `AppNotifications` database table mapping `user_id`, `message`, `target_url`, `is_read`, and `created_at`.
- [ ] Build the Notification Center Dropdown UI component with relative time-formatting logic (e.g., using `date-fns` formatDistanceToNow).

---

## User Story: US-23.2 — Alert Configuration & Multi-Channel Delivery

- As a Global Admin,
- I want to configure exactly which events trigger alerts and where they are sent,
- So that the IT team isn't spammed with unnecessary emails, but critical warnings hit MS Teams immediately.

### Acceptance Criteria (Gherkin)

- Scenario: Configuring Hardware Lifecycle Alerts
  - Given I navigate to `Settings > Alerts & Notifications`
  - When I locate the "Warranty Expiration Warning" rule
  - Then I can toggle the master switch to "On".
  - And I can set the threshold parameter from a dropdown (e.g., "30 days Before Expiry").
  - And I can use checkboxes to define the specific delivery channels: `In-App`, `Email`, and/or `MS Teams`.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/829b4d23-6025-418f-8153-f66796a30615/Alerts%20%26%20Notifications%20Settings%20-%20Desktop.png)
- Scenario: Configuring Operational & Security Triggers
  - Given I am on the Settings page
  - Then I can independently configure event-based triggers, such as "New Disposal Request Pending Approval" and "User Role Elevated to Global Admin".

### UI/UX Specifications & Constraints

- Categorized Layout: The settings page must separate rules into logical blocks using cards or dividers (e.g., `Hardware Lifecycle`, `Operational Workflows`, `Security & Audits`) so the page remains scannable.

### Technical Implementation Tasks

- [ ] Build the `Alerts & Notifications` settings UI.
- [ ] Create a `NotificationRules` configuration table in the database to store the toggle states, threshold integers, and boolean channel mappings.

---

## User Story: US-23.3 — The Scheduled CRON Engine

- As a System Architect,
- I want a background service to query the database daily,
- So that time-based alerts (like expiring warranties or overdue repairs) are automatically calculated and dispatched without human intervention.

### Acceptance Criteria (Gherkin)

- Scenario: Warranty Alert Generation
  - Given a Server's warranty expires on `April 15`
  - And the Alert Settings threshold is set to `30 days`
  - When the scheduled nightly CRON job runs on `March 16`
  - Then the engine detects the match and fires the alert payload to the configured channels (In-App, Email, Teams).
- Scenario: Overdue Repair Detection
  - Given an active repair ticket has an `Expected Return Date` of yesterday
  - When the CRON job executes
  - Then the system detects the overdue status and pushes an alert directly to the specific IT Admin who dispatched the repair.

### Technical Implementation Tasks

- [ ] Configure a background Scheduler service (e.g., Azure Functions, AWS EventBridge, or Node-cron) to run queries during off-peak hours.
- [ ] Write the specific threshold queries comparing `CURRENT_DATE` against `warranty_expiry` and `expected_return_date`.

---

## User Story: US-23.4 — External Dispatch (Email & Teams Integration)

- As an IT Team Member,
- I want critical alerts pushed to my Microsoft Teams channel and Email inbox,
- So that I don't have to keep the ITAM application open all day just to see if a disposal request needs my approval.

### Acceptance Criteria (Gherkin)

- Scenario: External Routing
  - Given an event fires and its rule has `Email` and `MS Teams` checked
  - When the backend dispatcher receives the payload
  - Then it formats an HTML email and sends it via the configured SMTP server.
  - And it formats a JSON card payload and POSTs it to the configured MS Teams Webhook URL.
- Scenario: Delivery Failure Resilience
  - Given the corporate SMTP server is temporarily offline
  - When the system attempts to send an alert email
  - Then the system implements exponential backoff retry logic to ensure the alert is eventually delivered when the server recovers.

### Technical Implementation Tasks

- [ ] Implement an Email dispatch service (e.g., SendGrid, AWS SES) with exponential backoff logic.
- [ ] Implement an MS Teams webhook integration service to push formatted Adaptive Cards to designated channels.