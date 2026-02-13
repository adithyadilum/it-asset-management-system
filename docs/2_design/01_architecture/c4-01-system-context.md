# C4 Level 1 – System Context Diagram

The diagram positions the IT Asset Management System as the central hub.

- User Interaction: It serves three distinct user groups: Global Admins (full lifecycle management), Department Heads (operational oversight), and Employees (custody acknowledgement).

- External Integrations: The system relies on Azure Active Directory for secure Single Sign-On (SSO) and role mapping. It pushes automated alerts via Notification Services (Teams/Email) and provides a read-only API interface for HR & Finance Systems to retrieve asset value data for payroll and depreciation reporting.

```mermaid
C4Context
    title System Context Diagram for IT Asset Management System (IDAMS)

    Person(admin, "Global Admin", "Manages registry, master data, and system configurations.")
    Person(deptHead, "Department Head", "Oversees assets and status changes within their department scope.")
    Person(employee, "Employee", "Views assigned assets and confirms receipt of equipment.")

    System(itam, "IT Asset Management System", "Centralized PERN stack system for tracking hardware/software lifecycle and financial value.")

    System_Ext(azure, "Azure AD", "Handles SSO authentication and role-based group mapping.")
    System_Ext(hr_finance, "HR / Finance Systems", "External systems consuming asset data for payroll or financial reporting.")
    System_Ext(notifications, "Notification Services", "Email (SMTP) and Microsoft Teams for automated alerts.")

    Rel(admin, itam, "Registers assets and manages settings", "HTTPS")
    Rel(deptHead, itam, "Manages department assets", "HTTPS")
    Rel(employee, itam, "Views 'My Assets' and accepts custody", "HTTPS")

    Rel(itam, azure, "Authenticates users via OIDC", "JSON/HTTPS")
    Rel(itam, hr_finance, "Exposes Read-Only asset data", "REST API")
    Rel(itam, notifications, "Sends warranty alerts", "SMTP/API")

    UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```