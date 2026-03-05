# Data Flow Diagram

This document illustrates how data moves through the Integrated Digital Asset Management System (IDAMS) across all five architectural Epics.

## Table of Contents

- [1. Level 0 — Context Data Flow](#1-level-0--context-data-flow)
- [2. Level 1 — System-Wide Data Flow](#2-level-1--system-wide-data-flow)
- [3. Level 2 — Epic-Specific Data Flows](#3-level-2--epic-specific-data-flows)
  - [3.1 Authentication & Access Control (Epic 1)](#31-authentication--access-control-epic-1)
  - [3.2 Asset Registration & Scanning (Epic 2)](#32-asset-registration--scanning-epic-2)
  - [3.3 Operations & Maintenance (Epic 3)](#33-operations--maintenance-epic-3)
  - [3.4 Secure Disposal & Compliance (Epic 4)](#34-compliance-driven-disposals-epic-4)
  - [3.5 Financial Intelligence & Alerts (Epic 5)](#35-financial-intelligence--alerts-epic-5)
- [4. Data Store Inventory](#4-data-store-inventory)
- [5. External Entity Inventory](#5-external-entity-inventory)
- [6. Traceability Matrix](#6-traceability-matrix)

## 1. Level 0 — Context Data Flow

The highest-level view showing IDAMS as a single process exchanging data with all external entities.

```mermaid
flowchart LR
    Admin([Global Admin])
    DeptHead([Department Head])
    Employee([Employee])
    AzureAD[(Azure AD\nEntra ID)]
    Notify[(Notification\nServices)]
    HRFinance[(HR / Finance\nSystems)]
    VendorAPI[(Vendor APIs)]
    BlobStore[(File Storage\nAzure Blob / S3)]

    Admin -- "Asset data, master data,\nrole mappings, disposal approvals" --> IDAMS
    IDAMS -- "Dashboards, reports,\ngrid views, QR codes" --> Admin

    DeptHead -- "Disposal reviews,\ndepartment queries" --> IDAMS
    IDAMS -- "Department asset views,\napproval requests" --> DeptHead

    Employee -- "Custody confirmations,\nissue reports" --> IDAMS
    IDAMS -- "My Assets view,\nassignment notifications" --> Employee

    AzureAD -- "OAuth tokens,\nAD group memberships" --> IDAMS
    IDAMS -- "Auth requests,\ntoken validation" --> AzureAD

    IDAMS -- "Custody alerts, warranty alerts,\nreturn requests" --> Notify
    HRFinance -- "API key + data requests" --> IDAMS
    IDAMS -- "Read-only asset/financial JSON,\nwebhook payloads" --> HRFinance

    VendorAPI -- "Warranty expiry data" --> IDAMS
    IDAMS -- "Serial number queries" --> VendorAPI

    IDAMS -- "PDF invoices, e-waste certs,\nQR assets" --> BlobStore
    BlobStore -- "File downloads" --> IDAMS

    style IDAMS fill:#4A90D9,stroke:#2C5F8A,color:#fff
```

## 2. Level 1 — System-Wide Data Flow

Decomposes the IDAMS process into its core internal processes and data stores, showing how data flows between services, the database, file storage, and external entities.

```mermaid
flowchart TB
    %% External Entities
    Admin([Global Admin / IT Admin])
    Employee([Employee])
    AzureAD[(Azure AD)]
    Notify[(Email / Teams)]
    ExtAPI([External Systems])
    VendorAPI[(Vendor APIs)]
    Blob[(File Storage)]

    %% Processes
    subgraph IDAMS ["IDAMS Platform"]
        direction TB
        P1[/"1.0\nAuth & RBAC\nMiddleware"/]
        P2[/"2.0\nMaster Data\nService"/]
        P3[/"3.0\nRegistry\nService"/]
        P4[/"4.0\nOperations\nService"/]
        P5[/"5.0\nDisposal\nService"/]
        P6[/"6.0\nFinancial\nService"/]
        P7[/"7.0\nNotification\nService"/]
        P8[/"8.0\nAudit\nLogger"/]
        P9[/"9.0\nBackground\nWorker"/]
        P10[/"10.0\nAPI Gateway\nController"/]

        %% Data Stores
        DB1[(D1: Assets &\nRegistrations)]
        DB2[(D2: Master Data)]
        DB3[(D3: Assignments &\nMaintenance)]
        DB4[(D4: Disposals)]
        DB5[(D5: Financial\nLedgers)]
        DB6[(D6: Audit Log\n_Immutable_)]
        DB7[(D7: Notifications\nInbox)]
    end

    %% Auth flows
    Admin -- "JWT token" --> P1
    Employee -- "JWT token" --> P1
    P1 -- "Token validation" --> AzureAD
    AzureAD -- "AD groups, claims" --> P1
    P1 -- "Validated request" --> P2 & P3 & P4 & P5 & P6

    %% Master Data
    P2 -- "Categories, locations,\nbrands, vendors" --> DB2
    DB2 -- "Schema definitions,\nmaster data lookups" --> P3

    %% Registry
    P3 -- "Asset records, costs,\ncustom values" --> DB1
    P3 -- "Invoices, QR codes" --> Blob
    DB1 -- "Asset data" --> P4 & P5 & P6

    %% Operations
    P4 -- "Assignments, returns,\nmaintenance tickets" --> DB3
    P4 -- "Assignment/return events" --> P7
    P4 -- "Status changes" --> P8

    %% Disposal
    P5 -- "Disposal records" --> DB4
    P5 -- "E-waste certificates" --> Blob
    P5 -- "Disposal review alerts" --> P7
    P5 -- "Disposal events" --> P8

    %% Financial
    DB1 -- "Purchase costs" --> P6
    DB3 -- "Maintenance costs" --> P6
    DB4 -- "Salvage values" --> P6
    P6 -- "Depreciation, TCO,\nsalvage ledger" --> DB5
    P6 -- "Financial threshold alerts" --> P7

    %% Notifications
    P7 -- "Email / Teams payloads" --> Notify
    P7 -- "Inbox entries" --> DB7
    DB7 -- "Unread alerts" --> Employee
    DB7 -- "Unread alerts" --> Admin

    %% Audit (all services log)
    P2 & P3 & P4 & P5 -- "Before/after\nJSON diffs" --> P8
    P8 -- "Append-only entries" --> DB6

    %% Background Worker
    P9 -- "Warranty/license scan" --> DB1
    P9 -- "Overdue return scan" --> DB3
    P9 -- "Threshold alerts" --> P7
    P9 -- "Serial number queries" --> VendorAPI

    %% API Gateway
    ExtAPI -- "API key + request" --> P10
    P10 -- "Read-only asset JSON,\nwebhook payloads" --> ExtAPI
    P10 -- "Warranty data fetch" --> VendorAPI
```

## 3. Level 2 Epic-Specific Data Flows

### 3.1 Authentication & Access Control (Epic 1)

Covers SSO login, RBAC enforcement, and AD group-to-role mapping (REQ-FND-1.1–1.5).

```mermaid
flowchart LR
    User([User]) -- "1. Login request" --> Browser[Browser]
    Browser -- "2. Redirect to Azure" --> AzureAD[(Azure AD)]
    AzureAD -- "3. MFA challenge" --> User
    User -- "4. Credentials" --> AzureAD
    AzureAD -- "5. Auth code + token" --> Browser
    Browser -- "6. Token" --> AuthMiddleware[/"Auth & RBAC\nMiddleware"/]

    AuthMiddleware -- "7. Validate signature\n(JWKS)" --> AzureAD
    AuthMiddleware -- "8. Extract AD group IDs" --> GroupMapping[/"AD Group\nRole Mapping"/]
    GroupMapping -- "9. Lookup role by group ID" --> RoleMappingDB[(D: AD Group\nRole Mappings)]
    RoleMappingDB -- "10. System role" --> GroupMapping
    GroupMapping -- "11. Assign role to session" --> AuthMiddleware

    AuthMiddleware -- "12. Route-level\naccess check" --> ProtectedRoute{Authorized?}
    ProtectedRoute -- "Yes" --> ServiceLayer[/"Service Layer\n(Varies by route)"/]
    ProtectedRoute -- "No → 403 Forbidden" --> Browser
    AuthMiddleware -- "13. Log login event" --> AuditLog[(D6: Audit Log)]
```

### 3.2 Asset Registration & Scanning (Epic 2)

Covers single asset creation, bulk import, QR generation, and tethered mobile scanning (REQ-REG-2.1–2.16).

```mermaid
flowchart TB
    Admin([Admin])

    subgraph Registration ["Asset Registration"]
        direction TB
        RegForm["Registration Form\n(Dynamic Fields)"]
        SchemaFetch["Fetch Category\nEAV Schema"]
        ValidateSerial{"Serial Number\nUnique?"}
        GenID["Auto-Generate\nAsset ID (Prefix)"]
        GenQR["Generate QR Code\n& Routing URL"]
    end

    subgraph BulkImport ["Bulk Import"]
        direction TB
        UploadCSV["Upload CSV / Excel"]
        ParseRows["Parse & Validate\nEach Row"]
        ValidRows["Valid Row List"]
        ErrorRows["Error Log"]
        BatchInsert["Batch INSERT\n(Partial Success)"]
        ErrorReport["Downloadable\nError Report"]
    end

    subgraph Scanning ["Tethered Scanning (Auto-Link by User Identity)"]
        direction TB
        Mobile["PWA Mobile Scanner\n(HTML5 Camera)"]
        WSServer["WebSocket Server\n(Routes by user_id)"]
        Desktop["Desktop Form\nField Injection"]
    end

    MasterDB[(D2: Master Data)]
    AssetDB[(D1: Assets)]
    CostDB[(D1: Asset Costs)]
    Blob[(File Storage)]
    AuditLog[(D6: Audit Log)]

    Admin -- "Select category" --> RegForm
    RegForm -- "Fetch schema" --> SchemaFetch
    SchemaFetch -- "EAV field definitions" --> MasterDB
    MasterDB -- "Custom fields JSON" --> SchemaFetch
    SchemaFetch -- "Render dynamic inputs" --> RegForm

    Admin -- "Submit form" --> ValidateSerial
    ValidateSerial -- "No → Save" --> GenID
    ValidateSerial -- "Yes → Block\n(descriptive error)" --> RegForm
    GenID -- "Asset record" --> AssetDB
    GenID -- "Financial data\n(price, tax, shipping, currency)" --> CostDB
    GenID --> GenQR
    GenQR -- "QR image file" --> Blob
    GenID -- "Log CREATE event" --> AuditLog

    Admin -- "Upload file" --> UploadCSV
    UploadCSV --> ParseRows
    ParseRows -- "Valid" --> ValidRows
    ParseRows -- "Invalid" --> ErrorRows
    ValidRows --> BatchInsert
    BatchInsert -- "Batch asset records" --> AssetDB
    ErrorRows --> ErrorReport
    BatchInsert -- "Log IMPORT events" --> AuditLog

    Admin -- "Upload invoice PDF" --> Blob

    Mobile -- "Scanned serial number" --> WSServer
    WSServer -- "Inject into active input" --> Desktop
```

### 3.3 Operations & Maintenance (Epic 3)

Covers asset assignments, custody acceptance, returns, maintenance lifecycle, and employee issue reporting (REQ-OPS-3.1–3.15).

```mermaid
flowchart TB
    Admin([Admin])
    Employee([Employee])
    Vendor([External Vendor])

    AssignDB[(D3: Assignments)]
    MaintDB[(D3: Maintenance\nRecords)]
    AssetDB[(D1: Assets)]
    AuditLog[(D6: Audit Log)]
    InboxDB[(D7: Notifications)]
    Notify[(Email / Teams)]

    subgraph Assignment ["Assignment & Returns"]
        direction TB
        AssignModal["Assignment Modal\n(User or Location only)"]
        StatusCheck{"Status =\nAvailable?"}
        UpdateAssign["Create Assignment\nRecord"]
        CustodyNotify["Send Custody\nNotification"]
        AcceptCustody["Employee Confirms\nCustody"]
        ReturnModal["Return Modal\n(Condition Check)"]
        CondCheck{"Condition?"}
    end

    subgraph Maintenance ["Maintenance Pipeline"]
        direction TB
        TriageReview["Triage Review\n(Book Value + Warranty)"]
        VendorDispatch["Vendor Dispatch\n(RMA + Est. Cost)"]
        CloseRepair["Close Repair\n(Actual Cost)"]
        IssueReport["Employee Issue\nReport"]
    end

    Admin -- "Select asset + user/location" --> AssignModal
    AssignModal --> StatusCheck
    StatusCheck -- "No → 409 error" --> Admin
    StatusCheck -- "Yes" --> UpdateAssign
    UpdateAssign -- "Assignment record" --> AssignDB
    UpdateAssign -- "Status → Assigned" --> AssetDB
    UpdateAssign -- "Log ASSIGN event" --> AuditLog
    UpdateAssign --> CustodyNotify
    CustodyNotify -- "Email + Teams alert" --> Notify
    CustodyNotify -- "Inbox entry" --> InboxDB

    Employee -- "Confirm via link" --> AcceptCustody
    AcceptCustody -- "acceptance_status → Confirmed" --> AssignDB

    Admin -- "Process return" --> ReturnModal
    ReturnModal --> CondCheck
    CondCheck -- "Working" --> AssetDB
    CondCheck -- "Defective" --> AssetDB
    CondCheck -- "Log RETURN event" --> AuditLog

    CondCheck -- "Defective →\nCreate ticket" --> MaintDB
    Employee -- "Report damage" --> IssueReport
    IssueReport -- "Issue record\n→ Pending Review" --> MaintDB

    Admin -- "Assess damage" --> TriageReview
    TriageReview -- "View book value\n& warranty" --> AssetDB
    TriageReview -- "Dispatch to vendor" --> VendorDispatch
    VendorDispatch -- "RMA, est. cost,\nreturn date" --> MaintDB
    VendorDispatch -- "Status → In Repair" --> AssetDB

    Vendor -- "Returns repaired asset" --> CloseRepair
    CloseRepair -- "Actual cost recorded" --> MaintDB
    CloseRepair -- "Status → Available\nor Pending Disposal" --> AssetDB
    CloseRepair -- "Update financial engine" --> AssetDB
```

### 3.4 Secure Disposal & Compliance (Epic 4)

Covers the full disposal pipeline from intake to compliance hard stop (REQ-DSP-4.1–4.8).

```mermaid
flowchart TB
    ITAdmin([IT Admin])
    FinAdmin([Finance / Global Admin])

    AssetDB[(D1: Assets)]
    DisposalDB[(D4: Disposals)]
    AuditLog[(D6: Audit Log)]
    Blob[(File Storage)]
    Notify[(Email / Teams)]

    subgraph DisposalFlow ["Compliance Disposal Pipeline"]
        direction TB
        FlagRetire["Flag for Retirement\n(Disposal Intake)"]
        PendingQueue["Pending Disposals\nQueue"]
        ExecReview["Executive Review Panel\n(Cost + Depreciation)"]
        Decision{Approve or\nReject?}
        RejectModal["Reject Modal\n(Mandatory Notes)"]
        HardStop["Compliance Hard Stop\n• Asset ID confirmation\n• Data Wiped ☑\n• Tags Removed ☑\n• Disposal Reason\n• E-Waste Certificate"]
        SoftDelete["Soft Delete\n(is_archived = true)"]
    end

    ITAdmin -- "Flag defective/obsolete asset" --> FlagRetire
    FlagRetire -- "Status → Pending Disposal" --> AssetDB
    FlagRetire -- "Disposal request record" --> DisposalDB
    FlagRetire -- "Review notification" --> Notify
    FlagRetire -- "Log event" --> AuditLog

    DisposalDB --> PendingQueue
    PendingQueue --> ExecReview
    FinAdmin -- "Review justification,\npurchase cost, book value" --> ExecReview
    ExecReview --> Decision

    Decision -- "Reject" --> RejectModal
    RejectModal -- "Rejection notes" --> DisposalDB
    RejectModal -- "Status → Available\n(re-route)" --> AssetDB
    RejectModal -- "Log event" --> AuditLog

    Decision -- "Approve" --> HardStop
    HardStop -- "E-waste PDF upload" --> Blob
    HardStop -- "Disposal reason,\nchecklist flags" --> DisposalDB
    HardStop -- "Status → Disposed / Donated" --> AssetDB
    HardStop --> SoftDelete
    SoftDelete -- "is_archived = true,\nfields locked" --> AssetDB
    SoftDelete -- "Log DISPOSE event" --> AuditLog
```

### 3.5 Financial Intelligence & Alerts (Epic 5)

Covers depreciation, TCO, salvage ledger, reports, dashboard, CRON alerts, and notification inbox (REQ-FIN-5.1–5.11).

```mermaid
flowchart TB
    Admin([Admin / Finance])
    Employee([Any User])

    AssetDB[(D1: Assets &\nCosts)]
    MaintDB[(D3: Maintenance\nCosts)]
    DisposalDB[(D4: Disposals &\nSalvage)]
    FinDB[(D5: Financial\nLedgers)]
    InboxDB[(D7: Notifications)]
    Notify[(Email / Teams)]
    VendorAPI[(Vendor APIs)]

    subgraph Financial ["Financial Engine"]
        direction TB
        DeprecCalc["Straight-Line\nDepreciation\n(Book Value)"]
        TCOCalc["TCO Aggregation\n(Purchase + Repairs)"]
        SalvageLedger["Write-Offs &\nSalvage Ledger"]
    end

    subgraph Dashboard ["KPI Dashboard"]
        direction TB
        MetricCards["Aggregate Metric Cards\n(Responsive)"]
        ActivityWidget["Recent Activity\nLog Widget"]
        ProblemWidget["Problem Asset\nCounts Widget"]
    end

    subgraph Reports ["Reporting"]
        direction TB
        ReportGen["Generate HTML Reports\n(Inventory by Dept,\nAssets by Status)"]
        ExportFormats["Export: PDF, CSV, Excel"]
    end

    subgraph CRON ["Background Worker (Nightly)"]
        direction TB
        WarrantyScan["Scan Warranty\nExpirations"]
        LicenseScan["Scan License\nRenewals"]
        OverdueScan["Scan Overdue\nReturns"]
        VendorSync["Vendor API Warranty\nSync (Optional)"]
    end

    AssetDB -- "Purchase dates, costs,\nuseful life, salvage value" --> DeprecCalc
    DeprecCalc -- "Current Book Value" --> FinDB

    AssetDB -- "Original cost" --> TCOCalc
    MaintDB -- "Historical repair costs" --> TCOCalc
    TCOCalc -- "Total Cost of Ownership" --> FinDB

    DisposalDB -- "Disposal records +\nsalvage values" --> SalvageLedger
    SalvageLedger -- "Write-off entries" --> FinDB

    FinDB --> MetricCards & ActivityWidget & ProblemWidget
    FinDB --> ReportGen
    ReportGen --> ExportFormats
    ExportFormats -- "PDF / CSV / Excel download" --> Admin

    CRON -- "Expiring warranties" --> WarrantyScan
    WarrantyScan -- "Query warranty dates" --> AssetDB
    LicenseScan -- "Query license expiry" --> AssetDB
    OverdueScan -- "Query overdue assignments" --> MaintDB
    VendorSync -- "Fetch by serial number" --> VendorAPI
    VendorSync -- "Update warranty date" --> AssetDB

    WarrantyScan & LicenseScan & OverdueScan -- "Threshold breach alerts" --> Notify
    WarrantyScan & LicenseScan & OverdueScan -- "Inbox entries\n(with deep-links)" --> InboxDB

    Employee -- "Bell icon → unread alerts" --> InboxDB
    InboxDB -- "Deep-link to\nasset details" --> Employee
```

## 4. Data Store Inventory

| ID  | Data Store                | Primary Tables                                                                                                      | Description                                                                                                        |
| :-- | :------------------------ | :------------------------------------------------------------------------------------------------------------------ | :----------------------------------------------------------------------------------------------------------------- |
| D1  | Assets & Registrations    | `assets`, `asset_costs`, `asset_custom_values`, `currencies`                                                        | Core asset records, financial costs, dynamic EAV values, and currency references.                                  |
| D2  | Master Data               | `categories`, `category_custom_fields`, `brands`, `models`, `vendors`, `locations`, `departments`, `asset_statuses` | Organizational backbone data — categories with EAV schemas, hierarchical locations, and all reference data.        |
| D3  | Assignments & Maintenance | `asset_assignments`, `maintenance_records`, `issue_reports`                                                         | Operational records tracking custody lifecycle, repair workflows, and employee-reported issues.                    |
| D4  | Disposals                 | `asset_disposals`, `asset_documents` (e-waste certs)                                                                | Compliance disposal records with approval workflow state, security checklists, and linked file storage references. |
| D5  | Financial Ledgers         | Computed views over D1 + D3 + D4                                                                                    | Depreciation calculations, TCO aggregations, and salvage/write-off ledger entries.                                 |
| D6  | Audit Log                 | `system_audit_logs`                                                                                                 | Immutable append-only ledger of all CRUD events with before/after JSONB diffs, actor identity, and IP address.     |
| D7  | Notifications Inbox       | `notifications`                                                                                                     | User-facing alert entries with read/unread state and deep-link URLs to affected entities.                          |

## 5. External Entity Inventory

| External Entity          | Type                 | Data Exchanged                                                       | Protocol                     | Requirement                |
| :----------------------- | :------------------- | :------------------------------------------------------------------- | :--------------------------- | :------------------------- |
| **Azure AD (Entra ID)**  | Identity Provider    | OAuth tokens, AD group memberships, user profile claims              | OIDC / JWKS / HTTPS          | REQ-FND-1.1, REQ-FND-1.5   |
| **Email (SMTP)**         | Notification Channel | Custody confirmations, return requests, warranty/license alerts      | SMTP                         | REQ-OPS-3.2, REQ-FIN-5.8   |
| **Microsoft Teams**      | Notification Channel | Same as Email — adaptive card notifications                          | Teams Incoming Webhook / API | REQ-OPS-3.2, REQ-FIN-5.8   |
| **HR / Finance Systems** | API Consumer         | Read-only asset and financial JSON data; outbound webhook payloads   | REST API (JSON) / Webhooks   | REQ-FND-1.12, REQ-FND-1.13 |
| **Vendor APIs**          | Data Source          | Warranty expiry data fetched by serial number (Dell, HP, Lenovo)     | REST API (JSON)              | REQ-FIN-5.11               |
| **Azure Blob / AWS S3**  | File Storage         | PDF invoices, e-waste certificates, QR code images, report artifacts | HTTPS                        | REQ-REG-2.4, REQ-DSP-4.6   |

## 6. Traceability Matrix

| Data Flow                               | Primary Requirements                    |
| :-------------------------------------- | :-------------------------------------- |
| SSO Login & Role Mapping (3.1)          | REQ-FND-1.1, REQ-FND-1.4, REQ-FND-1.5   |
| Master Data CRUD → D2                   | REQ-FND-1.6–1.10, REQ-FND-1.15–1.17     |
| Dynamic Registration → D1               | REQ-REG-2.1–2.3, REQ-REG-2.16           |
| Bulk Import (Partial Success) → D1      | REQ-REG-2.9, REQ-REG-2.10, NFR-REL-03   |
| QR Generation → File Storage            | REQ-REG-2.11, REQ-REG-2.12              |
| Tethered Scanning (Auto-Link WebSocket) | REQ-REG-2.14                            |
| Assignment → D3 → Notifications         | REQ-OPS-3.2, REQ-OPS-3.3                |
| Return + Condition Check → D3           | REQ-OPS-3.4, REQ-OPS-3.6                |
| Maintenance Pipeline → D3               | REQ-OPS-3.7–3.10                        |
| Employee Issue Reporting → D3           | REQ-OPS-3.15                            |
| Disposal Pipeline → D4 → File Storage   | REQ-DSP-4.1–4.8                         |
| Depreciation & TCO → D5                 | REQ-FIN-5.4, REQ-FIN-5.5                |
| Salvage Ledger → D5                     | REQ-FIN-5.6                             |
| Report Generation & Export              | REQ-FIN-5.7, NFR-PERF-04                |
| CRON Alerts → D7 → Email/Teams          | REQ-FIN-5.8, REQ-FIN-5.9                |
| Notification Inbox → User               | REQ-FIN-5.10                            |
| Vendor API Warranty Sync                | REQ-FIN-5.11                            |
| All state changes → D6 (Audit Log)      | REQ-FND-1.11, NFR-SEC-05, NFR-SEC-06    |
| API Gateway → External Systems          | REQ-FND-1.12, REQ-FND-1.13, NFR-PERF-06 |

[< Back to Requirements](../README.md)

