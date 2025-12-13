## Elicitation Questions

### Part 0: Scope

- User Volume: Who are the key stakeholder groups (IT Ops, Finance, Procurement) and approximately how many users will be in each group?

### Part 1: Core Asset Registry (REQ-REG)

**[REQ-REG-1.1 – Asset Creation & Identification](functional-requirements.md#core-asset-registry)**

- **ID Generation:** Should the system auto-generate Asset IDs, or will admins manually enter them? If auto-generated, do you prefer a simple sequential format (00001) or logic-based "Smart IDs" (e.g., LAP-NY-001)?
- **Tagging Technology:** Do you currently have existing Barcode/RFID stickers we must scan, or will the system need to generate and print new labels?
- **Duplicate Logic:** Which fields constitute a unique constraint (Asset ID only, or Serial Number + Category)? Should the system block duplicates entirely or just warn the user?

**[REQ-REG-1.2 – Data Storage & Attributes](functional-requirements.md#core-asset-registry)**

- **Mandatory Fields:** Which fields are mandatory at creation vs. can be filled later? (e.g., Can I create a "Draft" asset without a Serial Number if it hasn't arrived?)
- **Attachments:** Do we need to store file attachments like PDF invoices, warranty documents, or photos of damage?
- **Customization:** Do you need a "Form Builder" feature where Admins can add custom fields without developer involvement?

**[REQ-REG-1.3 – Asset Scope & Conditional Logic](functional-requirements.md#core-asset-registry)**

- **Scope:** What specific asset types must be supported initially? (Hardware, Software, Cloud)? Do we also need to track components (RAM, Hard Drives), IoT devices?
- **Consumables vs. Assets:** For low-value items like mice, keyboards, or HDMI cables, do we track them as individual assets with unique IDs, or do we simply track the quantity in stock (e.g., "50 mice") without unique serialization?
- **Peripherals & Linking:** For complex setups, do we need to track peripherals (monitors, docking stations) as separate assets linked to the parent Computer ID, or are they considered part of a single "Kit"?
- **Software Specifics:** For software, do we track license keys, expiry dates, and vendor portal links? Do we distinguish between named users and concurrent seats?
- **Form Dynamics:** Should the form fields update in real-time as the Asset Type is selected (e.g., hiding "RAM" when "Software" is selected)?

**[REQ-REG-1.4 – Categorization](functional-requirements.md#core-asset-registry)**

- **Hierarchy:** Do you need a multi-level hierarchy (e.g., Hardware > IT > Laptop > MacBook) or a flat list?
- **Governance:** Who can create/edit asset categories? Should they be global or department-specific?

**[REQ-REG-1.5 – Search & Filter](functional-requirements.md#core-asset-registry)**

- **Criteria:** When IT staff urgently need to find an asset, what are the top three criteria they use (e.g., Serial Number, Employee, Status)?
- **List View:** What specific columns must appear in the search results without clicking into the record?
- **Performance:** Is the two-second search requirement based on peak load? What is the expected asset volume in Year 1 vs. Year 3?

**[REQ-REG-1.6 – Procurement & Financials](functional-requirements.md#core-asset-registry)**

- **Workflow:** Is asset registration done before or after procurement approval? Do we need to integrate with ERP systems for PO lookups?
- **Cost Definition:** What constitutes "Initial Cost"? Is it just purchase price, or must we include Tax, Shipping, and Installation?
- **Multi-Currency:** Do we need to handle multi-currency support (e.g., assets bought in EUR vs. USD), or will everything be normalized to a base currency?
- **Cloud Billing:** For consumption-based billing (AWS/Azure), do we enter a fixed budget or track actual monthly variable spend?
- **SaaS Optimization:** For SaaS (e.g., Salesforce, Slack), do we track the cost per seat? If so, does the system need to alert us to "zombie seats" (licenses we are paying for but no one is logging into)?
- **Data Migration (Import):** When importing bulk data via CSV/Excel, if one row has an error, do we reject the whole file or just that row?
- **Undo:** Do we need an "Undo Import" feature?

### Part 2: User Access & Security (REQ-SEC)

**[REQ-SEC-2.1 – Authentication](functional-requirements.md#user-access-security)**

- **IdP Integration:** Which Identity Provider will be used?
- **External Users:** Since internal user creation is blocked, how do we handle external auditors, vendors, or contractors who are not in the corporate AD?
- **MFA:** Should the system support Multi-Factor Authentication (MFA) via the existing provider?

**[REQ-SEC-2.2 – Roles & Permissions](functional-requirements.md#user-access-security)**

- **Granularity:** Beyond Admin and Read-Only, do we need specific roles for Asset Managers, Auditors, or Technicians?
- **Overrides:** Should admins be able to override role assignments manually, or must we rely strictly on SSO groups?
- **Sync Logic:** What happens to asset assignments when a user is disabled in AD (e.g., leaves the company)?

**[REQ-SEC-2.3 – Security Compliance](functional-requirements.md#user-access-security)**

- **Sensitive Data:** Which specific fields (e.g., financial data, license keys) require encryption or masking in logs?
- **Logging:** Do we need to log failed login attempts for security auditing?

### Part 3: Tracking & Operations (REQ-OPS)

**[REQ-OPS-3.1 – Assignment](functional-requirements.md#tracking-operations)**

- **Multi-Assignment:** Can an asset be assigned to multiple entities (e.g., shared ownership between departments) or is it strictly 1:1?
- **Non-Humans:** Can assets be assigned to rooms or locations (e.g., "Meeting Room A") rather than specific people?
- **Tagging Hierarchy:** Is there a strict hierarchy for location tags (e.g., Building > Floor > Room)?
- **Acknowledgment:** Does assignment require a formal digital signature or email acknowledgment from the employee?

**[REQ-OPS-3.2 – Check-in/Check-out](functional-requirements.md#tracking-operations)**

- **Quick Loans:** Do we need a "Quick-Loan" workflow (e.g., borrowing a projector for two hours) that bypasses the full permanent assignment process?
- **Mobile Features:** For the mobile interface, is offline mode required? Are we relying on the device camera for scanning?
- **Return Condition:** Does the system need to force a condition check (e.g., Good, Damaged, Missing Parts) upon asset return?
- **Notifications:** Should the system trigger alerts via Email/SMS/Teams for overdue assets or check-in events?

**[REQ-OPS-3.3 – Audit Log](functional-requirements.md#tracking-operations)**

- **Granularity:** Must the log capture "Value Before" and "Value After" for every change?
- **Retention:** How long should logs be retained, and who has view access?
- **Deletion:** If an asset is deleted, should it be a "Soft Delete" (archived) to preserve the audit trail?

**[REQ-OPS-3.4 – Lifecycle Management](functional-requirements.md#tracking-operations)**

- **Transitions:** Are lifecycle transitions (e.g., Active to Retired) manual or automated? Are there "forbidden transitions" (e.g., cannot go from "New" to "Disposed" without "In Stock")?
- **Disposal:** Do we need to track disposal reasons (Sold, Stolen, E-Waste) and attach certificates of destruction?
- **VM Conversions:** When a physical server is converted to a VM, do we retire the hardware and link it to the new VM record to preserve history?
- **Depreciation:** How do we handle "mid-month" conventions? (e.g., If bought Jan 25th, do we depreciate for the full month or zero?)

### Part 4: Miscellaneous

**Workflows & Access**

- **Ticket Source:** Who can log maintenance requests? Is there a simplified portal for non-technical end-users?
- **Approvals:** Does a repair request need manager approval before it becomes an official Work Order (e.g., if cost > $500)?
- **Help Desk Link:** Should this integrate with an existing Ticketing system (e.g., ServiceNow, Jira) or function as a standalone tracker?

**Operations & Costs**

- **Downtime:** How is downtime calculated—24/7 clock or Business Hours only? (e.g., Is Friday 5 PM to Monday 9 AM considered downtime?)
- **Cost Tracking:** Do we need to split repair costs between Parts vs. Labor?
- **Spare Parts:** Do we need to track an inventory of "Spare Parts" (e.g., five hard drives in a closet) within this system?
- **Vendor Ratings:** Do you need the ability to rate vendor performance (1–5 stars) on maintenance tickets?
- **Lemon Law:** Do we need logic to trigger an alert if an asset breaks multiple times in a short period (e.g., three times in one month)?

[Back to Root](../../README.md)
