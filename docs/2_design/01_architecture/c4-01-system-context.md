# C4 Level 1 – System Context Diagram

The diagram positions the IT Asset Management System as the central hub.

- **User Interaction:** It serves three distinct user groups: Global Admins (full lifecycle management, master data, compliance), Department Heads (operational oversight and disposal reviews), and Employees (custody acknowledgement and issue reporting).

- **External Integrations:** The system relies on Azure Active Directory (Entra ID) for secure Single Sign-On (SSO) via OAuth 2.0/OIDC and role-based group mapping. It pushes automated alerts via Notification Services (Email/Teams) for custody confirmations, warranty expirations, license renewals, and overdue returns. A rate-limited Open API Gateway provides read-only endpoints and outbound webhooks for HR & Finance Systems. Optionally, the system queries external Vendor APIs to auto-fetch warranty data.

```mermaid
C4Context
    title System Context Diagram for IT Asset Management System (IDAMS)

    Person(admin, "Global Admin", "Manages registry, master data, system configurations, and oversees the full asset lifecycle including Secure Disposal & Compliance.")
    Person(deptHead, "Department Head", "Oversees departmental assets, reviews disposal requests, and manages operational workflows.")
    Person(employee, "Employee", "Views assigned assets, confirms custody receipt, and reports hardware issues.")

    System(itam, "IT Asset Management System", "Next.js / TypeScript / PostgreSQL platform for tracking hardware & software lifecycle, financial value, and Secure Disposal & Compliance.")

    System_Ext(azure, "Azure AD (Entra ID)", "Handles SSO authentication via OAuth 2.0/OIDC and role-based AD group mapping.")
    System_Ext(hr_finance, "HR / Finance Systems", "External systems consuming read-only asset and financial data via the Open API Gateway and Webhooks.")
    System_Ext(notifications, "Notification Services", "Email (SMTP) and Microsoft Teams for automated alerts and custody confirmations.")
    System_Ext(vendor_api, "Vendor APIs", "External manufacturer APIs (e.g., Dell, HP, Lenovo) for automated warranty data retrieval.")

    Rel(admin, itam, "Registers assets, manages master data, configures roles", "HTTPS")
    Rel(deptHead, itam, "Reviews department assets and disposal requests", "HTTPS")
    Rel(employee, itam, "Views 'My Assets', confirms custody, reports issues", "HTTPS")

    Rel(itam, azure, "Authenticates users via OIDC/OAuth 2.0", "JSON/HTTPS")
    Rel(itam, hr_finance, "Exposes read-only asset data via rate-limited API", "REST API / Webhooks")
    Rel(itam, notifications, "Sends automated alerts and custody confirmations", "SMTP / Teams API")
    Rel(itam, vendor_api, "Fetches warranty expiry data by Serial Number", "REST API")

    UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

[< Back to Requirements](../README.md)

