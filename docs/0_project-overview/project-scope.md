# Project Scope Statement

**Project Name:** IDAMS — IT Asset Management System (Internal)

**Version:** 2.0

**Last Updated:** 27/02/2026

## 1. Executive Summary

IDAMS is a centralised, web-based enterprise platform built for TIQRI Corporation to track the full lifecycle, assignment, financial value, and compliance status of all IT hardware, software, and furniture assets. The system replaces the existing legacy tracking tools, enforces accountability via immutable audit logs, integrates with Azure Active Directory (Entra ID) for SSO and RBAC, and provides real-time financial intelligence including automated straight-line depreciation, Total Cost of Ownership (TCO) calculations, and proactive alert notifications.

The platform is organised across **five architectural Epics**:

| Epic | Name                                        | Summary                                                                       |
| :--- | :------------------------------------------ | :---------------------------------------------------------------------------- |
| 1    | Platform Foundation, Master Data & API Gateway | SSO/RBAC, dynamic category schemas, master data CRUD, audit log, API gateway. |
| 2    | Asset Registry & Tethered Scanning          | Registration wizard, high-density grid, QR engine, PWA mobile scanner.        |
| 3    | IT Operations & Hardware Maintenance        | Employee portal, digital acceptance, assignments/returns, maintenance ledger. |
| 4    | Compliance-Driven Disposals                 | Pending approval queue, hard-stop compliance modal, bulk disposal, archival.  |
| 5    | Financial Intelligence & Automated Alerts   | KPI dashboard, depreciation/TCO/write-off ledgers, CRON engine, reports.      |

## 2. In Scope

### 2.1 Core Modules

- **Asset Registry:** Registration of Hardware (Laptops, Monitors, Peripherals), Software Licenses, Furniture, and Consumables via a dynamic multi-step wizard with category-specific EAV custom fields.
- **Financial Tracking:** Multi-currency recording (NOK, USD, LKR) of initial costs (base price, tax, shipping), invoice PDF upload, automated straight-line depreciation, TCO aggregation, and a write-offs & salvage ledger.
- **Lifecycle Management:** Full state-machine tracking of assets through Available → Assigned → In Repair → Pending Disposal → Disposed (and related statuses: Defective, Lost, Missing, Donated) with enforced transition rules and mandatory justification notes.
- **Operations:** Asset assignment to Users or Locations (Building > Floor > Room hierarchy), digital custody acceptance (email + Teams notification with token-secured confirmation), condition-based return check-in, and vendor dispatch/repair tracking.
- **Compliance-Driven Disposals:** Executive approval workflow with financial context, hard-stop compliance modal (data-wipe checkbox, tag-removal checkbox, exact Asset ID confirmation, E-Waste Certificate PDF upload), bulk batch disposal, and soft-delete archival with 7-year retention.
- **Employee Self-Service Portal:** "My Assets" read-only grid for standard employees filtered by Azure AD identity, with "Report Issue" capability routing to the Maintenance Ledger.
- **Maintenance Ledger:** Tabbed pipeline (Pending Review → Active Repairs → Repair History) with triage slide-out, vendor dispatch modal, and close-repair cost reconciliation feeding back into TCO.

### 2.2 Technical Features

