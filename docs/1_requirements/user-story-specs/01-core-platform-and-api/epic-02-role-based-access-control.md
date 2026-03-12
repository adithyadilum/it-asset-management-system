# Epic 2: System Permissions & Role-Based Access Control

## Summary

This epic governs what authenticated users are allowed to do inside the system. It enforces a strict, four-tier Role-Based Access Control (RBAC) architecture and provides Global Admins with a dedicated split-view control panel to seamlessly map employees to operational or financial roles.

## In Scope

- A split-view Administrator Control Panel for bulk and manual role mapping.
- Interactive UI modals for granting and revoking access.
- Enforcement of the four core system roles: Global Admin, IT Operator, Finance Auditor, and Standard Employee.
- UI/UX adjustments based on roles (hiding unauthorized sidebar navigation and action buttons).

## Out of Scope / Limitations

- The Standard Employee role, its backend data isolation logic, and the "My Assets" self-service portal are completely out of scope for this Epic (these will be comprehensively covered in a dedicated Employee Portal Epic).
- Custom role creation (administrators cannot invent new permission tiers; they are hardcoded to the four enterprise standards).

## Assumptions & Dependencies

- Relies on successful authentication and Azure AD JWT token generation completed in Epic 1.

### User Stories

- [US-2.1 — Administrator Control Panel for System Permissions](https://app.clickup.com/t/86ewvb9ju)
- [US-2.2 — Global Admin Role Capabilities](https://app.clickup.com/t/86ewvbbdj)
- [US-2.3 — IT Operator Role Capabilities](https://app.clickup.com/t/86ewvbbdx)
- [US-2.4 — Finance Auditor Role Capabilities](https://app.clickup.com/t/86ewvbbe6)
- [US-2.5 — Default "Least Privilege" Access Assignment](https://app.clickup.com/t/86ewvcmr9)

---

## User Story: US-2.1 — Administrator Control Panel for System Permissions

- As a System Administrator,
- I want an easy-to-use interface to manage what employees can do in the system,
- So that I can securely elevate IT staff to manage hardware and Finance staff to view reports, without needing a developer to write code.

### Acceptance Criteria (Gherkin)

- Scenario: Automated Baseline Role Assignment
  - Given a newly hired employee logs in for the first time
  - When they authenticate successfully
  - Then the system automatically grants them the baseline "Standard Employee" access level.
- Scenario: Standard Employee Data Isolation
  - Given I am logged in as a "Standard Employee"
  - When I attempt to query the API for the main registry
  - Then the database strictly limits my response to assets where my account is listed as the `Custodian`.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/00115065-0f96-4e9c-9668-4f5c33cc5819/Employee%20Portal%20-%20Desktop.png)
- Scenario: Bulk User Selection & Mapping
  - Given I am viewing the Role Assignment control panel and click "Add User"
  - When the assignment popup window appears
  - Then I can search for and select multiple users at once to add to the mapping selection list
  - And clicking "Confirm Mapping" assigns all selected users to the target role simultaneously.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/ff0199e8-9603-4c8a-b7f0-a56d5192e066/User-roles-and-access-view.png)
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/b83ca182-f674-49fd-ae3e-ca1ffa2f4aac/add%20user%20to%20roles%20-%20Desktop.png)
- Scenario: Removing a User During Selection
  - Given I am in the "Add User" popup and have selected multiple employees
  - When I click the trash icon next to a selected user _before_ confirming
  - Then the user is removed from the temporary selection list.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/c26b966e-bcfe-48b7-86ff-86ccec823ac1/User-roles-and-access-add.png)
- Scenario: Searching for a Non-Existent User
  - Given I am in the "Add User" popup
  - When I search for a user who does not exist in the system
  - Then a message appears stating: "No users found."
  - And the "Confirm Mapping" button remains disabled.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/3f43b61e-da38-4f8c-a02b-2a961e512929/add%20user%20to%20roles(no%20user%20found)%20-%20Desktop.png)
- Scenario: Revoking Elevated Access
  - Given a user is currently assigned to a role
  - When I click the trash icon next to their name in the role list
  - Then a confirmation popup appears titled "Remove User Access"
  - And after clicking "Confirm Removal", the user is removed from that role.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/9b5b807b-3b2e-4551-b4f1-430c182c9d33/Remove%20User%20access%20-%20Desktop.png)
