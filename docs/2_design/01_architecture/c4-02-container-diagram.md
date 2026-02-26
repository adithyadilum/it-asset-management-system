# Level 2: Container Diagram

The Container Diagram zooms into the system boundary to illustrate the high-level technical building blocks and their communication protocols.

```mermaid
C4Container
    title Container Diagram for IT Asset Management System (IDAMS)

    Person(admin, "Global Admin", "Manages assets, master data, and system settings.")
    Person(deptHead, "Department Head", "Oversees department assets and reviews disposals.")
    Person(employee, "Employee", "Views assigned assets, confirms custody, and reports issues.")

    System_Boundary(itam_boundary, "IT Asset Management System") {
        Container(web_app, "Web Application", "Next.js 14+ (App Router), TypeScript, ShadCN/UI, Tailwind CSS", "Provides the responsive UI including the PWA mobile scanner, data grids, dashboards, and all admin/employee interfaces.")
        Container(api_app, "API Application", "Next.js API Routes, TypeScript, Drizzle ORM", "Handles business logic: RBAC enforcement, asset lifecycle, financial calculations, disposal compliance, and the Open API Gateway for external consumers.")
        Container(ws_server, "WebSocket Server", "Next.js / ws library", "Auto-links mobile and desktop clients by Azure AD user identity for real-time serial number injection.")
        ContainerDb(database, "Database", "PostgreSQL 16+", "Stores asset records, master data, financial ledgers, maintenance records, and the immutable audit log.")
        Container(storage, "File Storage", "Azure Blob Storage / AWS S3", "Stores uploaded PDF invoices, e-waste certificates of destruction, and generated QR code assets.")
        Container(worker, "Background Worker", "CRON / Scheduled Tasks", "Runs nightly scans for warranty expirations, software license renewals, overdue asset returns, and dispatches automated alerts.")
    }

    System_Ext(azure, "Azure AD (Entra ID)", "External SSO and role-based group mapping via OAuth 2.0/OIDC.")
    System_Ext(notifications, "Notification Services", "Email (SMTP) and Microsoft Teams for automated alerts and custody confirmations.")
    System_Ext(vendor_api, "Vendor APIs", "External manufacturer APIs (Dell, HP, Lenovo) for warranty data retrieval.")
    System_Ext(hr_finance, "HR / Finance Systems", "External systems consuming read-only asset data via the Open API Gateway.")

    Rel(admin, web_app, "Uses", "HTTPS")
    Rel(deptHead, web_app, "Uses", "HTTPS")
    Rel(employee, web_app, "Uses", "HTTPS")

    Rel(web_app, api_app, "Makes API calls", "JSON/HTTPS")
    Rel(web_app, ws_server, "Auto-links by user identity for tethered scanning", "WebSocket")
    Rel(api_app, database, "Reads/Writes", "Drizzle ORM / SQL")
    Rel(api_app, storage, "Uploads/Downloads files", "HTTPS")
    Rel(api_app, azure, "Validates tokens & maps AD groups to roles", "OIDC / JWKS")
    Rel(api_app, notifications, "Sends custody & return notifications", "SMTP / Teams API")
    Rel(api_app, hr_finance, "Serves read-only API endpoints", "REST API / Webhooks")
    Rel(worker, database, "Queries for threshold breaches", "SQL")
    Rel(worker, notifications, "Dispatches automated alerts", "SMTP / Teams API")
    Rel(worker, vendor_api, "Fetches warranty expiry data", "REST API")
```

The architecture follows a modular, cloud-ready design:

- **Web Application (SPA + PWA):** Built with Next.js 14+ (App Router), TypeScript, ShadCN/UI, and Tailwind CSS. This container provides a responsive user interface that runs in the user's browser, including the PWA mobile scanner for barcode/QR scanning. It communicates with the backend via JSON/HTTPS and with the WebSocket server for identity-based auto-linked scanning sessions.

- **API Application:** The backend, developed using Next.js API Routes with TypeScript and Drizzle ORM, acts as the central logic engine. It handles Azure AD authentication and role mapping, RBAC enforcement, asset lifecycle management, financial calculations (depreciation, TCO), compliance-driven disposal workflows, and exposes the Open API Gateway for external consumers.

- **WebSocket Server:** A dedicated real-time communication layer that auto-links mobile and desktop clients by matching their Azure AD user identity (`user_id`), enabling scanned serial numbers to be injected directly into desktop form fields without manual pairing (REQ-REG-2.14).

- **Database:** A PostgreSQL 16+ database serves as the persistent storage for asset records, master data, financial ledgers, maintenance records, and the immutable append-only audit log.

- **File Storage:** Azure Blob Storage / AWS S3 stores uploaded PDF purchase invoices (REQ-REG-2.4), e-waste certificates of destruction (REQ-DSP-4.6), and generated report artifacts. Configured with 7-year retention policies for compliance (NFR-REL-06).

- **Background Worker:** A CRON-based scheduler (REQ-FIN-5.9) runs nightly scans to detect warranty expirations, software license renewals, and overdue asset returns, dispatching automated alerts via Email and Microsoft Teams. Optionally queries Vendor APIs for warranty data (REQ-FIN-5.11).

[< Back to Requirements](../README.md)
