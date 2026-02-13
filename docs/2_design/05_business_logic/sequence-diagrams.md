# Sequence Diagrams

This document contains key sequence diagrams for the IT Asset Management System.

## 1. Asset Registry

This diagram elaborates on the data flow for creating assets, specifically the Bulk Import logic.

- Loop Fragment: A loop block demonstrates the system iterating through parsed CSV rows. Inside, an alt (alternative) block separates valid rows from invalid ones.
- Partial Success: The logic concludes with a "Batch INSERT" for valid rows only, generating a "Success Count" and an "Error CSV" for the user, addressing the reliability requirement NFR-REL-03.

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Global Admin
    participant UI as Asset UI (Frontend)
    participant API as Asset Controller (Backend)
    participant DB as Database

    note over Admin, DB: Workflow: Asset Registry Management

    alt Option A: Manual Single Asset Creation [REQ-REG-1.1]
        Admin->>UI: Fill Asset Details & Click "Save"
        activate UI
        UI->>API: POST /api/assets/create (data)
        activate API

        API->>API: Validate Attributes (Dynamic Logic)

        note right of API: Auto-generate Unique Asset ID\n(e.g., AST-2026-001)

        API->>DB: INSERT INTO Assets (id, data...)
        activate DB
        DB-->>API: Success
        deactivate DB

        API-->>UI: Return 201 Created (Asset ID)
        deactivate API
        UI-->>Admin: Show Success Message
        deactivate UI

    else Option B: Bulk CSV Import [REQ-REG-1.7]
        Admin->>UI: Upload CSV File
        activate UI
        UI->>API: POST /api/assets/import (file)
        activate API

        API->>API: Parse CSV File

        loop For Each Row in CSV
            API->>DB: Check for Duplicates (Serial No)
            activate DB
            DB-->>API: Result (Exists/New)
            deactivate DB

            alt Row is Valid
                API->>API: Add to "Valid List"
                API->>API: Generate Asset ID
            else Row is Invalid
                API->>API: Add to "Error Log"
            end
        end

        note right of API: Partial Success Logic:\nCommit valid rows only [NFR-REL-03]

        API->>DB: Batch INSERT (Valid List)
        activate DB
        DB-->>API: Success
        deactivate DB

        API-->>UI: Return Report (Success Count, Error CSV)
        deactivate API

        opt If Errors Exist
            UI-->>Admin: Prompt Download "Error_Report.csv"
        end

        UI-->>Admin: Show "Import Complete" Message
        deactivate UI
    end
```

## 2. Asset assignment

This diagram traces the API calls required to assign an asset.

- Service Layer Logic: The AssetController delegates logic to AssetService. The service first calls getAssetStatus().
- Alternative Flow: An alt block handles the logic: if the status is not "Available," an error 409 is returned. If "Available," the system proceeds to updateStatus(), logAudit(), and finally calls the NotificationService to send the confirmation email.

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Global Admin
    participant UI as Frontend (UI)
    participant Ctrl as AssetController
    participant Svc as AssetService
    participant DB as Database
    participant Notify as NotificationService

    note over Admin, Notify: Workflow: Asset Assignment (Check-out) [REQ-OPS-3.1]

    %% 1. Initiate Request
    Admin->>UI: Select Asset & User, Click "Assign"
    activate UI
    UI->>Ctrl: assignAsset(assetID, userID)
    activate Ctrl
    Ctrl->>Svc: processAssignment(assetID, userID)
    activate Svc

    %% 2. Check Availability
    Svc->>DB: getAssetStatus(assetID)
    activate DB
    DB-->>Svc: Return Status (e.g., "Available")
    deactivate DB

    %% 3. Alternative Paths (Logic)
    alt Status != "Available"
        Svc-->>Ctrl: Error: Asset Unavailable
        Ctrl-->>UI: Return 409 Conflict
        UI-->>Admin: Show Error Message
    else Status == "Available"
        %% 4. Perform Assignment
        Svc->>DB: updateStatus("Assigned", userID)
        activate DB
        DB-->>Svc: Success
        deactivate DB

        %% 5. Audit Logging [REQ-OPS-3.3]
        Svc->>DB: logAudit(event="Check-out", actor=Admin)
        activate DB
        DB-->>Svc: Success
        deactivate DB

        %% 6. Async Notification [REQ-AUTO-5.1]
        Svc--)Notify: sendEmail(userID, "Confirm Receipt")

        %% 7. Return Success
        Svc-->>Ctrl: Success (AssignmentDetails)
        deactivate Svc
        Ctrl-->>UI: Return 200 OK
        deactivate Ctrl
        UI-->>Admin: Show "Assignment Successful"
        deactivate UI
    end
```

