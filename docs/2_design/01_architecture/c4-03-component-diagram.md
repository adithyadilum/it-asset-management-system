# Level 3: Component Diagram (API Application)

The Component Diagram details the internal modularity of the API Application container, demonstrating the "Separation of Concerns" principle. Each service maps to a specific architectural Epic from the functional requirements.

```mermaid
C4Component
    title Component Diagram for API Application (Next.js API Routes)

    Container(web_app, "Web Application", "Next.js 14+", "Provides the user interface and PWA mobile scanner.")
    Container(ws_server, "WebSocket Server", "ws library", "Auto-links mobile and desktop clients by user identity for tethered scanning.")
    ContainerDb(database, "Database", "PostgreSQL 16+", "Stores asset records, audit logs, and financial data.")
    Container(storage, "File Storage", "Azure Blob / S3", "Stores invoices and e-waste certificates.")
    System_Ext(azure, "Azure AD (Entra ID)", "External SSO and AD group provider.")
    System_Ext(notifications, "Notification Services", "Email (SMTP) and Microsoft Teams.")
    System_Ext(vendor_api, "Vendor APIs", "Manufacturer warranty data APIs.")

    Container_Boundary(api_boundary, "API Application") {
        Component(auth_controller, "Auth & RBAC Middleware", "Next.js Middleware", "Validates JWT tokens, maps Azure AD groups to system roles, and enforces route-level access control.")
        Component(api_gateway, "API Gateway Controller", "REST Controller", "Manages external API key generation/revocation, rate limiting (100 req/min), and outbound webhook dispatch for third-party consumers.")
        Component(master_data_service, "Master Data Service", "Service Layer", "Manages categories with auto-generated prefix codes, EAV schema definitions, locations (Building > Floor > Room), brands, models, vendors, and relational safeguards.")
        Component(registry_service, "Registry Service", "Service Layer", "Handles asset CRUD, unique ID generation, dynamic form rendering, bulk CSV/Excel import with partial success, QR code generation, print layouts, and serial number validation.")
        Component(operations_service, "Operations Service", "Service Layer", "Manages assignments, digital custody acceptance, returns with condition checks, bulk location transfers, maintenance ledger (triage, vendor dispatch, cost reconciliation), and lifecycle status transitions with state-machine rules.")
        Component(disposal_service, "Disposal Service", "Service Layer", "Processes the compliance-driven disposal workflow: intake flagging, executive financial review, rejection with re-routing, hard-stop confirmation with data-wipe checkboxes, disposal method capture, e-waste certificate uploads, and bulk disposal processing.")
        Component(financial_service, "Financial Service", "Service Layer", "Calculates straight-line depreciation (Current Book Value), Total Cost of Ownership, manages the Write-Offs & Salvage ledger, and generates standard reports in HTML/PDF/CSV/Excel formats.")
        Component(notification_service, "Notification Service", "Utility", "Formats and dispatches automated notifications via Email (SMTP) and Microsoft Teams for custody confirmations, return requests, warranty/license alerts, and manages the user-facing notification inbox with deep-links.")
        Component(audit_service, "Audit Logger", "Utility", "Captures before/after JSON state diffs, actor identity, X-Forwarded-For IP address, and timestamps into the immutable append-only audit ledger with CSV export capability.")
    }

    Rel(web_app, auth_controller, "Sends request with JWT token", "JSON/HTTPS")
    Rel(auth_controller, azure, "Verifies token signature & extracts AD groups", "JWKS / OIDC")

    Rel(auth_controller, api_gateway, "Routes external API requests", "Function Call")
    Rel(auth_controller, master_data_service, "Forwards valid request", "Function Call")
    Rel(auth_controller, registry_service, "Forwards valid request", "Function Call")
    Rel(auth_controller, operations_service, "Forwards valid request", "Function Call")
    Rel(auth_controller, disposal_service, "Forwards valid request", "Function Call")
    Rel(auth_controller, financial_service, "Forwards valid request", "Function Call")

    Rel(master_data_service, database, "Persists categories, locations, vendors", "SQL")
    Rel(registry_service, database, "Persists asset records", "SQL")
    Rel(registry_service, storage, "Uploads invoices & QR assets", "HTTPS")
    Rel(operations_service, database, "Updates assignments, maintenance & statuses", "SQL")
    Rel(disposal_service, database, "Processes disposal records", "SQL")
    Rel(disposal_service, storage, "Uploads e-waste certificates", "HTTPS")
    Rel(financial_service, database, "Reads financial, maintenance & disposal data", "SQL")
    Rel(api_gateway, vendor_api, "Fetches warranty data by Serial Number", "REST API")

    Rel(master_data_service, audit_service, "Logs master data changes", "Function Call")
    Rel(registry_service, audit_service, "Logs asset creation/update", "Function Call")
    Rel(operations_service, audit_service, "Logs assignments & status changes", "Function Call")
    Rel(disposal_service, audit_service, "Logs disposal workflow events", "Function Call")
    Rel(audit_service, database, "Writes immutable audit entry", "SQL (Append-Only)")

    Rel(operations_service, notification_service, "Triggers assignment & return alerts", "Function Call")
    Rel(disposal_service, notification_service, "Triggers disposal review notifications", "Function Call")
    Rel(financial_service, notification_service, "Triggers financial threshold alerts", "Function Call")
    Rel(notification_service, notifications, "Dispatches via Email & Teams", "SMTP / Teams API")

    Rel(ws_server, registry_service, "Relays scanned serial numbers", "Internal Call")
```

