# Epic 13: Asset Assignment

## Summary

This epic governs the core logistics of checking hardware in and out. It introduces a dedicated "Assignments & Returns" operational dashboard. From the "Available Assets" tab, IT Administrators can securely assign single or multiple assets to a specific User or a physical Location. To ensure data integrity, it includes strict UI gating to prevent double-booking, tracks temporary "loaner" equipment, and enables high-volume deployments via Bulk Assignment workflows.

## In Scope

- A dedicated `Operations > Assignments & Returns` dashboard with 3 tabs.
- An "Assign Asset" UI modal triggered from the slide-out panel (available in both the Operations dashboard and the main Registries).
- A Bulk Assignment workflow to assign multiple selected rows to a single user/location.
- Searchable User and Location dropdowns driven by Master Data.
- State validation (UI gating and backend fail-safes) to prevent double-assignments.
- An optional "Expected Return Date" picker for temporary loaners.

## Out of Scope / Limitations

- Returns & Check-Ins: The "Assigned Assets" and "Returned Assets" tabs of the new dashboard will be fully detailed in Epic 14.
- Self-Service Requests: Employees cannot assign assets to themselves.

### User Stories

- [US-13.1 — The Operations Dashboard & Single Assignment](https://app.clickup.com/t/86ewvnunn)
- [US-13.2 — Bulk Asset Assignment](https://app.clickup.com/t/86ewvnunu)
- [US-13.3 — The Assignment Modal & Allocation Types](https://app.clickup.com/t/86ewvnup6)
- [US-13.4 — UI State Gating & Conflict Prevention](https://app.clickup.com/t/86ewvnupy)
- [US-13.5 — Pillar-Restricted Bulk Location Transfers](https://app.clickup.com/t/86ewvnuq1)

---

## User Story: US-13.1 — The Operations Dashboard & Single Assignment

- As an IT Operator,
- I want to use a dedicated Operations dashboard to view only available inventory and assign it to users,
- So that I don't have to sift through broken or already-assigned equipment in the main registry when trying to deploy new gear.

### Acceptance Criteria (Gherkin)

- Scenario: Accessing the Operations Dashboard
  - Given I navigate to `Operations > Assignments & Returns` from the left sidebar
  - When the page loads
  - Then I see a data grid with three tabs: `Available Assets`, `Assigned Assets`, and `Returned Assets`.
  - And the `Available Assets` tab is selected by default, strictly filtering the grid to `Status === 'Available'`.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/042b57b0-1b4e-4bc7-ac47-86942cab4f04/Available%20Assets%20available%20assets%20-%20Desktop.png)
- Scenario: Triggering a Single Assignment
  - Given I am on the `Available Assets` tab
  - When I click the row for "Lenovo Thinkpad T14"
  - Then the Asset Details panel slides out from the right
  - And I can click the primary "Assign" button in the bottom-right footer to launch the assignment modal.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/2c221104-1cd7-4c78-a6cf-e3baa7e9be58/Single%20Asset%20Assignment-%20Desktop.png)
- Scenario: Global Accessibility (Main Registry Trigger)
  - Given I am browsing the main `IT & Digital > Hardware` registry instead of the Operations dashboard
  - When I click an available asset to open its slide-out panel
  - Then the exact same "Assign" workflow is available to me there, ensuring I do not have to switch pages unnecessarily.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/c6fb6d25-8a0d-4d42-815b-8c7fce97052b/Asset%20Details%20(Available)-%20Desktop.png)

### Technical Implementation Tasks

- [ ] Build the `Assignments & Returns` layout component with the 3-tab navigation structure.
- [ ] Configure the `Available Assets` data grid to automatically apply a `WHERE status = 'Available'` filter to the API fetch.

---

## User Story: US-13.2 — Bulk Asset Assignment

- As an IT Operations Admin,
- I want to select multiple available assets and assign them all to a single User or Location at once,
- So that I can rapidly deploy a batch of equipment (e.g., a laptop, monitor, and phone to a new hire) without filling out the assignment form three separate times.

### Acceptance Criteria (Gherkin)

- Scenario: Multi-Select Bulk Assignment
  - Given I am on the `Available Assets` tab
  - When I use the checkboxes to select 3 different rows (e.g., a Laptop, a Monitor, and a Keyboard)
  - Then a "Bulk Assign" option appears in the active Bulk Actions toolbar.
  - When I click it, the Assignment Modal opens showing a summary (e.g., "Assigning 3 Assets").
  - And when I select a User (e.g., "Jane Doe") and confirm, all 3 assets instantly change to "Assigned" and are linked to Jane Doe in a single database transaction.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/31252d47-4204-4ec7-9c11-72d6c3039a2a/Multiple%20Assets%20Assignment-%20Desktop.png)
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/28645b74-e2f3-48e7-a85c-e44279689a16/Multiple%20Assets%20Assignment%20for%20User-%20Desktop.png)

