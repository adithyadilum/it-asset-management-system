# User Story Specifications

This directory contains the detailed User Story Specifications for the IT Asset Management System. Each subdirectory corresponds to a major functional module, and each file within covers a single Epic.

## Module Overview

| Module | Directory                                                                    | Epics | Description                                                                            |
| :----- | :--------------------------------------------------------------------------- | :---: | :------------------------------------------------------------------------------------- |
| **01** | [Core Platform & API Gateway](./01-core-platform-and-api/)                   |   6   | Authentication, RBAC, master data, audit log, integrations, and registries.            |
| **02** | [Asset Registry & Onboarding](./02-asset-registry-and-onboarding/)           |   6   | Asset registration, details view, tagging, bulk import, scanning, and employee portal. |
| **03** | [Operations & Lifecycle](./03-operations-and-lifecycle/)                     |   4   | Assignment, returns, maintenance, and status management.                               |
| **04** | [Secure Disposal & Compliance](./04-secure-disposal-and-compliance/)         |   3   | Disposal requests, execution, and history/archival.                                    |
| **05** | [Financial Analytics & Automation](./05-financial-analytics-and-automation/) |   4   | KPI dashboard, reporting, financial ledgers, and notifications.                        |

## All Epics

### Module 01 — Core Platform & API Gateway

| Epic | Title                                       | File                                                                                           |
| :--- | :------------------------------------------ | :--------------------------------------------------------------------------------------------- |
| 1    | Authentication & Single Sign-On             | [epic-01](./01-core-platform-and-api/epic-01-authentication-and-single-sign-on.md)             |
| 2    | Role-Based Access Control                   | [epic-02](./01-core-platform-and-api/epic-02-role-based-access-control.md)                     |
| 3    | Flexible Asset Categorization & Master Data | [epic-03](./01-core-platform-and-api/epic-03-flexible-asset-categorization-and-master-data.md) |
| 4    | Automated System Audit Log                  | [epic-04](./01-core-platform-and-api/epic-04-automated-system-audit-log.md)                    |
| 5    | Integrations & Automation                   | [epic-05](./01-core-platform-and-api/epic-05-integrations-and-automation.md)                   |
| 6    | Asset Registries & Data Grids               | [epic-06](./01-core-platform-and-api/epic-06-asset-registries-and-data-grids.md)               |

### Module 02 — Asset Registry & Onboarding

| Epic | Title                   | File                                                                             |
| :--- | :---------------------- | :------------------------------------------------------------------------------- |
| 7    | Asset Registration      | [epic-07](./02-asset-registry-and-onboarding/epic-07-asset-registration.md)      |
| 8    | Asset Details View      | [epic-08](./02-asset-registry-and-onboarding/epic-08-asset-details-view.md)      |
| 9    | Physical Tagging        | [epic-09](./02-asset-registry-and-onboarding/epic-09-physical-tagging.md)        |
| 10   | Bulk Asset Registration | [epic-10](./02-asset-registry-and-onboarding/epic-10-bulk-asset-registration.md) |
| 11   | Barcode & QR Scanning   | [epic-11](./02-asset-registry-and-onboarding/epic-11-barcode-and-qr-scanning.md) |
| 12   | Employee Portal         | [epic-12](./02-asset-registry-and-onboarding/epic-12-employee-portal.md)         |

### Module 03 — Operations & Lifecycle

| Epic | Title                             | File                                                                                    |
| :--- | :-------------------------------- | :-------------------------------------------------------------------------------------- |
| 13   | Asset Assignment                  | [epic-13](./03-operations-and-lifecycle/epic-13-asset-assignment.md)                    |
| 14   | Asset Returns                     | [epic-14](./03-operations-and-lifecycle/epic-14-asset-returns.md)                       |
| 15   | Maintenance & Repair              | [epic-15](./03-operations-and-lifecycle/epic-15-maintenance-and-repair.md)              |
| 16   | Asset History & Status Management | [epic-16](./03-operations-and-lifecycle/epic-16-asset-history-and-status-management.md) |

### Module 04 — Secure Disposal & Compliance

| Epic | Title                     | File                                                                                |
| :--- | :------------------------ | :---------------------------------------------------------------------------------- |
| 17   | Disposal Requests         | [epic-17](./04-secure-disposal-and-compliance/epic-17-disposal-requests.md)         |
| 18   | Executing Asset Disposals | [epic-18](./04-secure-disposal-and-compliance/epic-18-executing-asset-disposals.md) |
| 19   | Disposal History          | [epic-19](./04-secure-disposal-and-compliance/epic-19-disposal-history.md)          |

### Module 05 — Financial Analytics & Automation

| Epic | Title                             | File                                                                                                   |
| :--- | :-------------------------------- | :----------------------------------------------------------------------------------------------------- |
| 20   | Main KPI Dashboard                | [epic-20](./05-financial-analytics-and-automation/epic-20-global-kpi-dashboard.md)                     |
| 21   | Standard Reporting                | [epic-21](./05-financial-analytics-and-automation/epic-21-standard-reporting-engine.md)                |
| 22   | Financial Ledgers & Cost Analysis | [epic-22](./05-financial-analytics-and-automation/epic-22-financial-ledgers-and-cost-analysis.md)      |
| 23   | Automated Alerts & Notification   | [epic-23](./05-financial-analytics-and-automation/epic-23-automated-alerts-and-notification-engine.md) |

---

[< Back to Requirements](../README.md)
