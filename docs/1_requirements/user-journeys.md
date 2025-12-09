## User Journeys

### Journey 1: Single Asset Onboarding & Assignment

- **Primary Actor:** IT Asset Manager & Finance Analyst
- **Goal:** Register a single high-value laptop and assign it to a new employee.
- **Flow:**
  1.  **Initiation:** The IT Asset Manager logs in to register a new laptop and selects "Hardware" as the asset type.
  2.  **Dynamic Entry:** The system applies conditional logic, showing only hardware-specific fields like Model and Serial Number.
  3.  **Validation:** The Manager enters the Serial Number, and the system immediately checks for duplicates.
  4.  **Financial Tagging:** A Finance Analyst (or proxy) selects the "Cost Center" and "Business Unit" from lookup lists to ensure proper depreciation.
  5.  **Assignment:** The Manager links the asset to an Employee ID, sets the physical location (e.g., "4th Floor Office"), and the system updates the status to "Assigned".
  6.  **Verification:** The new employee logs into their dashboard and sees the laptop listed among their assigned assets.

### Journey 2: Bulk Procurement & Intake

- **Primary Actor:** IT Technician
- **Goal:** Onboard 50 standard monitors quickly without manual data entry.
- **Flow:**
  1.  **Preparation:** The IT Technician downloads the system's import template.
  2.  **Data Compilation:** They populate the CSV with the 50 monitor records.
  3.  **Upload:** The Technician uploads the file, and the system maps columns to internal fields.
  4.  **Error Handling:** The system reports 48 successes and 2 failed rows, highlighting the problematic entries for correction and re-upload.

### Journey 3: Asset Custody Transfer (Check-In/Check-Out)

- **Primary Actor:** IT Technician & Asset Manager
- **Goal:** Reclaim equipment from a departing employee and re-issue it to a replacement hire.
- **Flow:**
  1.  **Return (Check-In):** The departing employee returns the laptop; the Technician records the check-in with timestamp and their ID.
  2.  **Audit Trail:** The Asset Manager reviews the "Custody History" tab to confirm the previous owner's timeline.
  3.  **Maintenance:** The Manager updates asset details (condition/status) to reflect "In Stock".
  4.  **Re-Issue (Check-Out):** A Technician checks the asset out to the new employee, logging the custodian and timestamp.
  5.  **Reassignment:** If only a departmental transfer is needed, the user reassigns the asset without a physical check-in.

### Journey 4: Compliance Audit

- **Primary Actor:** Compliance Officer, Security Officer, & Admin
- **Goal:** Verify the physical location of assets in a sensitive department.
- **Flow:**
  1.  **Configuration:** The Admin saves a filter named "High-Value Hardware in R&D" for quick retrieval.
  2.  **Physical Scan:** A Security Officer scans asset barcodes in R&D, and the system opens each asset profile for verification.
  3.  **Audit Mode:** The Asset Manager uses the full-screen Audit Mode to update status/condition as scans occur.
  4.  **Reporting:** The system produces an audit report detailing scanned assets and discrepancies where expected devices were not found.
  5.  **Export:** The Compliance Officer exports the validated list to a spreadsheet for the external audit.

### Journey 5: Lifecycle & Warranty Management

- **Primary Actor:** IT Asset Manager & Admin
- **Goal:** Manage expiring warranties and retire obsolete assets.
- **Flow:**
  1.  **Alerting:** The Admin monitors a dashboard widget that flags warranties expiring within 30 days.
  2.  **Investigation:** The Asset Manager filters by Vendor or Warranty Expiry Date to locate affected assets.
  3.  **Decision:** They identify an out-of-warranty laptop that is not worth renewing and locate it via Serial Number or Asset ID.
  4.  **Update:** The Manager changes the asset status to "Retired".
  5.  **Financial Impact:** Finance relies on the automatically generated depreciation to ensure accurate books upon retirement.