### UI/UX Specifications & Constraints

- Mixed Pillar Support: Bulk assignment must support mixed pillars (e.g., assigning Hardware and Software simultaneously to the same user).

### Technical Implementation Tasks

- [ ] Add a "Bulk Assign" button to the Epic 6 Data Grid toolbar that only renders when `selectedRows > 1` and all selected rows are `Available`.
- [ ] Create a batch assignment API endpoint (`POST /api/v1/assets/bulk-assign`) that loops through the array of Asset IDs and updates them in a single transaction.

---

## User Story: US-13.3 — The Assignment Modal & Allocation Types

- As a Global Admin,
- I want to specify whether an item is going to a person or a physical room,
- So that portable devices track to an owner, but shared infrastructure (like a conference room TV) tracks to a location.

### Acceptance Criteria (Gherkin)

- Scenario: Assigning to a User vs. Location
  - Given I have opened the Assign Asset modal (for either a single or bulk operation)
  - When I toggle between the "User" or "Location" assignment type
  - Then the searchable dropdown updates its data source accordingly.
  - And selecting a User updates the `Custodian` field, whereas selecting a Location updates the `Location` field.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/96b00989-6505-4eaf-a19e-9dd6321f66de/Multiple%20Assets%20Assignment%20for%20User-%20Desktop2.png)
- Scenario: Temporary Loaner Tracking
  - Given I am filling out the assignment modal
  - When I optionally select a date from the "Expected Return Date" calendar picker
  - Then that date is saved to the assignment record, allowing the Notification Engine (Epic 12) to trigger return reminders.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/0eb58892-b55f-4c89-bc9b-13dc63e255aa/Multiple%20Assets%20Assignment%20for%20User-%20Desktop3.png)

### Technical Implementation Tasks

- [ ] Build the "Assign Asset" UI modal with the User vs. Location toggle, the searchable dropdown, and the optional Date Picker.

---

## User Story: US-13.4 — UI State Gating & Conflict Prevention

- As a System Admin,
- I want the system UI to strictly block invalid assignment actions,
- So that I am physically prevented from double-booking a laptop.

### Acceptance Criteria (Gherkin)

- Scenario: UI Button Visibility Gating
  - Given I open the Asset Details panel for an item
  - When its Status is `Assigned`, `In Repair`, or `Lost`
  - Then the primary "Assign" button is completely hidden from the footer.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/ea8648a6-ae81-472b-9f3d-19e1b18f8e48/Asset%20Details%20(Assigned)-%20Desktop.png)
- Scenario: Backend Race-Condition Fail-Safe
  - Given two IT Admins have the same `Available` laptop open on their screens
  - When Admin A assigns it to Jane, and Admin B attempts to assign it to Mike a second later using their stale browser window
  - Then the backend blocks Admin B's database transaction with an error: "Asset is no longer available."

### Technical Implementation Tasks

- [ ] Write frontend logic to conditionally hide/disable the Assign button based on `asset.status === 'Available'`.

---

## User Story: US-13.5 — Pillar-Restricted Bulk Location Transfers

- As a Facilities Manager,
- I want to mass-update the physical location of unassigned furniture or shared electronics,
- But I want the system to block this action for portable hardware and software, where location tracking behaves differently.

### Acceptance Criteria (Gherkin)

- Scenario: Valid Bulk Location Transfer (Furniture/Electronics)
  - Given I have selected 50 "Ergonomic Chairs" (Furniture) in the grid
  - When I click "Bulk Edit" and select a new Location (e.g., "Floor 4")
  - Then all 50 assets are updated to the new Location in a single backend transaction
  - And the System Audit Log records an individual Location Change event for each asset.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/16230d4a-d0de-4755-bb22-52b376e72d39/All%20Asset%20List%20View(Furniture)%20-%20Desktop1.png)
- Scenario: Invalid Bulk Transfer (Portable Hardware)
  - Given I have selected multiple "Laptops" or "Mobiles" in the Hardware grid
  - When I look at the Bulk Action toolbar
  - Then the "Change Location" option is disabled or hidden, because portable hardware location is dictated by its assigned User, not a fixed room.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/e26744f5-5fad-45a4-9614-887dc5c3e74b/Asset%20List%20Checked%20View%20-%20Desktop.png)
- Scenario: Invalid Bulk Transfer (Software)
  - Given I have selected multiple records in the Software grid
  - When I look at the Bulk Action toolbar
  - Then the "Change Location" option is completely hidden, because digital assets do not have physical locations.

### Technical Implementation Tasks

- [ ] Update the Epic 6 Bulk Action toolbar logic to evaluate the `pillar` and `category` of the selected rows before rendering the "Change Location" button.
- [ ] Implement a backend batch-update endpoint (`PATCH /api/v1/assets/bulk-location`) that writes to the `AuditLog` iteratively for every updated asset.
