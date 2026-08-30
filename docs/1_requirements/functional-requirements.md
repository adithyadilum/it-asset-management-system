# Functional Requirements Specification

This document outlines the functional requirements for the IDAMS (IT Asset Management System) enterprise platform, mapped across 5 core functional modules.

## Module 01: Core Platform & API Gateway

| ID               | Requirement Detail (The System Shall...)                                                                                                                                                                               |
| :--------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **REQ-FND-1.1**  | **(Authentication & SSO)** Support user authentication via secure local credentials (email/password) and integrate with Azure Active Directory (Entra ID) using OAuth 2.0 / NextAuth.js.                               |
| **REQ-FND-1.2**  | **(Web Security)** Enforce strict HTTPS (TLS 1.2+) for all system connections.                                                                                                                                         |
| **REQ-FND-1.3**  | **(Data Encryption)** Encrypt sensitive financial fields and software license keys at rest using AES-256.                                                                                                              |
| **REQ-FND-1.4**  | **(Role Mapping)** Maintain role-based access mapping for roles (GlobalAdmin, ITOperator, FinancialAuditor, Employee) dynamically linked to authenticated user sessions.                                               |
| **REQ-FND-1.5**  | **(Automated Access Control)** Automatically assign baseline system permissions (e.g., Financial Auditor, Employee) based on user directory group configurations.                                                      |
| **REQ-FND-1.6**  | **(Dynamic Categories)** Allow admins to create custom asset categories and automatically generate a locked, unique 3-letter Prefix Code (e.g., `LAP` for Laptops) to standardize future Asset IDs.                    |
| **REQ-FND-1.7**  | **(JSONB Schema Builder)** Provide a schema configuration interface allowing admins to define category-specific dynamic fields (specs/tracking) stored as JSONB metadata on categories.                                |
| **REQ-FND-1.8**  | **(Non-IT Asset Support)** Support asset categories for Furniture and Facilities, allowing for physical attributes (Dimensions, Material) rather than technical specs.                                                 |
| **REQ-FND-1.9**  | **(Master Data CRUD)** Provide interfaces to manage organizational Master Data, explicitly including Brands, Models, Locations (Building > Floor > Room hierarchy), Departments, and authorized Vendors.               |
| **REQ-FND-1.10** | **(Relational Safeguards)** Enforce database constraints that physically prevent the deletion of any Master Data entity if active assets are currently assigned to it.                                                 |
| **REQ-FND-1.11** | **(Immutable Audit Log)** Maintain an append-only, chronological system ledger of every CRUD event, automatically capturing the Actor, Timestamp, `X-Forwarded-For` IP Address, and a Before/After JSON state diff.    |
| **REQ-FND-1.12** | **(Open API Gateway)** Expose secure, rate-limited REST API endpoints (JSON) for external third-party systems to fetch read-only asset data or trigger assignment workflows.                                           |
| **REQ-FND-1.13** | **(SSO & Security Logs)** Ensure unsuccessful access attempts, blocked boundary actions, and session logins/logouts are securely caught and written to the audit log.                                                  |
| **REQ-FND-1.14** | **(Audit Log Viewer)** Provide a high-density, filterable log viewer allowing authorized users to search the immutable audit ledger by Actor, Action Type, IP, and Date Range, and export the filtered results to CSV. |
| **REQ-FND-1.15** | **(Prefix Collision Handling)** Automatically detect and resolve duplicate Prefix Codes during category creation by appending a numeric suffix (e.g., `LAP2`) to ensure uniqueness.                                    |
| **REQ-FND-1.16** | **(Custom Field Ordering)** Support drag-and-drop re-ordering of category-specific custom fields, persisting the display sequence for dynamic form rendering.                                                          |
| **REQ-FND-1.17** | **(Master Data Archival)** Allow admins to soft-archive unused Master Data entities by setting an `IsActive` flag to false, hiding them from active dropdowns while preserving historical references.                  |

## Module 02: Asset Registry & Onboarding

