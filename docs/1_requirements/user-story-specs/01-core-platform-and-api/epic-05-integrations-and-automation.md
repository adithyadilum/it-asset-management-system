# Epic 5: Third-Party Integrations & Automation

## Summary

This epic connects the IDAMS platform to the broader corporate software ecosystem (such as HRIS, ServiceNow, or Slack). It provides secure, programmatic access for external tools to read hardware data, and introduces an automated Webhook engine that pushes real-time alerts to other systems whenever an asset's status changes.

## In Scope

- Secure API Key generation, masking, and revocation interface.
- A rate-limited, read-only REST API gateway for external data consumption.
- An Outbound Webhook configuration engine to dispatch HTTP POST payloads on specific system events.
- OpenAPI / Swagger documentation generation.

## Out of Scope / Limitations

- Bi-Directional API Syncing: The Open API is primarily Read-Only and Trigger-based; full, active bi-directional data syncing (e.g., IDAMS actively pulling and overwriting its own data from Workday) is out of scope for Phase 1.
- Standard Employees and IT Operators cannot access the Integrations dashboard.

## Assumptions & Dependencies

- External third-party systems are capable of consuming standard JSON payloads and authenticating via Bearer Tokens in the HTTP header.

### User Stories

- [US-5.1 — Secure API Key Management](https://app.clickup.com/t/86ewvd4vy)
- [US-5.2 — External Data Consumption (Open API)](https://app.clickup.com/t/86ewvd4wa)
- [US-5.3 — Automated Outbound Webhooks](https://app.clickup.com/t/86ewvd4wf)

---

## User Story: US-5.1 — Secure API Key Management

- As a Global Admin,
- I want to generate and revoke secure API keys from a dedicated Integrations dashboard,
- So that I can grant external systems (like the HR portal) programmatic access to our asset data without sharing an employee's actual password.

### Acceptance Criteria (Gherkin)

- Scenario: Generating a "Show-Once" Key
  - Given I am in the Integrations Settings tab
  - When I click "Generate New API Key" and name it "Workday HRIS"
  - Then the system generates the token and displays the secret key exactly once on the screen
  - And stores only a hashed, unreadable version of the key in the database.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/2e483e87-df2b-47a9-a8bc-af38e8e81074/Integrations%20API%20-%20Desktop.png)
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/bb7b30de-3efb-4ca3-802d-f24716c9e267/Integrations%20API%20Key%20gen%20modal%20-%20Desktop.png)
- Scenario: Revoking a Compromised Key
  - Given a third-party key is suspected of being leaked
  - When I click "Revoke" on the "Workday HRIS" key
  - Then the key is instantly invalidated
  - And any subsequent API requests attempting to use that key are met with a `401 Unauthorized` error.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/48c1c048-2618-4a4d-a1be-8bde09aea9c0/Integrations%20API%20Key%20revoke%20modal%20-%20Desktop.png)

### UI/UX Specifications & Constraints

- The "Reveal" UI: When a key is generated, it must be displayed inside a prominent, monospace-font text box with a "Copy to Clipboard" button. A red or yellow warning banner must state: _"Please copy this key and store it securely. For security reasons, you will never be able to view it again."_
- Data Grid Masking: In the main API Key list, existing tokens must be masked (e.g., `tiq_live_****************8f92`), showing only the prefix and the last 4 characters.
- Revocation Warning: Clicking "Revoke" must trigger a severe red confirmation modal warning the admin that connected external systems will immediately break.

### Technical Implementation Tasks

#### Frontend

- [ ] Build the API Key management data grid page within the Settings/Integrations module, displaying: Key Name, Masked Key, Created Date, Last Used, and Status.
- [ ] Build the "Generate New API Key" modal with a Key Name input and a "show-once" key reveal UI (monospace text box + "Copy to Clipboard" button + warning banner).
- [ ] Build the "Revoke Key" confirmation modal with destructive-action styling and a clear warning message.
- [ ] Implement the key masking display logic: show only the prefix and last 4 characters of each key.

#### Backend

- [ ] Implement cryptographically secure API key generation using a random string prefixed for identification (e.g., `idams_live_{random}`).
- [ ] Implement secure hashing logic (bcrypt or Argon2) to store only the hashed version of the key in the database — the plaintext is returned only once during generation.
- [ ] Create a `POST /api/v1/api-keys` endpoint for key generation that returns the plaintext key in the response body.
- [ ] Create a `DELETE /api/v1/api-keys/{id}` endpoint for key revocation that invalidates the key immediately.
- [ ] Write middleware to authenticate incoming external API requests by comparing the `Authorization: Bearer {key}` header against hashed keys in the database.

#### Database

- [ ] Create an `ApiKeys` table with columns: `id`, `name`, `key_hash`, `key_prefix`, `key_suffix` (last 4 chars for display), `created_by` (FK → Users), `last_used_at`, `is_revoked` (boolean), `created_at`.

---

## User Story: US-5.2 — External Data Consumption (Open API)

- As a Third-Party System Developer,
- I want to securely query a REST API to find out what assets belong to a specific user,
- So that our HR offboarding system automatically knows if a terminating employee still possesses company hardware.

### Acceptance Criteria (Gherkin)

