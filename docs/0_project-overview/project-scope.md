# Project Scope Statement

**Project Name:** EITAMS — Enterprise IT Asset Management System (TIQRI)

**Version:** 2.5

**Last Updated:** 23/05/2026

## 1. Executive Summary

EITAMS is a centralised, web-based enterprise platform built for TIQRI Corporation to track the full lifecycle, assignment, financial value, and compliance status of all IT hardware, software, office electronics, and furniture assets. The system replaces legacy tracking tools, enforces accountability via database-enforced immutable audit logs, utilizes a secure edge-based stateless JWT session proxy (currently simulating Azure AD SSO/RBAC), and provides real-time financial intelligence including automated straight-line depreciation, Total Cost of Ownership (TCO) calculations, and a central notification ledger.

The platform is organised across **five architectural Modules comprising 23 Epics**:

| Module | Name                                   | Epics       | Summary                                                                                                                           |
| :----- | :------------------------------------- | :---------- | :-------------------------------------------------------------------------------------------------------------------------------- |
| 1      | Core Platform & API Gateway            | 1 → 6       | SSO/RBAC authentication, dynamic category schemas, master data CRUD, immutable audit logs, and external API gateway integrations.   |
| 2      | Asset Registry & Onboarding            | 7 → 12      | Multi-step registration wizard, high-density grids, QR tag engine, PWA mobile scanning, and Employee Self-Service portal.          |
| 3      | Operations & Lifecycle Management      | 13 → 16     | Employee custody confirmation, digital acceptance, assignments/returns, and the Maintenance & Repair ledger.                      |
| 4      | Secure Disposal & Compliance           | 17 → 19     | Pending approval queues, hard-stop compliance verification modals, bulk batch disposal execution, and soft-delete historical archival. |
| 5      | Financial Analytics & Automation       | 20 → 23     | Global KPI dashboard, standard report templates, depreciation/TCO ledgers, and automated CRON alert notifications.                |

---

## 2. In Scope

### 2.1 Core Modules

- **Asset Registry (Epics 3, 6, 7, 8):** Registration of Hardware (Laptops, Monitors, Peripherals), Furniture, and Office Electronics via a dynamic multi-step wizard with category-specific custom specifications and asset tracking fields.
- **Software Asset Management (SAM - Epic 6, 22):** Software license registry supporting Perpetual, Subscription, and Open Source seats allocation, tracking active license keys, startDate, expiryDate, and employee seat allocations.
- **Financial Tracking (Epic 22):** Recording of initial acquisition costs (base price, tax, shipping), invoice file upload, automated straight-line depreciation calculation based on useful life and salvage value, and a write-offs ledger.
- **Lifecycle & Status Management (Epic 16):** Full state-machine tracking of assets through Available, Assigned, In Repair, Defective, Lost, Retired, Pending Disposal, and Disposed with database-enforced transition rules and mandatory justification notes.
- **Operations & Assignments (Epics 13, 14):** Asset assignment to Users or Locations (Building > Floor > Room hierarchy), condition-based return check-in, and vendor/internal repair tracking in the Maintenance Ledger.
- **Digital Custody Acceptance (Epic 13):** Flow for digital custody confirmation with distinct acceptance states (pending approval, assigned, overdue, requested, returned).
- **Secure Disposal & Compliance (Epics 17, 18, 19):** Executive approval workflow, hard-stop compliance modal (mandatory data-wipe check, tag-removal check, exact Asset Tag confirmation, and E-Waste Certificate file upload), bulk batch disposal, and soft-delete archival with restrictive database policies.
- **Employee Self-Service Portal (Epic 12):** "My Assets" read-only grid for standard employees based on session identity, with "Report Issue" capability routing directly to the Maintenance Ledger.
- **Maintenance Ledger (Epic 15):** Tabbed pipeline (Active Repairs, Repair History) with triage and dispatch modal, resolving internal/vendor repair costs to feed back into TCO.

### 2.2 Technical Features

- **Web Interface:** A responsive Next.js 16 (App Router) web application with React 19, Tailwind CSS 4, and desktop-optimised data grids (TanStack Table).
- **Authentication & Authorisation (Epics 1, 2):** 
  - *Current Status:* Stateless Edge Proxy (`src/proxy.ts`) using JSON Web Tokens (JWT) signed via the `jose` library, mapping database-driven roles (`GlobalAdmin`, `ITOperator`, `FinancialAuditor`, and `Employee`) in the `Users` table.
  - *In Scope / Yet to be Built:* Production integration with **Azure Active Directory (Entra ID)** via OAuth 2.0 / OIDC for SSO, mapping automated baseline permissions from Azure AD Group attributes to EITAMS application roles.