| ID               | Requirement Detail (The System Shall...)                                                                                                                                                 |
| :--------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **REQ-REG-2.1**  | **(Dynamic Registration)** Provide a registration form that automatically generates a unique Asset ID and dynamically renders custom fields based on category JSONB schemas.             |
| **REQ-REG-2.2**  | **(Financial Data)** Mandate the capture of Initial Cost, including base price, tax, and shipping, stored in a linked purchase record.                                                   |
| **REQ-REG-2.3**  | **(Multi-Currency Support)** Support the entry of purchase costs in multiple currencies (e.g., USD, NOK, LKR) linked with standard default ISO currency codes.                           |
| **REQ-REG-2.4**  | **(Invoice Uploads)** Allow the secure upload of digital Purchase Invoices (PDF) to Vercel Blob storage during asset registration.                                                       |
| **REQ-REG-2.5**  | **(Consumables Mode)** Bypass unique serialization for categories flagged as "Consumables" (e.g., HDMI cables), tracking stock via simple quantity counts.                               |
| **REQ-REG-2.6**  | **(High-Density Grid)** Display the inventory in a data table supporting sticky multi-column filtering by Serial Number, ID, Employee, and Status.                                       |
| **REQ-REG-2.7**  | **(Grid Operations)** Enable column visibility toggles and bulk-select checkboxes for batch actions within the main registry grid.                                                       |
| **REQ-REG-2.8**  | **(Slide-Out Vitals)** Display a comprehensive read-only view of a single asset's vitals, assignments, and lifecycle history in a right-side panel when an asset row is clicked.         |
| **REQ-REG-2.9**  | **(Bulk Import)** Support CSV format uploads for mass asset registration.                                                                                                                |
| **REQ-REG-2.10** | **(Partial Success Import)** Ensure the bulk import script skips invalid rows, imports valid ones, and generates a detailed error report without failing the entire batch.               |
| **REQ-REG-2.11** | **(QR Routing Engine)** Automatically generate a unique URL routing endpoint (e.g., `/assets/{id}`) and convert it into a downloadable 2D QR code upon asset creation.                   |
| **REQ-REG-2.12** | **(Print Layouts)** Provide a formatting engine to export selected QR codes as print files or A4 PDF grid layouts for standard sticker paper.                                            |
| **REQ-REG-2.13** | **(PWA Mobile Scanner)** Provide a mobile-responsive browser interface utilizing HTML5 scanner APIs to scan 1D barcodes and 2D QR codes.                                                 |
| **REQ-REG-2.14** | **(Tethered WebSockets)** Establish a real-time WebSocket connection allowing the mobile camera to inject scanned manufacturer serial numbers directly into active desktop input fields. |
| **REQ-REG-2.15** | **(Mobile Fallbacks)** Display a bottom-sheet UI with asset vitals when a QR is scanned via mobile, and block users from accessing complex desktop-only data grids on mobile devices.    |
| **REQ-REG-2.16** | **(Serial Number Uniqueness)** Enforce unique Serial Number validation during asset registration, blocking submission and displaying a descriptive error if a duplicate is detected.     |

## Module 03: Operations & Lifecycle

| ID               | Requirement Detail (The System Shall...)                                                                                                                                                                           |
| :--------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **REQ-OPS-3.1**  | **(Employee Portal)** Provide a "My Assets" self-service portal for standard employees to view equipment assigned strictly to their Azure AD profile.                                                              |
| **REQ-OPS-3.2**  | **(Digital Acceptance)** Dispatch automated notifications via Email to employees upon new hardware assignment, requiring them to digitally confirm custody.                                                        |
| **REQ-OPS-3.3**  | **(Asset Assignments)** Provide modal interfaces to assign available hardware strictly to a User or a Location. Assignment to generic "Teams" must be blocked.                                                     |
| **REQ-OPS-3.4**  | **(Asset Returns)** Process returns with a mandatory condition check (New, Excellent, Fair, Poor, Damaged) to dictate the asset's next lifecycle state.                                                            |
| **REQ-OPS-3.5**  | **(Bulk Location Transfer)** Support the bulk update of Asset Locations (e.g., moving 50 chairs from Room A to Room B) in a single transaction.                                                                    |
| **REQ-OPS-3.6**  | **(Lifecycle Status)** Track specific asset statuses (Available, Assigned, Defective, In Repair, Lost, Retired, Pending Disposal, Disposed) and allow admins to configure additional custom statuses.              |
| **REQ-OPS-3.7**  | **(Maintenance Ledger)** Provide a tabbed data grid separating triage tickets, active repair dispatches, and historical maintenance logs.                                                                          |
| **REQ-OPS-3.8**  | **(Triage Review)** Display a slide-out panel allowing IT Admins to assess user-reported damage alongside the asset's current status and details.                                                                  |
| **REQ-OPS-3.9**  | **(Vendor Dispatch)** Provide an "Initiate Repair" modal to route an asset to a Vendor or internal repairs, capturing the RMA Number, Ticket Type, and Estimated Cost.                                             |
| **REQ-OPS-3.10** | **(Close Repair)** Provide a "Close Repair" modal requiring the input of the Actual Final Cost and resolution notes upon completion, automatically updating the system's financial engine.                         |
| **REQ-OPS-3.11** | **(Request Asset Return)** Allow admins to send automated return-request notifications to current custodians via Email and Microsoft Teams, transitioning the asset status to "Requested" pending physical return. |
| **REQ-OPS-3.12** | **(Asset Chain of Custody)** Provide a chronological timeline view of all assignments, returns, and status changes for a single asset, accessible from the Asset Details panel, with CSV export capability.        |
| **REQ-OPS-3.13** | **(Status Override Rules)** Enforce state-machine rules for manual status changes (e.g., Lost, Stolen, Found), requiring mandatory justification notes and preventing invalid transitions.                         |
| **REQ-OPS-3.14** | **(Bulk Registry Operations)** Support the batch editing of Location or Status for multiple selected assets directly from the main registry grid in a single database transaction.                                 |
| **REQ-OPS-3.15** | **(Employee Issue Reporting)** Provide a self-service "Report Issue" interface within the Employee Portal for standard employees to submit damage tickets for assigned assets, routing to the Maintenance Ledger.  |