- Scenario: Secure Data Fetch
  - Given I have a valid, system-generated API Token
  - When I send a `GET` request to `/api/v1/external/assets/user/{employee_id}`
  - Then the API authenticates the token and returns a JSON array of active assigned assets.
- Scenario: Rate Limiting Enforcement
  - Given a misconfigured external script is sending 100 requests per second using my API key
  - When the traffic exceeds the configured system threshold
  - Then the API temporarily blocks the IP/Token and responds with a `429 Too Many Requests` error to protect the database.

### UI/UX Specifications & Constraints

- Documentation Link: The Integrations dashboard must feature a prominent button or link labeled "View API Documentation" that routes the user to the auto-generated Swagger UI.

### Technical Implementation Tasks

#### Frontend

- [ ] Add a "View API Documentation" button/link on the Integrations dashboard that navigates to the Swagger UI.

#### Backend

- [ ] Implement Token Authentication middleware for the `/api/v1/external/*` route group that validates API keys against hashed values in the database.
- [ ] Implement rate-limiting middleware (e.g., using `express-rate-limit` or Redis-backed sliding window) scoped per API key and/or IP address, returning `429 Too Many Requests` on threshold breach.
- [ ] Create read-only endpoints: `GET /api/v1/external/assets`, `GET /api/v1/external/assets/{id}`, `GET /api/v1/external/assets/user/{employee_id}`, and `GET /api/v1/external/assignments`.
- [ ] Integrate Swagger/OpenAPI auto-generation library to produce interactive API documentation from route definitions.
- [ ] Update the `last_used_at` timestamp on the `ApiKeys` record each time a key is successfully authenticated.

#### Infrastructure / DevOps

- [ ] Configure rate-limiting thresholds as environment variables (e.g., `API_RATE_LIMIT_PER_MINUTE=60`) so they can be tuned per deployment environment.

---

## User Story: US-5.3 — Automated Outbound Webhooks

- As an IT Operations Manager,
- I want the system to automatically send a digital alert to our Helpdesk tool (like Jira or ServiceNow) whenever an asset is marked as "Defective,"
- So that my team does not have to waste time manually double-entering repair tickets across two different platforms.

### Acceptance Criteria (Gherkin)

- Scenario: Configuring a Webhook
  - Given I am in the Integrations dashboard
  - When I click "Add Webhook", paste a target URL, and check the box for `[asset.status_changed]`
  - Then the system registers the subscription to that specific system event.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/d5bd5244-7740-45f2-acbb-060954c99c43/Integrations%20Webhooks%20-%20Desktop.png)
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/a381b7c0-bb2b-4c15-bddd-87d78203a245/Integrations%20Webhooks%20Configure%20modal%20-%20Desktop.png)
- Scenario: Firing a Webhook on Event Trigger
  - Given a webhook URL is successfully registered for the "Asset_Assigned" event
  - When an IT Admin assigns a laptop to a user via the main UI
  - Then the backend automatically sends an asynchronous HTTP `POST` request to the target URL
  - And the request body contains the full JSON payload of the assignment details.

### UI/UX Specifications & Constraints

- Configuration Form: The webhook setup modal must include an `Endpoint URL` text input, an optional `Description` field, and a logical grouping of checkboxes for Trigger Events (e.g., grouped by _Assets_, _Lifecycle_, and _Maintenance_).
- Health Status Indicators: The main Webhooks data grid must display a visual Health Status column (Healthy / Failing) indicating if the external target URL successfully received the last sent payload (HTTP 200 OK) or if it timed out.

### Technical Implementation Tasks

#### Frontend

- [ ] Build the Webhooks management data grid within the Integrations tab, displaying: Endpoint URL, Description, Subscribed Events, Health Status (badge), and actions (Edit / Delete).
- [ ] Build the "Add/Edit Webhook" modal with: Endpoint URL input (with URL format validation), Description text area, and grouped event-trigger checkboxes (Assets, Lifecycle, Maintenance).
- [ ] Implement the Health Status badge component: Green "Healthy" badge if last delivery was HTTP 2xx, Red "Failing" badge if last delivery timed out or returned an error.

#### Backend

- [ ] Create RESTful CRUD endpoints for Webhook subscriptions (`GET`, `POST`, `PUT`, `DELETE /api/v1/webhooks`).
- [ ] Write an asynchronous webhook dispatch service (using a message queue like Redis/BullMQ or native background workers) that fires HTTP `POST` payloads to registered URLs when subscribed system events are triggered.
- [ ] Implement exponential backoff retry logic within the dispatch worker (e.g., retry at 1s, 5s, 30s, 5min intervals) to handle temporary network failures.
- [ ] Write delivery logging logic: record the HTTP response status and timestamp of each dispatch attempt, and update the webhook's health status accordingly.
- [ ] Implement the event-hook integration points in existing controllers: when an asset status changes, assignment occurs, or maintenance event fires, push the event payload to the webhook dispatcher.

#### Database

- [ ] Create a `WebhookSubscriptions` table with columns: `id`, `endpoint_url`, `description`, `subscribed_events` (JSONB array), `is_active`, `last_delivery_status`, `last_delivery_at`, `created_by` (FK → Users), `created_at`, `updated_at`.
- [ ] Create a `WebhookDeliveryLogs` table for auditing: `id`, `webhook_id` (FK), `event_type`, `payload` (JSONB), `http_status`, `response_body` (text), `attempt_number`, `created_at`.