- **Dynamic Category Schemas (Epic 3):** Admin-configurable dynamic category schemas with specific custom attributes for `modelSpecs` (specifications common to a model) and `assetTracking` (attributes unique to an asset instance), rendering custom fields on-the-fly during creation.
- **Bulk Import (Epic 10):** CSV importer with partial-success logic — valid rows committed, invalid rows skipped with a downloadable CSV error report detailing row-by-row validation issues.
- **QR Code Engine (Epic 9):** Auto-generated QR codes per asset encoding the asset path `${originUrl}/assets/${assetId}` where `assetId` is the unique UUID or asset tag, with support for printing tags in standard A4 and single thermal printer PDF formats.
- **Audit Logging (Epic 4):** Immutable, append-only event ledger capturing Actor, Timestamp, IP Address, Action Type, and Before/After JSON state diffs. Enforced at the PostgreSQL database engine level via triggers (`BEFORE UPDATE` / `BEFORE DELETE`) to prevent tamper or deletion even by direct database queries.
- **In-App Notifications (Epic 23):** Real-time event-driven in-app notification center for low-stock consumables, warranty expiry, software license renewals, overdue returns, and disposal request updates.
- **Custom Report Templates (Epic 21):** Admin-configurable custom report builder supporting data source selection, column filtering, field customization, and sort settings with on-screen preview.
- **KPI Dashboard (Epic 20):** Real-time aggregate widgets (Total Assets, Pending Approvals, Overdue Returns, Low Stock, Problem Asset Counts).
- **Tethered Mobile Scanner - PWA (Epic 11) [In Scope / Yet to be Built]:** Zero-install PWA accessed via mobile browsers utilizing HTML5 camera APIs (`getUserMedia` via `html5-qrcode`). Features a secure, real-time WebSocket connection using identity-based auto-linking (matching the Azure AD `user_id` on desktop and phone sessions) to inject scanned serial numbers and barcodes directly into the active desktop input fields.
- **API Gateway (Epic 5) [In Scope / Yet to be Built]:** Secure, rate-limited REST API endpoints with hashed API key authentication and outbound webhook dispatch capabilities for third-party system integrations.
- **Notification Service - Out-of-band Email & Teams (Epic 23) [In Scope / Yet to be Built]:** Outbound notification dispatch integration. Connects in-app alerts to external delivery channels: email delivery via standard SMTP or Resend API, and Microsoft Teams notifications using Adaptive Cards sent through configured Webhooks. Enabled by a nightly CRON alert engine scanning database thresholds for warranty expiries, license renewals, overdue returns, and pending disposals.

---

## 3. Out of Scope

The following features are explicitly excluded from EITAMS delivery:

- **Native Mobile App:** No dedicated native iOS or Android apps. Mobile scanner and employee portal workflows are supported exclusively through standard responsive web browsers and PWAs.
- **Offline Mode:** The system requires an active internet connection; no offline data syncing, offline buffering of forms, or local device database caching.
- **Complex Procurement:** No Purchase Order (PO) generation, vendor quote bidding portals, or multi-step procurement financial approval workflows. PO numbers are recorded as flat metadata values only.
- **External User Accounts:** External auditors and vendors do not have direct system logins. Auditors access compliance data through exported PDF/CSV reports and the immutable system audit log.
- **Vendor API Sync:** Automated warranty data fetching or device status syncing from external manufacturer vendor APIs (e.g., Dell, HP, Lenovo) is not included. Warranty dates must be entered manually or imported.
- **Multi-Tenancy:** EITAMS is single-tenant, designed exclusively for TIQRI Corporation's internal IT infrastructure use.
- **Advanced Analytics:** No predictive analytics, machine-learning models, or AI-driven recommendations for lifecycle planning or procurement forecasting.

---

## 4. Key Constraints & Assumptions

- **User Base:** The system is designed for internal use by approximately 100 Admin/IT/Finance users, plus the broader employee base (~500 users) accessing the read-only Employee Portal and My Assets grids.
- **SSO Transition:** Secure, HTTP-only stateless JWT session cookies act as a complete proxy for Azure AD integration. The final production migration will map OIDC token payloads directly to EITAMS's internal database authorization roles without changing feature business logic.
- **Data Migration:** Legacy asset data will be cleaned by the IT Operations team and imported via the bulk CSV importer, which handles partial success and provides a downloadable CSV error report.
- **Infrastructure:** Serverless database powered by **Neon Serverless Postgres** managed via **Drizzle ORM** migrations, deployed on **Vercel**. Document uploads (invoices, disposal certificates, model images) are stored securely in **Vercel Blob** storage.
- **Compliance:** E-Waste Certificates of Destruction must be retained for a minimum of 7 years. Disposed asset records are soft-deleted and locked from future edits, with restrictive database policies ensuring relational records are kept.
- **Performance Targets:** Page loads < 2 seconds, Edge Proxy redirection/verification < 5ms, database latency minimized via parallel data fetching (`Promise.all`), bulk imports up to 10,000 rows, report exports up to 50,000 rows.

---

[< Back to Root](../../README.md)
