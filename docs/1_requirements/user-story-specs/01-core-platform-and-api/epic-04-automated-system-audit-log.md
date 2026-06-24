# Epic 4: Automated System Audit Log

## Summary

This epic acts as the system's black box flight recorder. To meet strict ISO 27001 enterprise compliance standards, the system must maintain an Immutable Audit Ledger. It automatically and silently records every single action (Create, Update, Delete, Status Change) performed by any user, capturing their identity, their exact location (IP Address), and a detailed Before/After snapshot of the data they changed.

## In Scope

- Automated, system-wide backend event tracking for all database mutations via reusable Drizzle ORM wrappers/utilities.
- Direct IP Address capture for security forensics.
- JSON diffing to capture the exact "Before" and "After" state of a modified record, skipping empty changes.
- A high-density, filterable UI for Security Auditors and Global Admins to review the ledger.
- Automated resolution of relational IDs (UUIDs and foreign keys) into human-readable labels (e.g. converting `locationId: 5` to `LOC-0005 · Colombo HQ`).

## Out of Scope / Limitations

- Proactive alerting or emailing based on audit events (e.g., emailing the admin if a server is deleted). This is handled by the Webhooks/Integrations engine in Epic 5.
- Manual log entry. Users cannot write their own notes into the system audit log; it is strictly machine-generated.

## Assumptions & Dependencies

- Relies on the NextAuth.js session from Epic 1 to accurately tag the `performedById` to the event.
- The production hosting infrastructure (e.g., Vercel, Azure) is configured to pass the true client IP address via `x-forwarded-for` headers.
- Relies on the RBAC middleware from Epic 2, restricting access to `GlobalAdmin` and `FinancialAuditor`.

---

### User Stories

- [US-4.1 — Automated Action & IP Logging (The Ledger)](#user-story-us-41--automated-action--ip-logging-the-ledger)
- [US-4.2 — Forensic Audit Log Viewer & Label Resolution](#user-story-us-42--forensic-audit-log-viewer--label-resolution)

---

## User Story: US-4.1 — Automated Action & IP Logging (The Ledger)

- **As a** Corporate Security and Compliance Officer,
- **I want** the system to automatically and silently record exactly who changed what, when, and from where,
- **So that** we maintain an unalterable, mathematically verifiable trail of all system activity for our annual compliance audits.

### Acceptance Criteria (Gherkin)

- **Scenario: Automated State Diff & Empty Diff Skipping**
  - **Given** an IT Admin updates the status of a laptop
  - **When** the HTTP request hits the backend and the mutation triggers `logAuditAction`
  - **Then** the server computes a deep recursive comparison between `oldData` and `newData`
  - **And** writes an immutable record to the `system_audit_logs` table containing only the exact fields that changed.
  - **But if** no fields actually changed, the system silently aborts the logging action to prevent database bloat.

- **Scenario: Direct IP Extraction behind Proxies**
  - **Given** a user is accessing the system behind a corporate proxy or Vercel edge network
  - **When** an action triggers an audit log
  - **Then** the system extracts the true client IP address from the `x-forwarded-for` header
  - **And** stores it directly on the audit log row.

- **Scenario: Tamper-Proofing & Fallback Protection**
  - **Given** a database outage or error occurs while writing an audit log
  - **When** `logAuditAction` throws an exception
  - **Then** the error is caught and logged to the server console (`console.error`)
  - **And** the original user's CRUD operation is permitted to complete smoothly (the UI doesn't crash).

### Technical Implementation Tasks

#### Backend
- [x] Write a reusable `logAuditAction` utility function that captures `entityType`, `entityId`, `actionType`, `performedById`, `oldData`, and `newData`.
- [x] Implement deep recursive JSON diffing (`areAuditValuesEqual`) to isolate the exact changed properties.
- [x] Implement IP address extraction logic from the Next.js `headers()` object (`x-forwarded-for`).
- [x] Include a transactional equivalent (`logAuditActionTx`) for database operations requiring atomicity.

#### Database
- [x] Create an append-only `system_audit_logs` table via Drizzle ORM with columns: `id`, `performed_by_id`, `action_type`, `entity_type`, `entity_id`, `ip_address`, `old_value` (JSONB), `new_value` (JSONB), `performed_at`.

---

## User Story: US-4.2 — Forensic Audit Log Viewer & Label Resolution

- **As a** Security Auditor or Global Admin,
- **I want** an interface to search, filter, and decipher the system's history,
- **So that** I can quickly conduct forensic investigations into missing hardware, unauthorized role changes, or data discrepancies without needing a developer to translate UUIDs into names.

### Acceptance Criteria (Gherkin)

- **Scenario: High-Density Log Viewing & Authorization**
  - **Given** I am logged in as a Global Admin or Financial Auditor
  - **When** I navigate to the `/reports/audit-log` route
  - **Then** I am presented with a chronologically ordered table of all system events.
  - **But if** I navigate to this page as an IT Operator or Employee, I am redirected to the `/403` error page.

- **Scenario: Dynamic Label Resolution for Foreign Keys**
  - **Given** an audit log row recorded an asset's location change from `locationId: 1` to `locationId: 5`
  - **When** the backend resolves the paginated query (`getAuditLogs`)
  - **Then** the system dynamically fetches the relational metadata
  - **And** replaces the raw numeric IDs with human-readable labels (e.g., `LOC-0005 · Colombo HQ`) in the JSON payload sent to the client UI.

- **Scenario: Asset-Specific Audit History Timeline**
  - **Given** I am viewing the details panel for a specific laptop asset
  - **When** I open the "History" or "Audit" tab
  - **Then** the system executes `getAssetAuditHistory`
  - **And** displays only the subset of logs where `entityType === 'Asset'` and `entityId` matches the laptop's UUID.

### UI/UX Specifications & Constraints

- **Data Visualization:** Use color-coded indicators or clear textual columns to make the log easily scannable.
- **Humanized Payload:** The "Before/After" data diffs must be rendered clearly, showing string labels rather than raw database UUIDs or Foreign Key IDs.

### Technical Implementation Tasks

#### Frontend
- [x] Build the Audit Log page in React at `src/app/(app-shell)/(management)/reports/audit-log/page.tsx`.
- [x] Build the `AuditLogClient` containing the filterable, paginated data table component.

#### Backend
- [x] Create a `getAuditLogs` Server Action that safely authenticates the user and fetches paginated results from `system_audit_logs`.
- [x] Implement the `resolveAuditValueLabels` function to bulk-fetch and swap internal IDs (e.g. `locationId`, `departmentId`, `vendorId`) with explicit display codes/names.
- [x] Create `getAssetAuditHistory` to scope the audit query to a specific asset UUID for granular tracking.