# Functional Requirements Specification

This document outlines the functional requirements for the IDAMS (IT Asset Management System) enterprise platform, mapped across 5 core architectural Epics.

## Epic 1: Platform Foundation, Master Data & API Gateway

| ID               | Requirement Detail (The System Shall...)                                                                                                                                                                            |
| :--------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **REQ-FND-1.1**  | **(SSO Authentication)** Authenticate users exclusively via Azure Active Directory (Entra ID) using OAuth 2.0. Local credential storage and external guest users are strictly prohibited.                           |
| **REQ-FND-1.2**  | **(Web Security)** Enforce strict HTTPS (TLS 1.2+) for all system connections.                                                                                                                                      |
| **REQ-FND-1.3**  | **(Data Encryption)** Encrypt sensitive financial fields and software license keys at rest using AES-256.                                                                                                           |
| **REQ-FND-1.4**  | **(Role Mapping UI)** Provide a master-detail split-view interface for Global Admins to map active directory users to specific system roles.                                                                        |
| **REQ-FND-1.5**  | **(Automated Access Control)** Automatically assign baseline system permissions (e.g., Finance Read-Only, General Employee) based on Azure AD Group attributes.                                                     |
| **REQ-FND-1.6**  | **(Dynamic Categories)** Allow admins to create custom asset categories and automatically generate a locked, unique 3-letter Prefix Code (e.g., `LAP` for Laptops) to standardize future Asset IDs.                 |
| **REQ-FND-1.7**  | **(EAV Schema Builder)** Provide a custom panel allowing admins to define category-specific custom inputs (Text, Number, Dropdown) that dynamically render on forms.                                                |
| **REQ-FND-1.8**  | **(Non-IT Asset Support)** Support asset categories for Furniture and Facilities, allowing for physical attributes (Dimensions, Material) rather than technical specs.                                              |
| **REQ-FND-1.9**  | **(Master Data CRUD)** Provide interfaces to manage organizational Master Data, explicitly including Brands, Models, Locations (Building > Floor > Room hierarchy), Departments, and authorized Vendors.            |
| **REQ-FND-1.10** | **(Relational Safeguards)** Enforce database constraints that physically prevent the deletion of any Master Data entity if active assets are currently assigned to it.                                              |
| **REQ-FND-1.11** | **(Immutable Audit Log)** Maintain an append-only, chronological system ledger of every CRUD event, automatically capturing the Actor, Timestamp, `X-Forwarded-For` IP Address, and a Before/After JSON state diff. |
| **REQ-FND-1.12** | **(Open API Gateway)** Expose secure, rate-limited REST API endpoints (JSON) for external third-party systems to fetch read-only asset data or trigger assignment workflows.                                        |
| **REQ-FND-1.13** | **(API Key & Webhooks)** Allow Admins to generate/revoke hashed API keys and register external target URLs for outbound Webhook payloads triggered by system events.                                                |
| **REQ-FND-1.14** | **(Audit Log Viewer)** Provide a high-density, filterable log viewer allowing authorized users to search the immutable audit ledger by Actor, Action Type, and Date Range, and export the filtered results to CSV.  |
| **REQ-FND-1.15** | **(Prefix Collision Handling)** Automatically detect and resolve duplicate Prefix Codes during category creation by appending a numeric suffix (e.g., `LAP2`) to ensure uniqueness.                                 |
| **REQ-FND-1.16** | **(Custom Field Ordering)** Support drag-and-drop re-ordering of category-specific custom fields, persisting the display sequence for dynamic form rendering.                                                       |
| **REQ-FND-1.17** | **(Master Data Archival)** Allow admins to soft-archive unused Master Data entities by setting an `IsActive` flag to false, hiding them from active dropdowns while preserving historical references.               |

## Epic 2: Asset Registry & Tethered Scanning System

