# Functional Requirements Specification

This document outlines the functional requirements for a centralized, IT Asset Management (ITAM) system.

<a id="core-asset-registry"></a>

## 1: Core Asset Registry

| ID              | Requirement Detail (The System Shall...)                                                                                                                                                                                                     |
| :-------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **REQ-REG-1.1** | **(Asset Creation)** Provide a **web-based form** to register new assets, mandating an **auto-generated unique Asset ID** to prevent duplicates; barcodes/RFID may optionally encode this ID.                                                |
| **REQ-REG-1.2** | **(Data Storage)** Store key asset attributes including Name, Category, Model, Serial Number (where applicable), Purchase Date, Vendor, and **Initial Cost including purchase price, tax, and shipping**.                                    |
| **REQ-REG-1.3** | **(Conditional Logic)** Dynamically adjust the registration form fields based on **Asset Type/Category** (e.g., Laptops → show Model/CPU/RAM; Tables → hide Serial/RAM; Software → hide hardware fields and show License Key/Seats).         |
| **REQ-REG-1.4** | **(Standardization)** Allow Admins to manage standardized dropdowns for **Brands and Models** via an admin console to prevent duplicate/misspelled entries (e.g., "Aplle").                                                                  |
| **REQ-REG-1.5** | **(Search & Filter)** Enable advanced filtering by **Serial Number, Asset ID, Employee, and Status** with a "List View" that displays these key columns by default.                                                                          |
| **REQ-REG-1.6** | **(Financials)** Record **Initial Cost** (Base Price + Tax + Shipping) with **Multi-Currency Support** (allowing entry in NOK, USD, or LKR) and support attaching related documents (e.g., PDF invoices).                                    |
| **REQ-REG-1.7** | **(Bulk Import)** Support **CSV/Excel import** for assets. If specific rows contain errors, the system must **skip only the invalid rows**, import the valid ones, and generate an error report for the failed entries (No "Undo" required). |
| **REQ-REG-1.8** | **(Consumables & Cloud)** Support a "Quantity Only" tracking mode for low-value items (e.g., HDMI Cables) without unique IDs.                                                                                                                |

<a id="user-access-security"></a>

## 2: User Access & Security

| ID              | Requirement Detail (The System Shall...)                                                                                                                                                                                           |
| :-------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **REQ-SEC-2.1** | **(SSO Integration)** Authenticate users exclusively via **Azure AD (SSO)**. **External users** are strictly prohibited from accessing the system.                                                                                 |
| **REQ-SEC-2.2** | **(Role Mapping)** Automatically assign system permissions (e.g., **Global Admin, IT Admin, Admin/Facilities Admin, Finance Read-Only, General Employee**) based on Azure AD Group attributes received from the Identity Provider. |
| **REQ-SEC-2.3** | **(Web Security)** Enforce HTTPS (TLS 1.2+) for all connections and encrypt **financial fields and software license keys** at rest.                                                                                                |

<a id="tracking-operations"></a>

## 3: Tracking & Operations

| ID              | Requirement Detail (The System Shall...)                                                                                                                                                                                                                                                       |
| :-------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **REQ-OPS-3.1** | **(Assignment)** Allow assigning assets to a **User** (via Azure AD lookup) or a **Location** (defined by a hierarchy: **Building > Floor > Room**). Assignment to generic "Teams" is out of scope.                                                                                            |
| **REQ-OPS-3.2** | **(Assignment & Return Tracking)** Provide a simple interface to record asset assignment and return (no service request workflow), and enable sending automated **email/Teams notifications** to users with the list of assets to return and due dates.                                        |
| **REQ-OPS-3.3** | **(Audit Log)** Maintain an immutable, chronological history log of every change (e.g., "Asset moved from IT to Finance by User John Doe on Dec 12").                                                                                                                                          |
| **REQ-OPS-3.4** | **(Lifecycle Status)** Track the specific status of an asset (e.g., **Available, Assigned, Defective, In Repair, Disposed, Donated, Lost, Missing**) and allow admins to configure additional statuses as needed. Deleted assets must be **Soft Deleted (Archived)**, not permanently removed. |

## 4: External Integration (API) & Reporting

| ID              | Requirement Detail (The System Shall...)                                                                                                                                                                             |
| :-------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **REQ-REP-4.1** | **(Admin Dashboard)** Display a dashboard upon login featuring: **Pending Approvals** (for disposals/status changes), **Recent Activity Log**, and **Problem Asset Counts** (assets flagged as defective).           |
| **REQ-INT-4.2** | **(External API)** Expose secure, documented **REST API endpoints** (JSON) allows external systems (HR, Finance) to fetch asset details (Read-Only).                                                                 |
| **REQ-REP-4.3** | **(Standard Reporting)** Generate HTML inventory reports (Inventory by Dept, Assets by Status, **Exports for Auditors**) and support **export of all reports to industry-standard formats (PDF, Excel, or CSV)**.    |
| **REQ-FIN-4.4** | **(Depreciation – Optional)** _(Optional / lower priority)_ Automatically calculate current **Book Value** based on Purchase Cost and configured depreciation rules (Straight Line), for future Finance integration. |
| **REQ-USR-4.5** | **(Employee Portal)** Provide a "My Assets" read-only view for general employees to see equipment assigned to their profile.                                                                                         |

## 5: Automation & Optimization

| ID               | Requirement Detail (The System Shall...)                                                                                                                                                                                            |
| :--------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **REQ-AUTO-5.1** | **(Digital Acceptance)** Trigger an automated workflow to notify employees by email/Teams when a new asset is assigned, and optionally allow a **simple web/email confirmation** of custody (no formal e-signature required).       |
| **REQ-AUTO-5.2** | **(Proactive Alerts)** Send email/Teams notifications to IT Staff for upcoming Warranty Expirations or License Renewals, and for **overdue asset returns** where users have not returned assets by the expected date.               |
| **REQ-MNT-5.3**  | **(Maintenance)** Record and store **maintenance schedules and detailed service history** for each asset (including service dates, vendor, and repair costs), and make **frequently failing assets visible on dashboards/reports**. |
| **REQ-OPS-5.4**  | **(Disposal Workflow)** Enforce an approval step for the \"Disposed\" status (e.g., Manager/IT approval) and **capture disposal reasons** (Sold, Stolen, E‑waste, etc.), with ability to attach supporting documents.               |
| **REQ-AUTO-5.5** | **(Warranty Sync – Optional)** _(Optional / nice-to-have)_ Periodically query external **Vendor APIs (Dell/HP/Lenovo)** using the Serial Number to automatically update Warranty Expiry dates.                                      |

[Back to Root](../../README.md)
