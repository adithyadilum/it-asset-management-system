# Epic 23: Automated Alerts & Notification

## Summary

This epic builds the proactive communication layer of the ITAM system. It introduces a user-facing Notification Center (Inbox) for in-app alerts, and an administrative Settings interface to configure specific trigger rules and delivery channels (In-App, Email, MS Teams). Behind the scenes, it utilizes both event-driven triggers (for immediate actions like Disposal Requests) and a scheduled CRON engine powered by Upstash QStash (for time-based warnings like expiring warranties or overdue returns).

## In Scope

- Global Notification Center (Bell Icon) dropdown with unread badges, deep-linking, and SWR polling.
- `Settings > Alerts & Notifications` configuration page.
- External Service Integrations section for Resend API and MS Teams Webhook setup.
- Event-driven triggers (e.g., Role elevation, new disposal requests).
- CRON-driven scheduled triggers (e.g., Warranty Expiration, Past-Due Repairs, Upcoming Returns, Pending Acceptance Escalation).
- Multi-channel delivery routing (In-App, Email via Resend, MS Teams Adaptive Cards).

## Out of Scope / Limitations

- Vendor API Sync: Automatically pinging Dell or HP to fetch updated warranty dates is deferred to a future Phase 2 epic.
- Custom Webhooks: Users cannot build custom JSON webhooks to third-party apps outside of the native Email and MS Teams channels.

### User Stories