| ID               | Requirement Detail (The System Shall...)                                                                                                                                                 |
| :--------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **REQ-REG-2.1**  | **(Dynamic Registration)** Provide a registration form that automatically generates a unique Asset ID and dynamically renders custom fields based on the selected Epic 1 category.       |
| **REQ-REG-2.2**  | **(Financial Data)** Mandate the capture of Initial Cost, including base price, tax, and shipping.                                                                                       |
| **REQ-REG-2.3**  | **(Multi-Currency Support)** Support the entry of financial data in multiple currencies, explicitly including NOK, USD, and LKR.                                                         |
| **REQ-REG-2.4**  | **(Invoice Uploads)** Allow the secure upload of digital Purchase Invoices (PDF) to cloud storage during asset registration.                                                             |
| **REQ-REG-2.5**  | **(Consumables Mode)** Bypass unique serialization for categories flagged as "Consumables" (e.g., HDMI cables), tracking them strictly via a centralized Quantity Stock integer.         |
| **REQ-REG-2.6**  | **(High-Density Grid)** Display the inventory in a data table supporting sticky multi-column filtering by Serial Number, ID, Employee, and Status.                                       |
| **REQ-REG-2.7**  | **(Grid Operations)** Enable column visibility toggles and bulk-select checkboxes for batch actions within the main registry grid.                                                       |
| **REQ-REG-2.8**  | **(Slide-Out Vitals)** Display a comprehensive read-only view of a single asset's vitals, assignments, and lifecycle history in a right-side panel when an asset row is clicked.         |
| **REQ-REG-2.9**  | **(Bulk Import)** Support CSV and Excel format uploads for mass asset registration.                                                                                                      |
| **REQ-REG-2.10** | **(Partial Success Import)** Ensure the bulk import script skips invalid rows, imports valid ones, and generates a downloadable error report without failing the entire batch.           |
| **REQ-REG-2.11** | **(QR Routing Engine)** Automatically generate a unique URL routing endpoint (e.g., `idams.tiqri.com/asset/AST-0142`) and convert it into a downloadable 2D QR code upon asset creation. |
| **REQ-REG-2.12** | **(Print Layouts)** Provide a formatting engine to export selected QR codes as single-tag thermal print files (Zebra/Dymo) or bulk A4 PDF grid layouts for standard sticker paper.       |
| **REQ-REG-2.13** | **(PWA Mobile Scanner)** Provide a mobile-responsive browser interface utilizing HTML5 `getUserMedia` APIs to scan 1D barcodes and 2D QR codes.                                          |
| **REQ-REG-2.14** | **(Tethered WebSockets)** Establish a real-time WebSocket connection allowing the mobile camera to inject scanned manufacturer serial numbers directly into active desktop input fields. |
| **REQ-REG-2.15** | **(Mobile Fallbacks)** Display a bottom-sheet UI with asset vitals when a QR is scanned via mobile, and block users from accessing complex desktop-only data grids on mobile devices.    |
| **REQ-REG-2.16** | **(Serial Number Uniqueness)** Enforce unique Serial Number validation during asset registration, blocking submission and displaying a descriptive error if a duplicate is detected.     |

## Epic 3: IT Operations & Hardware Maintenance

| ID               | Requirement Detail (The System Shall...)                                                                                                                                                                           |
| :--------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **REQ-OPS-3.1**  | **(Employee Portal)** Provide a "My Assets" self-service portal for standard employees to view equipment assigned strictly to their Azure AD profile.                                                              |
| **REQ-OPS-3.2**  | **(Digital Acceptance)** Dispatch automated notifications via Email and Microsoft Teams to employees upon new hardware assignment, requiring them to digitally confirm custody.                                    |
| **REQ-OPS-3.3**  | **(Asset Assignments)** Provide modal interfaces to assign available hardware strictly to a User or a Location. Assignment to generic "Teams" must be blocked.                                                     |
| **REQ-OPS-3.4**  | **(Asset Returns)** Process returns with a mandatory condition check (Working vs. Defective) to dictate the asset's next lifecycle state.                                                                          |
| **REQ-OPS-3.5**  | **(Bulk Location Transfer)** Support the bulk update of Asset Locations (e.g., moving 50 chairs from Room A to Room B) in a single transaction.                                                                    |
| **REQ-OPS-3.6**  | **(Lifecycle Status)** Track specific asset statuses (Available, Assigned, Defective, In Repair, Disposed, Donated, Lost, Missing) and allow admins to configure additional custom statuses.                       |
| **REQ-OPS-3.7**  | **(Maintenance Ledger)** Provide a tabbed data grid separating triage tickets ("Pending Review"), dispatched hardware ("Active Repairs"), and historical maintenance logs.                                         |
| **REQ-OPS-3.8**  | **(Triage Review)** Display a slide-out panel allowing IT Admins to assess user-reported damage alongside the asset's current financial book value and warranty status.                                            |
| **REQ-OPS-3.9**  | **(Vendor Dispatch)** Provide an "Initiate Repair" modal to route an asset to a Vendor, capturing the RMA Ticket Number, Estimated Cost, and Expected Return Date.                                                 |
| **REQ-OPS-3.10** | **(Cost Reconciliation)** Provide a "Close Repair" modal requiring the input of the Actual Final Cost upon the asset's return, automatically updating the system's financial engine.                               |
| **REQ-OPS-3.11** | **(Request Asset Return)** Allow admins to send automated return-request notifications to current custodians via Email and Microsoft Teams, transitioning the asset status to "Requested" pending physical return. |
| **REQ-OPS-3.12** | **(Asset Chain of Custody)** Provide a chronological timeline view of all assignments, returns, and status changes for a single asset, accessible from the Asset Details panel, with CSV export capability.        |
| **REQ-OPS-3.13** | **(Status Override Rules)** Enforce state-machine rules for manual status changes (e.g., Lost, Stolen, Found), requiring mandatory justification notes and preventing invalid transitions.                         |
| **REQ-OPS-3.14** | **(Bulk Registry Operations)** Support the batch editing of Location or Status for multiple selected assets directly from the main registry grid in a single database transaction.                                 |
| **REQ-OPS-3.15** | **(Employee Issue Reporting)** Provide a self-service "Report Issue" interface within the Employee Portal for standard employees to submit damage tickets for assigned assets, routing to the Maintenance Ledger.  |

