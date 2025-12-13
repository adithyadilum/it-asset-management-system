# Functional Requirements Specification

This document outlines the functional requirements for a centralized, IT Asset Management (ITAM) system.

<a id="core-asset-registry"></a>

## 1: Core Asset Registry

| ID              | Requirement Detail (The System Shall...)                                                                                                                                                    |
| :-------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **REQ-REG-1.1** | **(Asset Creation)** Provide a **web-based form** to register new assets, mandating a unique identifier (Asset ID, Barcode, or RFID tag) to prevent duplicates.                             |
| **REQ-REG-1.2** | **(Data Storage)** Store key asset attributes including Name, Category, Model, Serial Number, Purchase Date, Vendor, and **Initial Cost**.                                                  |
| **REQ-REG-1.3** | **(Conditional Logic)** Dynamically adjust the registration form fields based on "Asset Type" (e.g., Select "Software" → Hide "RAM/HDD" → Show "License Key/Seats").                        |
| **REQ-REG-1.4** | **(Categorization)** Allow administrators to configure and manage Asset Categories (e.g., Laptops, Servers, SaaS, Mobile) to standardize data entry.                                        |
| **REQ-REG-1.5** | **(Search & Filter)** Enable **advanced searching, filtering, and sorting** of assets by multiple criteria (**Status, Department, Type, Location**, etc.) with sub-2-second response times. |
| **REQ-REG-1.6** | **(Procurement Details)** Record comprehensive procurement details including **Vendor, Purchase Order (PO) number, Invoice reference, and final Purchase Cost** during registration.        |

<a id="user-access-security"></a>

## 2: User Access & Security

| ID              | Requirement Detail (The System Shall...)                                                                                                                                                              |
| :-------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **REQ-SEC-2.1** | **(SSO Integration)** Authenticate users **exclusively** by integrating with the company’s existing Identity Provider (Active Directory/Okta/LDAP) via SAML or OIDC. **(No internal user creation)**. |
| **REQ-SEC-2.2** | **(Role Mapping)** Automatically assign system permissions (e.g., "Admin", "Read-Only") based on the user's Group attributes received from the Identity Provider.                                     |
| **REQ-SEC-2.3** | **(Web Security)** Enforce HTTPS (TLS 1.2+) for all connections and encrypt sensitive financial/license data at rest.                                                                                 |

<a id="tracking-operations"></a>

## 3: Tracking & Operations

| ID              | Requirement Detail (The System Shall...)                                                                                                                                                |
| :-------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **REQ-OPS-3.1** | **(Assignment)** Allow assigning an asset to a specific **Employee** (mapped from the SSO user list), Location, Department, or Cost Center.                                             |
| **REQ-OPS-3.2** | **(Check-in/Check-out)** Implement **check-in/check-out tracking** to record asset movement, current location, and custodian. This interface must be mobile-responsive for technicians. |
| **REQ-OPS-3.3** | **(Audit Log)** Maintain an immutable, chronological history log of every change (e.g., "Asset moved from IT to Finance by User John Doe on Dec 12").                                   |
| **REQ-OPS-3.4** | **(Lifecycle Status)** Track the specific status of an asset (e.g., Ordered → In Stock → Assigned → In Repair → Disposed).                                                              |

## 4: External Integration (API) & Reporting

| ID              | Requirement Detail (The System Shall...)                                                                                                                                                |
| :-------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **REQ-INT-4.1** | **(External API)** Expose secure, documented **REST API endpoints** (JSON) allows external systems (HR, Finance) to fetch asset details (Read-Only).                                    |
| **REQ-REP-4.2** | **(Standard Reporting)** Generate HTML inventory reports (Inventory by Dept, Assets by Status) and support **export of all reports to industry-standard formats (PDF, Excel, or CSV)**. |
| **REQ-FIN-4.3** | **(Depreciation)** Automatically calculate current **Book Value** based on Purchase Cost and configured depreciation rules (Straight Line).                                             |
| **REQ-USR-4.4** | **(Employee Portal)** Provide a "My Assets" read-only view for general employees to see equipment assigned to their profile.                                                            |

## 5: Automation & Optimization

| ID               | Requirement Detail (The System Shall...)                                                                                                                             |
| :--------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **REQ-AUTO-5.1** | **(Digital Acceptance)** Trigger an automated workflow requiring employees to "Digitally Sign/Accept" custody of a newly assigned asset via the web portal.          |
| **REQ-AUTO-5.2** | **(Proactive Alerts)** Send email/in-app notifications to IT Staff for upcoming Warranty Expirations or License Renewals.                                            |
| **REQ-MNT-5.3**  | **(Maintenance)** Record and store **maintenance schedules and detailed service history** for each asset (including service dates, vendor, and repair costs).        |
| **REQ-OPS-5.4**  | **(Disposal Workflow)** Enforce a strict approval workflow for the "Disposed" status (requires Manager approval) to prevent theft/loss.                              |
| **REQ-VIS-5.5**  | **(Dashboards)** Display a graphical dashboard on the Admin home page (Asset Distribution charts, Total Value, Alert counts).                                        |
| **REQ-AUTO-5.6** | **(Warranty Sync)** _(Optional)_ Periodically query external **Vendor APIs (Dell/HP/Lenovo)** using the Serial Number to automatically update Warranty Expiry dates. |

[Back to Root](../../README.md)
