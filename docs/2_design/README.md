# Design Docs

This folder contains the technical design specifications for the **IDAMS (IT Asset Management System)**. All implementation details including database schemas, API contracts, and security protocols must be defined here before code is written.

## Design Artifacts Status

| Domain              | Document                                                                       | Description                                                                          | Status     |
| :------------------ | :----------------------------------------------------------------------------- | :----------------------------------------------------------------------------------- | :--------- |
| **01 Architecture** | [System Context (C4-L1)](01_architecture/c4-01-system-context.md)              | High-level system boundaries (IDAMS, Azure AD, Cloud Storage).                       | **Review** |
|                     | [Container Diagram (C4-L2)](01_architecture/c4-02-container-diagram.md)        | Web UI, PWA Scanner, API Gateway, and Database interaction model.                    | **Review** |
|                     | [Component Diagram (C4-L3)](01_architecture/c4-03-component-diagram.md)        | Internal modularity of the API (TCO Engine, Schema Engine, WebSockets).              | **Review** |
|                     | [Data Flow Diagram (DFD)](01_architecture/data-flow-diagram.md)                | Visualizes how sensitive data (Financials, PII) moves through the system and rests.  | **Review** |
|                     | [Backup & DR Plan](01_architecture/backup-dr-plan.md)                          | Database dump and restore procedures (RPO 24h).                                      | -          |
| **02 Data Model**   | [Core ER Diagram](02_data_model/erd-diagram.md)                                | Entity relationships (Assets, Locations, Users, Maintenance).                        | **Review** |
|                     | [EAV Dynamic Schema](02_data_model/eav-schema-design.md)                       | JSONB/Relational table design for dynamic custom fields per category.                | -          |
|                     | [Audit Log Ledger](02_data_model/audit-log-schema.md)                          | Immutable history table design capturing JSON diffs and IPs.                         | **Review** |
| **03 API Spec**     | [OpenAPI Definition](03_api_spec/openapi-definition.yaml)                      | Swagger specification for all REST endpoints and rate-limiting rules.                | -          |
|                     | [WebSocket Contracts](03_api_spec/websocket-payload-contracts.md)              | Payload structures for mobile-to-desktop barcode injections.                         | -          |
|                     | [Webhook Outbound Engine](03_api_spec/webhook-dispatch-contracts.md)           | Event payload structures for pushing data to external 3rd party systems.             | -          |
| **04 Security**     | [Azure AD SSO Flow](04_security_infra/azure-ad-auth-sequence.md)               | OAuth 2.0 / OIDC sequence diagram and JWT claim extraction.                          | -          |
|                     | [RBAC Matrix](04_security_infra/rbac-matrix.csv)                               | Permission mapping (Global Admin vs IT Ops vs Finance).                              | -          |
|                     | [Data Encryption Strategy](04_security_infra/encryption-key-management.md)     | AES-256 implementation for financial costs and license keys.                         | -          |
| **05 Logic**        | [Asset Lifecycle (State Machine)](05_business_logic/asset-lifecycle.md)        | Valid status transitions (Available -> Assigned -> In Repair -> Disposed).           | **Review** |
|                     | [Companion Scanner (Sequence)](05_business_logic/tethered-scanner.md)          | Real-time WebSocket identity-based auto-link and barcode injection workflow.         | **Review** |
|                     | [Compliance Disposal (Activity)](05_business_logic/disposal-hard-stop.md)      | Multi-user approval, Soft-Delete, and E-waste upload swimlane diagram.               | **Review** |
|                     | [Digital Acceptance (Activity)](05_business_logic/digital-acceptance.md)       | Email notification and user confirmation routing.                                    | **Review** |
|                     | [CRON Alert Engine (Flowchart)](05_business_logic/cron-alert-engine.md)        | Nightly queries for warranty expiry, TCO flags, and digest generation.               | **Review** |
|                     | [Bulk Import Flowchart](05_business_logic/bulk-import-partial-success.md)      | Logic for handling CSV array parsing and skipping invalid rows.                      | **Review** |
| **06 UI/UX Design** | [Design System & Components](06_ui_ux_design/design-system.md)                 | Link to Figma: Color palette, typography, and reusable ShadCN/Tailwind components.   | **Review** |
|                     | [Desktop Wireframes & Screen Catalogue](06_ui_ux_design/desktop-wireframes.md) | Visual layout for the complex filtering grid and the Right-Side Slide-Out Panels.    | **Review** |
|                     | [Mobile PWA Wireframes](06_ui_ux_design/mobile-scanner-wireframes.md)          | Visual layout for the HTML5 camera viewfinder, bottom-sheets, and empty states.      | -          |
| **07 QA & Testing** | [Test Automation Strategy](07_qa_testing/test-automation-strategy.md)          | Frameworks used (Jest, Cypress, Postman) and definitions of "Done" for PR merges.    | -          |
|                     | [Critical Path Test Cases](07_qa_testing/critical-path-tests.md)               | Step-by-step UAT scripts for SSO Login, Disposal Execution, and WebSocket auto-link. | -          |

[< Back to Root](../../README.md)
