# Project Scope Statement

**Project Name:** IT Asset Management System (Internal)

**Version:** 1.0

**Last Updated:** 16/01/2026

## 1. Executive Summary

The goal of this project is to build a centralized, web-based system for the IT Administration team to track the lifecycle, assignment, and financial value of hardware and software assets. The system aims to replace exsisting system, ensure accountability via immutable audit logs, and prepare for future integration with Azure AD.

## 2. In Scope

### 2.1 Core Modules

- **Asset Registry:** Registration of Hardware (Laptops, Monitors), Software, and Furniture.
- **Financial Tracking:** Multi-currency recording (NOK, USD, LKR) of initial costs, lease status, and warranty dates.
- **Lifecycle Management:** Tracking assets from "New" to "Assigned" to "Disposed".
- **Operations:** Asset assignment to Users or Locations (Building/Room).

### 2.2 Technical Features

- **Web Interface:** A responsive web application optimized for Desktop usage by Admins.
- **Mock Authentication:** A "Dev Mode" login system to simulate Role-Based Access Control (RBAC) prior to Azure AD availability.
- **Bulk Import:** CSV/Excel importer with "Partial Success" logic (skipping invalid rows).
- **Audit Logging:** An immutable, append-only history log for all changes.
- **Notifications:** Automated Email/Teams alerts for asset returns and warranty expirations.

## 3. Out of Scope

To ensure timely delivery, the following features are explicitly excluded from the current phase:

- **Native Mobile App:** No dedicated iOS/Android app will be built. Mobile usage is supported via responsive web browser only.
- **Offline Mode:** The system requires an active internet connection; no offline data syncing.
- **Complex Procurement:** No Purchase Order (PO) generation or approval workflows (only recording PO numbers).
- **Automated Depreciation:** No real-time calculation of depreciation schedules (Book Value is static or manual).
- **Self-Service Portal:** General employees cannot request assets or log repair tickets in this system (they use existing Service Desk tools).
- **External Access:** Auditors and Vendors will not have direct system logins.

## 4. Key Constraints & Assumptions

- **User Base:** The system is designed for internal use by <100 Admin users, not the entire public workforce.
- **Authentication:** Final production deployment depends on Azure AD approval; development will proceed with Mock Auth.
- **Data Migration:** It is assumed legacy data will be available in CSV format for the initial bulk import.