The API is structured into distinct functional services, each aligned to an architectural Epic:

- **Auth & RBAC Middleware (Epic 1):** Intercepts all incoming requests to validate JWT tokens against Azure AD, extracts AD group memberships, maps them to internal system roles (e.g., Global Admin, Finance Read-Only, Standard Employee), and enforces route-level access control. Unauthorized requests receive a `403 Forbidden` response (REQ-FND-1.1–1.5).

- **API Gateway Controller (Epic 1):** Manages the Open API Gateway for external third-party systems. Handles API key generation/revocation with hashed storage, enforces rate limiting (100 req/min per key), and dispatches outbound webhook payloads triggered by system events (REQ-FND-1.12–1.13, NFR-PERF-06).

- **Master Data Service (Epic 1):** Manages the organizational backbone — asset categories with auto-generated prefix codes and collision handling, EAV schema definitions for dynamic custom fields with drag-and-drop ordering, hierarchical locations, brands, models, departments, and vendors. Enforces relational safeguards preventing deletion of in-use entities and supports soft-archival (REQ-FND-1.6–1.10, 1.15–1.17).

- **Registry Service (Epic 2):** Manages the core asset data logic including unique Asset ID generation using category prefixes, dynamic form rendering based on EAV schemas, financial data capture (base price, tax, shipping, multi-currency), bulk CSV/Excel import with partial success processing, QR code generation with routing URLs, print layout formatting (thermal single-tag and A4 PDF grids), and serial number uniqueness validation (REQ-REG-2.1–2.16).

- **Operations Service (Epic 3):** Handles the complex transactional logic for asset assignments (user or location, with team-blocking), digital custody acceptance via Email/Teams, returns with mandatory condition checks, bulk location transfers, the full maintenance ledger (triage review, vendor dispatch with RMA tracking, cost reconciliation), lifecycle status transitions enforced by state-machine rules, and employee issue reporting (REQ-OPS-3.1–3.15).

- **Disposal Service (Epic 4):** Processes the compliance-driven disposal workflow: intake flagging of defective assets, executive review with financial justification, rejection with mandatory notes and re-routing, hard-stop confirmation requiring exact Asset ID text entry and physical security checkboxes (data wiped, tags removed), disposal method capture (Sold, Stolen, E-waste, Donated), e-waste certificate uploads with 7-year retention, bulk disposal processing, and soft-delete finality (REQ-DSP-4.1–4.8).

- **Financial Service (Epic 5):** Calculates real-time Current Book Value using straight-line depreciation, aggregates Total Cost of Ownership (purchase + maintenance costs), maintains the Write-Offs & Salvage ledger, powers the KPI dashboard with aggregate metric cards and widgets (Recent Activity, Problem Assets), and generates standard reports in HTML/PDF/CSV/Excel (REQ-FIN-5.1–5.7).

- **Notification Service (Epic 3 & 5):** Formats and dispatches automated notifications via both Email (SMTP) and Microsoft Teams for custody confirmations, return requests, warranty expirations, software license renewals, and overdue asset returns. Also manages the user-facing Bell Icon notification inbox with deep-links to affected asset details (REQ-OPS-3.2, REQ-OPS-3.11, REQ-FIN-5.8, REQ-FIN-5.10).

- **Audit Logger (Epic 1):** A dedicated component that captures the state of an asset before and after any modification as a JSON diff, along with the actor identity, `X-Forwarded-For` IP address, and timestamp. Writes to the immutable append-only audit ledger. Supports filtered viewing and CSV export (REQ-FND-1.11, REQ-FND-1.14).

[< Back to Requirements](../README.md)