- [US-23.1 — The Notification Center (Inbox)](#user-story-us-231--the-notification-center-inbox)
- [US-23.2 — Alert Configuration & Multi-Channel Delivery](#user-story-us-232--alert-configuration--multi-channel-delivery)
- [US-23.3 — The Scheduled CRON Engine](#user-story-us-233--the-scheduled-cron-engine)
- [US-23.4 — External Dispatch (Email & Teams Integration)](#user-story-us-234--external-dispatch-email--teams-integration)

---

## User Story: US-23.1 — The Notification Center (Inbox)

- As a System User,
- I want a dedicated Notification Center within the application header,
- So that I can quickly view unread system alerts, see when they occurred, and navigate directly to the affected items.

### Acceptance Criteria (Gherkin)

- Scenario: Receiving an In-App Notification
  - Given a background event triggers an alert assigned to my user ID
  - When I look at the top navigation bar
  - Then the Bell icon displays a numeric badge representing my unread alerts, updating via real-time SWR polling.
- Scenario: Viewing the Inbox Dropdown
  - Given I click the Bell icon
  - Then a dropdown menu appears listing my recent notifications.
  - And each item displays the alert message and a relative timestamp (e.g., "2 hours ago").
- Scenario: Deep-Linking & Mark as Read
  - Given the dropdown is open
  - When I click directly on an alert item
  - Then the system navigates me to the exact workflow or slide-out panel associated with that alert.
  - And the individual alert is marked as "Read" and the badge count decreases via optimistic UI updates.
- Scenario: Bulk Action
  - When I click the "Mark all as read" button at the bottom of the dropdown
  - Then all pending notifications are cleared from the active unread state.

### Technical Implementation Tasks

#### Frontend

- [x] Build the Notification Center Bell icon component (`NotificationBell`) in the global header with a numeric unread badge.
- [x] Build the Notification Dropdown UI (`NotificationDropdown`): scrollable container, individual notification items with: message text, relative timestamp, unread visual cue, and a "Mark all as read" footer button.
- [x] Implement deep-linking on notification item click: navigate to the `target_url` and call the mark-as-read API.
- [x] Implement SWR polling (`use-notifications.ts`) to fetch the unread count every 30 seconds to reflect new notifications without page refresh.

#### Backend

- [x] Create a `getNotifications` server action returning the authenticated user's notifications, sorted by `created_at DESC`, with pagination.
- [x] Create a `getUnreadCount` server action returning the count of unread notifications for badge rendering.
- [x] Create a `markAsRead` server action to mark an individual notification as read.
- [x] Create a `markAllAsRead` server action to mark all of the user's notifications as read in a single operation.

#### Database

- [x] Create an `app_notifications` table with columns: `id`, `user_id` (FK → Users, indexed), `message` (text), `target_url` (the deep-link path), `is_read` (boolean, default `false`), `event_type` (ENUM), `created_at`.

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
- Scenario: Configuring Operational & Security Triggers
  - Given I am on the Settings page
  - Then I can independently configure event-based triggers, such as "New Disposal Request Pending Approval" and "User Role Elevated to Global Admin".

### Technical Implementation Tasks

#### Frontend

- [x] Build the `AlertsSettingsClient` settings page with categorized sections: Hardware Lifecycle, Operational Workflows, Security & Audits.
- [x] For each notification rule, render: master toggle switch, threshold parameter dropdown (where applicable), and channel checkboxes (In-App, Email, MS Teams).

#### Backend

- [x] Create RESTful API endpoints for notification rules: `GET /api/v1/settings/notification-rules` (list all rules with their current config) and `PUT /api/v1/settings/notification-rules/{id}` (update a specific rule's toggle, threshold, and channel settings).

#### Database

- [x] Create a `notification_rules` table mapping `rule_key` (UNIQUE), `display_name`, `category`, `is_enabled`, `threshold_days`, `channel_in_app`, `channel_email`, and `channel_teams`.

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

#### Backend

- [x] Configure a background Scheduler endpoint (`/api/qstash/cron/route.ts`) verified via Upstash QStash signatures to execute alert-checking jobs.
- [x] Write a `warrantyExpiryCheck` job: query assets where `warranty_expiry - CURRENT_DATE <= threshold_days` and alert global admins and IT operators (with deduplication).
- [x] Write an `overdueRepairCheck` job: query `maintenance_tickets` where `status = 'ACTIVE'` AND `estimated_return_date < CURRENT_DATE`, alert the dispatching admin.
- [x] Write an `overdueReturnCheck` job: query assignments where `expected_return_date < CURRENT_DATE` AND `state IN ('assigned', 'overdue')`, alert the assigning admin.
- [x] Write a `pendingAcceptanceEscalation` job: escalate unacknowledged assignments at 24h, 48h, and 72h thresholds.
- [x] Write an `upcomingReturnCheck` job: remind employees 14 days before their asset is expected to be returned.
- [x] Implement deduplication utilizing the `notification_logs` table.

#### Infrastructure / DevOps

- [x] Deploy the CRON scheduler endpoint via Upstash QStash native scheduler using verified signing keys (`QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY`).

---

## User Story: US-23.4 — External Dispatch (Email & Teams Integration)

- As an IT Team Member,
- I want critical alerts pushed to my Microsoft Teams channel and Email inbox,
- So that I don't have to keep the ITAM application open all day just to see if a disposal request needs my approval.

### Acceptance Criteria (Gherkin)

- Scenario: External Routing
  - Given an event fires and its rule has `Email` and `MS Teams` checked
  - When the backend dispatcher receives the payload
  - Then it formats an HTML email and sends it via the Resend API.
  - And it formats a JSON card payload and POSTs it to the configured MS Teams Webhook URL.
- Scenario: Testing Connections
  - Given I am on the `Settings > Alerts & Notifications` page
  - When I input my Resend API Key and MS Teams Webhook URL
  - Then I can click "Test Connection" to immediately fire a diagnostic payload to the respective service to verify the configuration is valid.

### Technical Implementation Tasks

#### Backend

- [x] Implement an Email dispatch service using the `Resend` provider with the official `resend` SDK.
- [x] Implement an MS Teams webhook integration service that formats notification payloads as MS Teams Adaptive Card JSON (`@type: 'MessageCard'`) and POSTs to the configured Incoming Webhook URL.
- [x] Create server actions (`saveIntegrationSettings`, `testIntegrationConnection`, `getIntegrationStatus`) to securely encrypt and store credentials in the `integration_settings` table.

#### Frontend

- [x] Add an "External Service Integrations" section directly to the Alerts Settings page to input and test the Resend API Key and MS Teams Webhook URL.
- [x] Mask existing credentials with `••••••••` to prevent exposure.