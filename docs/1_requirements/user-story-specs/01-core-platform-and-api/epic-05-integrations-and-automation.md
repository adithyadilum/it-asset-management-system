# Epic 5: Third-Party Integrations & Automation

## Summary

This epic connects the IT Asset Management platform to the broader corporate software ecosystem (such as HRIS, ServiceNow, or Slack). It provides secure, programmatic access for external tools to read hardware data via a Read-Only REST API, and introduces a highly reliable, asynchronous Webhook engine (backed by Upstash QStash) that pushes real-time payloads to other systems whenever an asset's status changes.

## In Scope

- Secure API Key generation, displaying the key only once, and storing only a cryptographic hash in the database.
- Granular API Key scoping (e.g., read-only access to specific entities) and expiration dates.
- A REST API gateway for external data consumption (Assets, Users, Financials, etc.).
- An Outbound Webhook configuration engine to dispatch HTTP POST payloads via Upstash QStash.
- Cryptographic HMAC SHA-256 webhook signatures for external payload verification.
- Auto-generated OpenAPI (Swagger) documentation available at `/api/openapi.json` and a static UI.

## Out of Scope / Limitations

- Bi-Directional API Syncing: The Open API is primarily Read-Only and Trigger-based; full, active bi-directional data syncing (e.g., the system actively overwriting Workday data) is out of scope.
- Standard Employees and IT Operators cannot access the Integrations dashboard or generate keys.

## Assumptions & Dependencies

- External third-party systems are capable of consuming standard JSON payloads and authenticating via Bearer Tokens in the HTTP header.
- Relies on an active Upstash QStash account to act as the asynchronous message queue and delivery engine for Webhooks.

---

### User Stories