- Scenario: Global Admin Anti-Lockout
  - Given I am logged in as a "Global Admin"
  - When I attempt to remove my own Global Admin role
  - Then the system disables the trash icon/action to prevent me from accidentally locking myself out.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/92719eab-d249-4799-bdce-2a56a4fe698a/User%20roles%20and%20access%20-%20Desktop.png)

### UI/UX Specifications & Constraints

- Layout: Must utilize a Master-Detail split-view component. The left column lists the 4 core roles, and the right panel displays the users assigned to the selected role.
- Add User Modal: Triggered by the "Add User" button. Must support multi-select functionality.
- Revocation Modal: Triggered by the trash icon in the active role list. Must strictly include:
  - Title: "Remove User Access"
  - Description: A text warning explaining that the user will immediately lose access to the permissions associated with that role.
  - Button: A primary/destructive button labeled "Confirm Removal".
- Anti-Lockout UX: The trash icon next to the active user's own name in the Role Mapping screen must be styled with low opacity and a `cursor-not-allowed` hover state.

---

## User Story: US-2.2 — Global Admin Role Capabilities

- As a Global Admin,
- I want full, unrestricted read and write access to the entire application,
- So that I can configure system settings, map roles, build master data schemas, and oversee all IT operations without blockers.

### Acceptance Criteria (Gherkin)

- Scenario: Full System Navigation
  - Given I am logged in as a "Global Admin"
  - When I view the application interface
  - Then all sidebar navigation menus (Dashboard, Assets, Master Data, System Log, Integrations, Settings) are visible and clickable.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/b6403ec3-0cd2-426e-b6a1-8e72dd3c54a9/Dashboard%20-%20Desktop%20sidebar%20highlighted.png)

### UI/UX Specifications & Constraints

- Visibility: The Global Admin sees the interface exactly as it is designed in Figma, with zero hidden tabs, missing buttons, or restricted views.
- Anti-Lockout UX: The trash icon next to the active user's own name in the Role Mapping screen must be styled with low opacity and a `cursor-not-allowed` hover state.

### Technical Implementation Tasks

- [ ] Configure the backend JWT parser to identify the Global Admin claim.
- [ ] Write backend validation to reject any `DELETE` request targeting the active user's own mapping row in the `UserRoles` table.

---

## User Story: US-2.3 — IT Operator Role Capabilities

- As an IT Operator,
- I want full read/write access to hardware records but be restricted from system configuration settings,
- So that I can efficiently assign, return, and repair assets without the risk of accidentally altering the database schemas or API webhooks.

### Acceptance Criteria (Gherkin)

- Scenario: Automated Group-Based Assignment
  - Given my corporate Microsoft profile belongs to the "IT Helpdesk" Active Directory group
  - When I authenticate via Microsoft SSO
  - Then the system automatically grants me the "IT Operator" role without manual admin mapping.
- Scenario: Hardware Operations Access
  - Given I am logged in as an "IT Operator"
  - When I view the Main Asset Registry
  - Then I have full access to click "Add Asset", "Assign", "Return", and "Flag for Dispose".
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/7de1a221-6f1b-4aa6-ad4c-5da79c4f02ef/Multiple%20Assets%20Assignment%20for%20Loaction-%20Desktop.png)
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/89852115-70d3-42f8-a7bc-6d07504047d5/Asset%20Registry%20Wizard.png)
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/89919fdd-fb41-4340-9fca-89b0127cbee3/Request%20Return%20for%20Multiple%20Asset-%20Desktop.png)
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/1b5abed4-f351-41b6-9a63-e7ed033190a6/Request%20Disposal%20Review-%20Desktop.png)
- Scenario: Settings & Configuration Block
  - Given I am logged in as an "IT Operator"
  - When I look at the main sidebar navigation
  - Then the "Settings", "Integrations", "System Log", and "Master Data" tabs are completely hidden from view.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/9725d127-8459-4ef4-bc16-39f591c78ae3/Collapsed%3DFalse%2C%20Admin%3DTrue.png)
- Scenario: Forced URL Navigation Block
  - Given I am logged in as an "IT Operator"
  - When I attempt to bypass the UI by manually typing `/settings/api-keys` into the browser URL bar
  - Then the system routes me to a "403 Forbidden - Access Denied" empty state page.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/76a1a024-1261-4efa-a365-f9b1b10ea1b6/IT%20operator%20Error%20403%20Screen-%20Desktop.png)

