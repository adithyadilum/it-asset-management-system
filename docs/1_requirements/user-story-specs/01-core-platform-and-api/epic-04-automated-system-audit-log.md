Epic 4: Automated System Audit Log

Summary
This epic acts as the system's black box flight recorder. To meet strict ISO 27001 enterprise compliance standards, the system must maintain an Immutable Audit Ledger. It automatically and silently records every single action (Create, Update, Delete) performed by any user, capturing their identity, their exact location (IP Address), and a detailed Before/After snapshot of the data they changed.

In Scope

- Automated, system-wide backend event tracking for all database mutations.
- Direct IP Address capture for security forensics.
- JSON diffing to capture the exact "Before" and "After" state of a modified record.
- A high-density, filterable UI for Security Auditors to review and export the ledger.

Out of Scope / Limitations

- Proactive alerting or emailing based on audit events (e.g., emailing the admin if a server is deleted). This is handled by the Webhooks/Integrations engine in Epic 5.
- Manual log entry. Users cannot write their own notes into the system audit log; it is strictly machine-generated.

Assumptions & Dependencies

- Relies on the SSO/JWT authentication from Epic 1 to accurately tag the `actor_id` to the event.
- The production hosting infrastructure (e.g., Azure or AWS) is configured to pass the true client IP address through any Load Balancers or Reverse Proxies.

[](https://app.clickup.com/t/86ewvd4dr)
[](https://app.clickup.com/t/86ewvd4dz)

User Story: US-4.1 — Automated Action & IP Logging (The Ledger)

- As a Corporate Security and Compliance Officer,
- I want the system to automatically and silently record exactly who changed what, when, and from where,
- So that we maintain an unalterable, mathematically verifiable trail of all system activity for our annual compliance audits.

Acceptance Criteria (Gherkin)

- Scenario: Automated State Diff & IP Capture
  - Given an IT Admin updates the status of a laptop from "Available" to "In Repair"
  - When the HTTP request hits the backend
  - Then the server captures the user's IP address directly from the incoming request
  - And writes an immutable record to the Audit Log containing the precise Before/After JSON states (e.g., `{"status": "Available"}` ➔ `{"status": "In Repair"}`).
- Scenario: Tamper-Proofing (Immutability Constraint)
  - Given a Global Admin attempts to cover up a mistake or malicious action
  - When they attempt to send a `DELETE` or `UPDATE` database command targeting the Audit Log table
  - Then the database actively rejects the query, preserving the original record.

UI/UX Specifications & Constraints

- Invisible Operation: This user story has no direct frontend UI. It is an invisible backend middleware that must not add more than 100ms of latency to standard CRUD operations.

Technical Implementation Tasks

- \[ \] Create an append-only `AuditLogs` PostgreSQL database table.
- \[ \] Strictly revoke `UPDATE` and `DELETE` database privileges on the `AuditLogs` table at the database-user level.
- \[ \] Write a backend middleware interceptor to extract the direct client IP address from the request object (handling `X-Forwarded-For` headers if necessary).
- \[ \] Implement a backend utility to compute Before/After object states and serialize them into JSON diff payloads for storage.

User Story: US-4.2 — Forensic Audit Log Viewer & Export

- As a Security Auditor,
- I want an interface to search, filter, and download the system's history,
- So that I can quickly conduct forensic investigations into missing hardware, unauthorized role changes, or data discrepancies.

Acceptance Criteria (Gherkin)

- Scenario: High-Density Log Viewing
  _ Given I navigate to the "System Audit Log" page
  _ When the page loads \* Then I am presented with a chronologically ordered table of all system events, displaying the Actor, Event Type, IP Address, Date/Time, and the Target Asset/Entity.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/acb80c19-a3f7-4e51-907b-9cab22e97e00/System-audit-log.png)
- Scenario: Filtering by Actor and Event
  _ Given I am investigating a specific employee's actions
  _ When I apply filters for Actor "Jane Doe" and Action Type "DELETE" \* Then the data table instantly refines to show only destructive actions performed by Jane.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/ff5bc6c2-fe1c-4323-a51b-94616286b9d2/System-audit-log-apply-filters.png)

- Scenario: Expanding the JSON Diff Payload
  _ Given I am looking at a specific "UPDATE" event row in the table
  _ When I click "View Details" or expand the row \* Then a modal or expanding row reveals the exact Before and After JSON data, highlighting exactly which fields were changed.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/5bb01ffa-4540-4ea8-ba2c-46e90504686d/System-audit-log-filtered.png)
- Scenario: Exporting the Ledger for Compliance
  - Given my filters are applied to show all events from the past 30 days
  - When I click the "Export Log (CSV)" button
  - Then a CSV file containing the currently filtered dataset is generated and downloaded to my local machine.

UI/UX Specifications & Constraints

- Data Visualization: Use strict color-coded badges for Action Types to make the log easily scannable:
  - `CREATE`: Green Badge
  - `UPDATE`: Blue Badge
  - `DELETE` / `DISPOSE`: Red/Warning Badge
- Filter Layout: Because auditors need to cross-reference multiple data points, place a robust filter bar directly above the table featuring Date Range pickers, an Actor dropdown, and an Action Type multi-select.
- Monospace Font: The "Before/After" data diffs must be rendered in a monospace font (like Courier or Roboto Mono) wrapped in a light gray background box so technical data is easy to read.

Technical Implementation Tasks

- \[ \] Build the High-Density Audit UI table in React with complex state management for Date/Actor filters.
- \[ \] Create API endpoint `GET /api/audit-logs` that accepts complex query parameters for filtering and supports cursor-based or offset pagination.
- \[ \] Implement a backend CSV generator service that streams the requested log data down to the client upon clicking "Export Log".