- [US-5.1 — Secure API Key Management](#user-story-us-51--secure-api-key-management)
- [US-5.2 — External Data Consumption (Open API)](#user-story-us-52--external-data-consumption-open-api)
- [US-5.3 — Automated Outbound Webhooks (QStash)](#user-story-us-53--automated-outbound-webhooks-qstash)

---

## User Story: US-5.1 — Secure API Key Management

- **As a** Global Admin,
- **I want** to generate and revoke secure API keys from a dedicated Integrations dashboard,
- **So that** I can grant external systems (like the HR portal) programmatic access to our asset data without sharing employee passwords or compromising the database.

### Acceptance Criteria (Gherkin)

- **Scenario: Generating a "Show-Once" Key**
  - **Given** I am in the Integrations Settings tab
  - **When** I click "Generate New API Key", select scopes, and submit
  - **Then** the system uses `node:crypto` to generate a 32-byte random string prefixed with `idams_live_`
  - **And** displays this secret plaintext key exactly once on the screen
  - **And** stores only a SHA-256 hashed version of the key in the database alongside a masked version (prefix and last 4 characters).

- **Scenario: Revoking a Compromised Key**
  - **Given** a third-party key is suspected of being leaked
  - **When** I click "Revoke" on the "Workday HRIS" key
  - **Then** the key is instantly marked as `isRevoked: true` in the database
  - **And** an audit log is triggered (`API_KEY_REVOKED`)
  - **And** any subsequent API requests attempting to use that key fail validation immediately.

- **Scenario: Deleting a Revoked Key**
  - **Given** an API key has already been revoked
  - **When** I click the "Delete" button
  - **Then** the system completely removes the key's record from the database.
  - **But if** I attempt to delete an active key, the system blocks the deletion, enforcing that keys must be revoked first.

### Technical Implementation Tasks

#### Frontend
- [x] Build the API Key management data grid page within the Settings/Integrations module.
- [x] Build the "Generate New API Key" modal with scope selection, expiration dates, and a "show-once" key reveal UI.
- [x] Build the "Revoke Key" and "Delete Key" confirmation modals with destructive-action styling.
- [x] Implement the key masking display logic on the grid (e.g., `idams_live_...e8f2`).

#### Backend
- [x] Implement cryptographically secure API key generation (`randomBytes(32)`).
- [x] Implement secure hashing logic (`createHash('sha256')`) inside the `createApiKey` server action.
- [x] Implement `revokeApiKey` and `deleteApiKey` server actions with strict `GlobalAdmin` RBAC and Audit Logging.
- [x] Write middleware to authenticate incoming external API requests by hashing the incoming `Authorization: Bearer {key}` and comparing it against the `api_keys` table.

#### Database
- [x] Create an `api_keys` table via Drizzle ORM with columns: `id`, `name`, `keyHash`, `keyPrefix`, `keySuffix`, `scopes` (JSONB), `createdById`, `expiresAt`, `isRevoked`, and an index on `keyHash`.

---

## User Story: US-5.2 — External Data Consumption (Open API)

- **As a** Third-Party System Developer,
- **I want** to securely query a REST API to retrieve system data,
- **So that** our internal enterprise scripts can automatically audit user hardware assignments and financial depreciations.

### Acceptance Criteria (Gherkin)

- **Scenario: Secure Data Fetch**
  - **Given** I have a valid, unrevoked API Token
  - **When** I send a `GET` request to `/api/v1/external/assets`
  - **Then** the Next.js API route authenticates the token hash
  - **And** returns a JSON array of active assets.

- **Scenario: Auto-Generated API Documentation**
  - **Given** I need to understand the API schema
  - **When** I navigate to the Integrations dashboard and click the documentation link
  - **Then** I am routed to a dynamically generated Swagger UI (or Redoc)
  - **And** can view the exact shapes for the `/api/v1/external/*` endpoints defined by the system.

### Technical Implementation Tasks

#### Backend
- [x] Implement Token Authentication logic for the `/api/v1/external/*` route group.
- [x] Create read-only external endpoints for Assets, Users, Disposals, Maintenance, and Financials.
- [x] Generate an `openapi.json` route exposing the programmatic schema of the external REST APIs.
- [x] Add a static documentation portal linked from the `/settings/integrations` UI.

---

## User Story: US-5.3 — Automated Outbound Webhooks (QStash)

- **As an** IT Operations Manager,
- **I want** the system to automatically send a digital alert to our Helpdesk tool whenever a specific event occurs,
- **So that** my team does not have to waste time manually double-entering tickets across two different platforms.

### Acceptance Criteria (Gherkin)

- **Scenario: Configuring a Webhook & Encrypted Secrets**
  - **Given** I am in the Integrations dashboard
  - **When** I click "Add Webhook", paste a target URL, and select specific system events
  - **Then** the backend registers the webhook
  - **And** automatically generates a 32-byte cryptographic secret
  - **And** uses AES encryption (`encrypt()`) to securely store this secret in the `webhook_subscriptions` table.

- **Scenario: Firing a Webhook via Upstash QStash**
  - **Given** a webhook URL is successfully registered
  - **When** I click "Send Test Event" (or when a system trigger fires)
  - **Then** the system dynamically generates an HMAC SHA-256 signature (`X-EITAMS-Signature`) using the webhook's decrypted secret and the JSON payload.
  - **And** publishes the event asynchronously to Upstash QStash.
  - **And** QStash guarantees reliable delivery to the target URL, handling retries and exponential backoff independently of the Next.js main thread.

- **Scenario: Third-Party Payload Verification**
  - **Given** an external server receives an HTTP POST from the system
  - **When** it inspects the `X-EITAMS-Signature` header
  - **Then** it can securely compute its own HMAC hash using the shared secret
  - **And** verify the payload was genuinely dispatched by the IT Asset Management system and has not been tampered with in transit.

### Technical Implementation Tasks

#### Frontend
- [x] Build the Webhooks management data grid displaying Endpoint URL, Subscribed Events, and active status toggles.
- [x] Build the "Add/Edit Webhook" modal including the structured `WebhookEventSelector` component.
- [x] Implement the "Send Test Event" trigger button to fire mock payloads.

#### Backend
- [x] Create RESTful Server Actions (`createWebhookSubscription`, `updateWebhookSubscription`, `deleteWebhookSubscription`).
- [x] Implement AES encryption and decryption utilities to protect the webhook signing secrets at rest.
- [x] Integrate the `@upstash/qstash` client to act as the asynchronous background dispatcher.
- [x] Implement the `sendTestWebhook` action that generates the standard `X-EITAMS-Signature` and dispatches the payload to the queue.

#### Database
- [x] Create a `webhook_subscriptions` table via Drizzle ORM with columns: `id`, `name`, `url`, `events` (JSONB array), `secret` (encrypted text), `isActive`, and `createdById`.