### UI/UX Specifications & Constraints

- Sidebar UI: Dynamically remove restricted routes from the React Router sidebar component so the user doesn't even know they exist.
- Error Page: The 403 Forbidden page must include a clean illustration and a "Return to Dashboard" button.

### Technical Implementation Tasks

- [ ] Implement Azure AD Group-to-Role mapping logic upon login to catch the IT Helpdesk group.
- [ ] Write RBAC middleware to strictly protect configuration API routes (e.g., `POST /api/categories`) from this role.

---

## User Story: US-2.4 — Finance Auditor Role Capabilities

- As a Finance Auditor,
- I want global read-only access to all hardware registries and financial ledgers,
- So that I can review depreciation, warranty statuses, and Total Cost of Ownership (TCO) without the risk of accidentally deleting or re-assigning physical hardware.

### Acceptance Criteria (Gherkin)

- Scenario: Global Read Access
  - Given I am logged in as a "Finance Auditor"
  - When I navigate to the Asset Registry or Financial Reports tabs
  - Then I can view all hardware data across all locations globally.
- Scenario: Action Restriction (No Write Access)
  - Given I am logged in as a "Finance Auditor"
  - When I open an Asset Details slide-out panel
  - Then the "Edit", "Dispose", "Assign", and "Delete" buttons are hidden from the UI.
- Scenario: Backend Write Block
  - Given I am logged in as a "Finance Auditor"
  - When I attempt to bypass the UI and send an API `POST` or `PUT` request to update an asset's status
  - Then the backend rejects the request with a `403 Forbidden` error.

### UI/UX Specifications & Constraints

- Action Buttons: Instead of showing disabled buttons, completely remove destructive/operational action buttons from the DOM to keep the interface clean and avoid confusing the auditor.
- Export Enablement: The auditor must still be able to see and click all "Export CSV" and "Download Report" buttons.

### Technical Implementation Tasks

- [ ] Configure the frontend UI state to conditionally render action buttons based on `user.role !== 'FinanceAuditor'`.
- [ ] Apply strict Read-Only (`GET`) middleware enforcement for this role across the `/api/assets/*` controllers.

---

## User Story: US-2.5 — Default "Least Privilege" Access Assignment

- As an Admin,
- I want every new employee logging into the system to default to the lowest possible permission level,
- So that our sensitive financial and hardware data is protected by default, requiring a conscious action from an administrator to grant elevated access.

### Acceptance Criteria (Gherkin)

- Scenario: First-Time Login Default
  - Given a newly hired employee logs into the asset management system for the very first time
  - When they authenticate successfully via Microsoft SSO
  - Then the backend automatically creates their internal profile and assigns them the baseline "Standard Employee" role
  - And they are strictly limited to viewing only their own assigned assets.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/b30f1bbc-301c-4d8e-883d-626dd54a3cbc/Employee%20Portal%20-%20Desktop.png)
- Scenario: Admin Explicit Elevation
  - Given a user currently holds the default "Standard Employee" role
  - When a Global Admin explicitly uses the Role Assignment panel to upgrade them to an "IT Operator"
  - Then their permissions are instantly elevated.
- Scenario: Missing Active Directory Group Fallback
  - Given an employee logs in but their corporate Azure AD profile does not belong to any recognized IT or Finance groups
  - When the system parses their SSO token
  - Then the system safely defaults their access to "Standard Employee" rather than rejecting their login.

### UI/UX Specifications & Constraints

- Silent Provisioning: The end-user should not see any popup or notification stating "You have been assigned the Standard Employee role." They should simply land on their clean, restricted dashboard seamlessly.
- Control Panel Reflection: In the Global Admin's Role Assignment split-view UI, any user who has logged in at least once must automatically appear in the list when the "Standard Employee" role is selected on the left panel.

### Technical Implementation Tasks

- [ ] Write user-provisioning logic in the SSO callback: If the incoming `user_id` does not exist in the local `Users` table, insert them and set their `role_id` to the database equivalent of "Standard Employee".
- [ ] Ensure the RBAC middleware strictly treats any `null` or missing role mappings as "Standard Employee" to prevent accidental privilege escalation.