## Module 04: Secure Disposal & Compliance

| ID              | Requirement Detail (The System Shall...)                                                                                                                                                                       |
| :-------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **REQ-DSP-4.1** | **(Disposal Intake)** Allow IT Admins to flag defective assets for retirement, removing them from active circulation and routing them to a dedicated "Pending Disposals" queue.                                |
| **REQ-DSP-4.2** | **(Executive Review)** Provide a slide-out panel for Finance/Global Admins detailing the technical justification, original purchase cost, and depreciated book value of a pending disposal request.            |
| **REQ-DSP-4.3** | **(Reject & Re-route)** Provide a modal to reject a disposal request, requiring a mandatory justification note and forcing the re-routing of the asset to an active lifecycle status.                          |
| **REQ-DSP-4.4** | **(Compliance Hard Stop)** Enforce a final execution modal requiring exact Asset Tag text confirmation and physical security checkboxes (Data Wiped, Tags Removed) to unlock the submit button.                |
| **REQ-DSP-4.5** | **(Disposal Method)** Require the approving admin to capture the specific disposal reason (e.g., Sold, Stolen, E-waste, Donated) and disposal method during the final execution.                               |
| **REQ-DSP-4.6** | **(E-Waste Uploads)** Mandate a file upload of the PDF Certificate of Destruction (E-Waste Receipt) during the execution, storing it securely in Vercel Blob.                                                  |
| **REQ-DSP-4.7** | **(Bulk Disposal)** Allow the batch selection of identical assets to be processed through the Compliance Modal simultaneously, linking all retired assets to a single shared E-Waste PDF upload.               |
| **REQ-DSP-4.8** | **(Soft Delete Finality)** Ensure disposed assets are Soft Archived (`isArchived = true` and Status set to `'Disposed'`), locking all fields from future edits and hiding them from active registry endpoints. |

## Module 05: Financial Analytics & Automation

| ID               | Requirement Detail (The System Shall...)                                                                                                                                              |
| :--------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **REQ-FIN-5.1**  | **(KPI Dashboard)** Provide an admin landing page featuring real-time aggregate metric cards designed to stack natively on mobile and desktop.                                        |
| **REQ-FIN-5.2**  | **(Dashboard Widgets)** Explicitly include a "Recent Activity Log" and a "Frequently Failing Assets / Problem Asset Counts" widget on the main dashboard.                             |
| **REQ-FIN-5.3**  | **(Financials RBAC)** Restrict access to the dedicated Financials sidebar module strictly to Global Admins and Finance roles.                                                         |
| **REQ-FIN-5.4**  | **(Automated Depreciation)** Calculate and display the real-time "Current Book Value" of active hardware using straight-line depreciation math.                                       |
| **REQ-FIN-5.5**  | **(TCO Engine)** Aggregate the original purchase price with all historical maintenance costs to calculate the Total Cost of Ownership.                                                |
| **REQ-FIN-5.6**  | **(Salvage Ledger)** Maintain a ledger combining historical disposal records with actual salvage values recouped from recycling.                                                      |
| **REQ-FIN-5.7**  | **(Standard Reports)** Allow admins to generate report templates and export compiled data to PDF, CSV, and Excel formats.                                                             |
| **REQ-FIN-5.8**  | **(Proactive Alerts)** Send automated notifications via Email and Teams Webhooks to IT Staff for upcoming Warranty Expirations, Software License Renewals, and overdue asset returns. |
| **REQ-FIN-5.9**  | **(CRON Engine)** Run scheduled background tasks to scan the database for threshold breaches to trigger the alert system.                                                             |
| **REQ-FIN-5.10** | **(Notification Inbox)** Display a user-facing Bell Icon containing unread system alerts, featuring deep-links that route the user directly to the affected asset's details panel.    |
| **REQ-FIN-5.11** | **(Software Asset Management - SAM)** _(Core)_ Provide comprehensive software seat allocation, tracking license keys, seating limits, and seat assignment events linked to users.     |
