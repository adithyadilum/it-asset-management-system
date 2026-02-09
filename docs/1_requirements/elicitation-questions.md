## Elicitation Questions

## Features of the Existing System
- The current system at Tiqri is described as a "basic system" used to manage various IT and office assets.
- User Roles & Access: Includes an Admin user role with exclusive rights to add new categories, models, and hardware specifications (RAM, etc.). It uses Azure AD (SSO) for authentication.
- Asset Categories: Tracks items such as laptops, conference devices, displays, mobiles, and laser pointers.
- Data Fields: Captures asset number, owner (Tickry companies or customers), model, user (synced from HR), serial number, status, and technical specs (processor, RAM).
- Financial Tracking: Includes fields for vendor, warranty period, purchase date, and lease status.
- Maintenance: Features a "problem reporter" flag to indicate hardware issues.
- Audit Log: Tracks a history of changes for devices, including "before and after" values.
- Limitations: It does not have a dashboard, does not show the currently logged-in user, and lacks an approval workflow for status changes.

### Part 0: Scope

- User Volume: Who are the key stakeholder groups (IT Ops, Finance, Procurement) and approximately how many users will be in each group?
<br> <em> Stakeholders: The top stakeholders are IT, IT Admin, and Finance. There is no separate procurement department.</em>

### Part 1: Core Asset Registry (REQ-REG)