## 3. Asset return

This diagram shows the complex logic of processing returns.

- Conditional Updates: The OperationService receives the returnAsset() call. An alt block differentiates the outcome based on the physical condition:
  - Condition = "Good": Status updates to "Available".
  - Condition = "Damaged": Status updates to "In Repair," and a secondary call createMaintenanceTicket() is triggered to initiate the repair workflow.
- Audit: Regardless of the condition, the flow ensures logAudit() is called to close the
  custody loop.

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Global Admin
    participant UI as Frontend (UI)
    participant Ops as OperationService
    participant DB as Database

    note over Admin, DB: Workflow: Asset Return & Condition Check [REQ-OPS-3.2]

    %% 1. Initiate Return
    Admin->>UI: Scan Asset & Click "Return"
    activate UI
    UI->>Ops: getReturnDetails(assetID)
    activate Ops
    Ops->>DB: query(Custodian, DueDate)
    activate DB
    DB-->>Ops: Return Current Assignment
    deactivate DB
    Ops-->>UI: Display Assignment Info
    deactivate Ops

    %% 2. Submit Condition
    Admin->>UI: Select Condition & Click "Confirm"
    UI->>Ops: returnAsset(assetID, condition, notes)
    activate Ops

    %% 3. Condition Logic (Alt Fragment)
    alt Condition == "Good"
        Ops->>DB: updateStatus(assetID, "Available")
        activate DB
        DB-->>Ops: Success
        deactivate DB

    else Condition == "Damaged" [REQ-MNT-5.3]
        Ops->>DB: updateStatus(assetID, "In Repair")
        activate DB
        DB-->>Ops: Success
        deactivate DB

        Ops->>DB: createMaintenanceTicket(assetID, notes)
        activate DB
        DB-->>Ops: Ticket Created
        deactivate DB
    end

    %% 4. Common Finalization (Critical)
    Ops->>DB: clearCustodian(assetID)
    activate DB
    DB-->>Ops: Success
    deactivate DB

    Ops->>DB: logAudit(event="Return", actor=Admin) [REQ-OPS-3.3]
    activate DB
    DB-->>Ops: Success
    deactivate DB

    Ops-->>UI: Return Success Message
    deactivate Ops
    UI-->>Admin: Show "Asset Returned"
    deactivate UI
```

## 4. System login

This diagram visualizes the handshake between the User, the System, and the Azure AD Identity Provider (IDP).

- Critical Security Step: The diagram highlights the logic occurring after authCallback(token) is received. The Backend API validates the token signature and extracts the OID_Groups. It then iterates through these groups to map them to internal System Roles (e.g., "Global Admin"), fulfilling REQ-SEC-2.2.

```mermaid
sequenceDiagram
    autonumber
    actor User as User
    participant Browser as Browser
    participant Azure as Azure AD (IDP)
    participant API as Backend API

    note over User, API: Workflow: SSO Login & Role Mapping [REQ-SEC-2.1, REQ-SEC-2.2]

    %% 1. Initiate Login
    User->>Browser: Click "Login with Microsoft"
    activate Browser
    Browser->>API: loginRequest()
    activate API
    API-->>Browser: Return Redirect URL (Azure AD)
    deactivate API

    %% 2. Authentication with Azure
    Browser->>Azure: Redirect to Login Page
    deactivate Browser
    activate Azure
    User->>Azure: Enter Credentials (MFA)
    Azure->>Azure: Validate Credentials

    %% 3. Token Handoff
    Azure-->>Browser: Auth Code / Token
    deactivate Azure
    activate Browser
    Browser->>API: authCallback(token)
    activate API

    %% 4. Internal Validation & Role Mapping
    note right of API: Critical Security Step [REQ-SEC-2.2]

    API->>API: validateToken(signature, issuer)
    API->>API: extractGroups(OID_Groups)

    %% Self-call loop for mapping
    loop Map Azure Groups to System Roles
        API->>API: Check Group ID (e.g., "GUID-123")
        API->>API: Assign Role (e.g., "Global Admin")
    end

    %% 5. Session Creation
    API-->>Browser: returnSession(Set-Cookie / JWT)
    deactivate API

    Browser-->>User: Load Dashboard (Based on Role)
    deactivate Browser
```