## Epic 4: Compliance-Driven Disposals

| ID              | Requirement Detail (The System Shall...)                                                                                                                                                                                   |
| :-------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **REQ-DSP-4.1** | **(Disposal Intake)** Allow IT Admins to flag defective assets for retirement, removing them from active circulation and routing them to a dedicated "Pending Disposals" queue.                                            |
| **REQ-DSP-4.2** | **(Executive Review)** Provide a slide-out panel for Finance/Global Admins detailing the technical justification, original purchase cost, and depreciated book value of a pending disposal request.                        |
| **REQ-DSP-4.3** | **(Reject & Re-route)** Provide a modal to reject a disposal request, requiring a mandatory justification note and forcing the re-routing of the asset to an active lifecycle status.                                      |
| **REQ-DSP-4.4** | **(Compliance Hard Stop)** Enforce a final execution modal requiring exact Asset ID text confirmation and physical security checkboxes (Data Wiped, Tags Removed) to unlock the submit button.                             |
| **REQ-DSP-4.5** | **(Disposal Method)** Require the approving admin to capture the specific disposal reason (e.g., Sold, Stolen, E-waste, Donated) during the final execution.                                                               |
| **REQ-DSP-4.6** | **(E-Waste Uploads)** Mandate a Drag-and-Drop file upload of the PDF Certificate of Destruction (E-Waste Receipt) during the Hard Stop execution, storing it in AWS S3 / Azure Blob.                                       |
| **REQ-DSP-4.7** | **(Bulk Disposal)** Allow the batch selection of identical assets to be processed through the Compliance Modal simultaneously, linking all retired assets to a single shared E-Waste PDF upload.                           |
| **REQ-DSP-4.8** | **(Soft Delete Finality)** Ensure disposed assets are Soft Deleted (Archived), locking all fields from future edits and hiding them from active registry endpoints while preserving the data for 7-year historical audits. |

## Epic 5: Financial Intelligence & Automated Alerts

| ID               | Requirement Detail (The System Shall...)                                                                                                                                                |
| :--------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **REQ-FIN-5.1**  | **(KPI Dashboard)** Provide an admin landing page featuring real-time aggregate metric cards designed to stack natively on mobile and desktop.                                          |
| **REQ-FIN-5.2**  | **(Dashboard Widgets)** Explicitly include a "Recent Activity Log" and a "Frequently Failing Assets / Problem Asset Counts" widget on the main dashboard.                               |
| **REQ-FIN-5.3**  | **(Financials RBAC)** Restrict access to the dedicated Financials sidebar module strictly to Global Admins and Finance roles.                                                           |
| **REQ-FIN-5.4**  | **(Automated Depreciation)** Calculate and display the real-time "Current Book Value" of all active hardware in a dedicated ledger using straight-line depreciation math.               |
| **REQ-FIN-5.5**  | **(TCO Engine)** Aggregate the original purchase price with all historical maintenance costs (from Epic 3) to calculate the Total Cost of Ownership.                                    |
| **REQ-FIN-5.6**  | **(Salvage Ledger)** Maintain a "Write-Offs & Salvage" ledger combining historical disposal records with any manually inputted monetary salvage values recouped from e-waste recycling. |
| **REQ-FIN-5.7**  | **(Standard Reports)** Allow admins to generate HTML inventory reports (Inventory by Dept, Assets by Status) and export them to PDF, CSV, and Excel formats.                            |
| **REQ-FIN-5.8**  | **(Proactive Alerts)** Send automated notifications via Email and Microsoft Teams to IT Staff for upcoming Warranty Expirations, Software License Renewals, and overdue asset returns.  |
| **REQ-FIN-5.9**  | **(CRON Engine)** Run scheduled background tasks (nightly) to scan the database for threshold breaches to trigger the alert system.                                                     |
| **REQ-FIN-5.10** | **(Notification Inbox)** Display a user-facing Bell Icon containing unread system alerts, featuring deep-links that route the user directly to the affected asset's details panel.      |
| **REQ-FIN-5.11** | **(Vendor API Sync)** _(optional)_ Periodically query external Vendor APIs (e.g., Dell, HP, Lenovo) using the Serial Number to automatically fetch and update Warranty Expiry dates.    |