**[REQ-REG-1.1 – Asset Creation & Identification](functional-requirements.md#core-asset-registry)**

- **ID Generation:** Should the system auto-generate Asset IDs, or will admins manually enter them? If auto-generated, do you prefer a simple sequential format (00001) or logic-based "Smart IDs" (e.g., LAP-NY-001)?
<br><em>Asset tags must be auto-generated to prevent duplicates, prefer logic-based "Smart IDs" (e.g., LAP-NY-001) related to the existing format for the IDs.</em>
- **Tagging Technology:** Do you currently have existing Barcode/RFID stickers we must scan, or will the system need to generate and print new labels?
<br><em>There is an interest in barcodes for scanning via mobile to see asset info and owner (currently a "nice to have").</em>
- **Duplicate Logic:** Which fields constitute a unique constraint (Asset ID only, or Serial Number + Category)? Should the system block duplicates entirely or just warn the user?
<br><em>The Serial Number is unique for IT items and Asset Number is unique for non-IT Assets.</em>

**[REQ-REG-1.2 – Data Storage & Attributes](functional-requirements.md#core-asset-registry)**

- **Mandatory Fields:** Which fields are mandatory at creation vs. can be filled later? (e.g., Can I create a "Draft" asset without a Serial Number if it hasn't arrived?)
<br><em>The Asset Number,Serial Number ,Categorization</em>
- **Attachments:** Do we need to store file attachments like PDF invoices, warranty documents, or photos of damage?
<br><em>The system should store PDF invoices and documents.</em>
- **Customization:** Do you need a "Form Builder" feature where Admins can add custom fields without developer involvement?
<br><em>The system needs the ability to define custom fields.</em>

**[REQ-REG-1.3 – Asset Scope & Conditional Logic](functional-requirements.md#core-asset-registry)**

- **Scope:** What specific asset types must be supported initially? (Hardware, Software, Cloud)? Do we also need to track components (RAM, Hard Drives), IoT devices?
<br><em>Initially hardware (laptops, monitors, etc.) and software. Also includes office equipment (tables, chairs) under Admin/Facilities.</em>
- **Consumables vs. Assets:** For low-value items like mice, keyboards, or HDMI cables, do we track them as individual assets with unique IDs, or do we simply track the quantity in stock (e.g., "50 mice") without unique serialization?
<br><em>Items like keyboards and mice must be tracked per user, while HDMI cables are tracked by count only.</em>
- **Peripherals & Linking:** For complex setups, do we need to track peripherals (monitors, docking stations) as separate assets linked to the parent Computer ID, or are they considered part of a single "Kit"?
<br><em>Items like external adapters (USB-HDMI) need separate identification.</em>
- **Software Specifics:** For software, do we track license keys, expiry dates, and vendor portal links? Do we distinguish between named users and concurrent seats?
<br><em>Needs to track license keys, expiry dates, and vendors.</em>
- **Form Dynamics:** Should the form fields update in real-time as the Asset Type is selected (e.g., hiding "RAM" when "Software" is selected)?<br><em>Yes, form fields should update in real-time based on the selected category.</em>

**[REQ-REG-1.4 – Categorization](functional-requirements.md#core-asset-registry)**

- **Hierarchy:** Do you need a multi-level hierarchy (e.g., Hardware > IT > Laptop > MacBook) or a flat list?
<br><em>Uses a Brand > Model > Serial Number hierarchy.</em>
- **Governance:** Who can create/edit asset categories? Should they be global or department-specific?
<br><em>Only admins can create categories, and these can be department-specific.</em>

**[REQ-REG-1.5 – Search & Filter](functional-requirements.md#core-asset-registry)**

- **Criteria:** When IT staff urgently need to find an asset, what are the top three criteria they use (e.g., Serial Number, Employee, Status)?<br><em>Key columns for search are serial number, asset number, employee name, and status.</em>
- **List View:** What specific columns must appear in the search results without clicking into the record?<br><em>Must appear serial number, asset number, employee name, and status.</em>
- **Performance:** Is the two-second search requirement based on peak load? What is the expected asset volume in Year 1 vs. Year 3?<br><em>Yes the two-second search requirement based on peak load.</em>

**[REQ-REG-1.6 – Procurement & Financials](functional-requirements.md#core-asset-registry)**

- **Workflow:** Is asset registration done before or after procurement approval? Do we need to integrate with ERP systems for PO lookups?<br><em>asset registration done after procurement approval</em>
- **Cost Definition:** What constitutes "Initial Cost"? Is it just purchase price, or must we include Tax, Shipping, and Installation?<br><em>Purchase price should include base price, tax, and shipping.</em>
- **Multi-Currency:** Do we need to handle multi-currency support (e.g., assets bought in EUR vs. USD), or will everything be normalized to a base currency?<br><em>Support is needed for USD and LKR.</em>
- **Cloud Billing:** For consumption-based billing (AWS/Azure), do we enter a fixed budget or track actual monthly variable spend?<br><em>Track actual monthly billing .</em>
- **SaaS Optimization:** For SaaS (e.g., Salesforce, Slack), do we track the cost per seat? If so, does the system need to alert us to "zombie seats" (licenses we are paying for but no one is logging into)?<br><em>not tracked per seat</em>
- **Data Migration (Import):** When importing bulk data via CSV/Excel, if one row has an error, do we reject the whole file or just that row?<br><em>Valid rows should be imported even if one row has an error</em>
- **Undo:** Do we need an "Undo Import" feature?<br><em>undo feature is not required for import.</em>

### Part 2: User Access & Security (REQ-SEC)

**[REQ-SEC-2.1 – Authentication](functional-requirements.md#user-access-security)**

- **IdP Integration:** Which Identity Provider will be used?<br><em>Azure AD with SSO.</em>
- **External Users:** Since internal user creation is blocked, how do we handle external auditors, vendors, or contractors who are not in the corporate AD?<br><em>No system access; data is exported for them.</em>
- **MFA:** Should the system support Multi-Factor Authentication (MFA) via the existing provider?<br><em>Handled by Azure AD, not the application.</em>

**[REQ-SEC-2.2 – Roles & Permissions](functional-requirements.md#user-access-security)**

- **Granularity:** Beyond Admin and Read-Only, do we need specific roles for Asset Managers, Auditors, or Technicians?<br><em>Admin, Department-level Admins, IT Admins/Asset Managers, and Read-only.No external users</em>
- **Overrides:** Should admins be able to override role assignments manually, or must we rely strictly on SSO groups?<br><em>Most od the time rely on SSO groups.There can be times to override</em>
- **Sync Logic:** What happens to asset assignments when a user is disabled in AD (e.g., leaves the company)?<br><em>When a user is disabled in AD, their assets are marked as available.
</em>

**[REQ-SEC-2.3 – Security Compliance](functional-requirements.md#user-access-security)**

- **Sensitive Data:** Which specific fields (e.g., financial data, license keys) require encryption or masking in logs?<br><em>Financial data and license keys must be encrypted.</em>
- **Logging:** Do we need to log failed login attempts for security auditing?<br><em>audit logs are "good to have" for the system's security auditing</em>

### Part 3: Tracking & Operations (REQ-OPS)

**[REQ-OPS-3.1 – Assignment](functional-requirements.md#tracking-operations)**

- **Multi-Assignment:** Can an asset be assigned to multiple entities (e.g., shared ownership between departments) or is it strictly 1:1?<br>not shared with Teams or departments, it's strictly 1:1<em></em>
- **Non-Humans:** Can assets be assigned to rooms or locations (e.g., "Meeting Room A") rather than specific people?<br><em>Assets can be assigned to locations/rooms.</em>
- **Tagging Hierarchy:** Is there a strict hierarchy for location tags (e.g., Building > Floor > Room)?<br><em>Building-Floor-Room hierarchy.</em>
- **Acknowledgment:** Does assignment require a formal digital signature or email acknowledgment from the employee?<br><em>Users can "accept" via email notification.</em>

**[REQ-OPS-3.2 – Check-in/Check-out](functional-requirements.md#tracking-operations)**

- **Quick Loans:** Do we need a "Quick-Loan" workflow (e.g., borrowing a projector for two hours) that bypasses the full permanent assignment process?<br><em>No quick-loan workflow is needed.</em>
- **Mobile Features:** For the mobile interface, is offline mode required? Are we relying on the device camera for scanning?<br><em>Barcode scanning is a low-priority "nice to have".</em>
- **Return Condition:** Does the system need to force a condition check (e.g., Good, Damaged, Missing Parts) upon asset return?<br><em>The system should require condition updates upon return.</em>
- **Notifications:** Should the system trigger alerts via Email/SMS/Teams for overdue assets or check-in events?<br><em>Alerts via Email and Teams are needed for overdue assets.</em>

**[REQ-OPS-3.3 – Audit Log](functional-requirements.md#tracking-operations)**

- **Granularity:** Must the log capture "Value Before" and "Value After" for every change?<br><em>Yes, system must capture "before and after" values for every change</em>
- **Retention:** How long should logs be retained, and who has view access?<br><em>Logs should be kept for 5 years.</em>
- **Deletion:** If an asset is deleted, should it be a "Soft Delete" (archived) to preserve the audit trail?<br><em> Assets should be soft-deleted/archived, not permanently removed.</em>

**[REQ-OPS-3.4 – Lifecycle Management](functional-requirements.md#tracking-operations)**

- **Transitions:** Are lifecycle transitions (e.g., Active to Retired) manual or automated? Are there "forbidden transitions" (e.g., cannot go from "New" to "Disposed" without "In Stock")?<br><em>lifecycle transitions are manual and require specific approvals to ensure accuracy and oversight.
</em>
- **Disposal:** Do we need to track disposal reasons (Sold, Stolen, E-Waste) and attach certificates of destruction?<br><em>Requires tracking for disposal reasons (sold, stolen, etc.) and disposal certificates.</em>
- **VM Conversions:** When a physical server is converted to a VM, do we retire the hardware and link it to the new VM record to preserve history?<br><em>No special linking is needed between physical servers and VMs.</em>
- **Depreciation:** How do we handle "mid-month" conventions? (e.g., If bought Jan 25th, do we depreciate for the full month or zero?)<br><em>for mis-month changes, the full-month cost is considered rather than a pro-rated or zero amount</em>

### Part 4: Miscellaneous

**Workflows & Access**

- **Ticket Source:** Who can log maintenance requests? Is there a simplified portal for non-technical end-users?<br><em>No internal ticketing needed, use existing service desk tools.</em>
- **Approvals:** Does a repair request need manager approval before it becomes an official Work Order (e.g., if cost > $500)?<br><em>yes approval needed</em>
- **Help Desk Link:** Should this integrate with an existing Ticketing system (e.g., ServiceNow, Jira) or function as a standalone tracker?<br><em>No integration needed since, internal ticketing needed,</em>

**Operations & Costs**

- **Downtime:** How is downtime calculated—24/7 clock or Business Hours only? (e.g., Is Friday 5 PM to Monday 9 AM considered downtime?)<br><em>Typically downtime is calculated with related to business hours</em>
- **Cost Tracking:** Do we need to split repair costs between Parts vs. Labor?<br><em>Repair cost classification is not relevant</em>
- **Spare Parts:** Do we need to track an inventory of "Spare Parts" (e.g., five hard drives in a closet) within this system?<br><em>Track individual spare parts (like hard disks) for data devices.</em>
- **Vendor Ratings:** Do you need the ability to rate vendor performance (1–5 stars) on maintenance tickets?<br><em>There is no requirement to rate vendor performance within this system</em>
- **Lemon Law:** Do we need logic to trigger an alert if an asset breaks multiple times in a short period (e.g., three times in one month)?<br><em>Dashboard should highlight assets that break multiple times in a short period.</em>



[< Back to Requirements](./README.md)