- **Web Interface:** A responsive Next.js 14+ (App Router) web application with ShadCN/UI component library, Tailwind CSS, and desktop-optimised data grids (TanStack Table).
- **Authentication & Authorisation:** Azure Active Directory (Entra ID) via OAuth 2.0 / OIDC for SSO. Role-Based Access Control (RBAC) with role mappings: Global Admin, IT Operations, Finance Read-Only, Standard Employee. Automated baseline permissions from Azure AD Group attributes.
- **Dynamic Category Schemas:** Admin-configurable EAV (Entity-Attribute-Value) custom field builder with drag-and-drop ordering (dnd-kit) and category-specific form rendering.
- **Bulk Import:** CSV/Excel importer with partial-success logic — valid rows committed, invalid rows skipped with downloadable error report.
- **QR Code Engine:** Auto-generated QR codes per asset encoding `assets.tiqri.com/asset/{ASSET_ID}`, with single-tag thermal printer (Zebra/Dymo) and A4 grid PDF print layouts.
- **Tethered Mobile Scanner (PWA):** HTML5 `getUserMedia` barcode/QR scanning in mobile browsers. Real-time WebSocket connection using identity-based auto-link (Azure AD user_id matching) for injecting scanned serial numbers into active desktop input fields.
- **Audit Logging:** Immutable, append-only event ledger capturing Actor, Timestamp, IP Address, Action Type, and Before/After JSON state diffs. Filterable viewer with CSV export.
- **Notifications & Alerts:** Automated Email and Microsoft Teams (Adaptive Card) notifications for warranty expiry, license renewal, overdue returns, overdue repairs, and low-stock consumables. Nightly CRON engine for threshold scanning and digest generation.
- **API Gateway:** Secure, rate-limited REST API endpoints with hashed API key authentication and outbound webhook dispatch for third-party integrations.
- **Reporting:** On-demand HTML report preview with PDF, CSV, and Excel export (up to 50,000 rows). Report types: Inventory by Department, Assets by Status, Financial Summary, Compliance Audit.
- **KPI Dashboard:** Admin landing page with real-time aggregate widgets (Total Assets, Pending Approvals, Overdue Returns, Low Stock, Recent Activity, Problem Asset Counts).

### 2.3 Design System & UI/UX

- **Design Language:** TIQRI Blue (`#0066FF`) primary colour, Slate Grey secondary, Inter typeface, 4 px base spacing unit, lucide-react icon set, system-preferred dark mode with manual toggle.
- **Layout Patterns:** Collapsible sidebar shell, global search (`Ctrl+K`), notification bell, data grid pattern, right-side slide-out panel (Sheet), multi-step wizard, tabbed ledger, and dashboard widget grid.
- **Accessibility:** WCAG 2.1 AA compliance — full keyboard navigation, ARIA landmarks, focus-visible indicators, `prefers-reduced-motion` support.

## 3. Out of Scope

The following features are explicitly excluded from the current delivery phase:

- **Native Mobile App:** No dedicated iOS/Android app. Mobile usage is supported via responsive web browser and PWA scanner only.
- **Offline Mode:** The system requires an active internet connection; no offline data syncing or local caching.
- **Complex Procurement:** No Purchase Order (PO) generation or multi-step procurement approval workflows. PO numbers are recorded as metadata only.
- **External User Accounts:** Auditors and Vendors do not have direct system logins. Auditors access compliance data through exported reports and the immutable audit log.
- **Vendor API Sync:** Automated warranty data fetching from external vendor APIs (Dell, HP, Lenovo) is optional and not guaranteed for initial release.
- **Multi-Tenancy:** The system is single-tenant, designed exclusively for TIQRI Corporation's internal use.
- **Advanced Analytics:** No predictive analytics, machine-learning models, or AI-driven recommendations.

## 4. Key Constraints & Assumptions

- **User Base:** The system is designed for internal use by approximately 100 Admin/IT/Finance users, plus the broader employee base (~500 users) accessing the read-only Employee Portal.
- **Authentication Dependency:** Production deployment requires Azure AD (Entra ID) tenant provisioning. Development and staging environments will proceed with a mock authentication provider.
- **Data Migration:** Legacy data will be available in CSV format for the initial bulk import. Data cleansing is the responsibility of the IT Operations team prior to import.
- **Infrastructure:** PostgreSQL 16+ database, Drizzle ORM, deployed on Azure App Service (or equivalent). Cloud storage (Azure Blob / AWS S3) for invoice PDFs and E-Waste certificates.
- **Compliance:** E-Waste Certificates of Destruction must be retained for a minimum of 7 years. Disposed asset records are soft-deleted and locked from future edits.
- **Performance Targets:** Page loads < 2 seconds, API responses < 500 ms (95th percentile), bulk imports up to 10,000 rows, report exports up to 50,000 rows within 10 seconds.

---
[< Back to Root](../../README.md)
