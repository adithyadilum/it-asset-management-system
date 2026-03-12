# Epic 8: Asset Details View

## Summary

This epic focuses on the "Read" and "Interact" portion of an individual asset's lifecycle. It introduces a comprehensive Right-Side Slide-Out Panel triggered by clicking any row in the data grids. By tailoring the panel's internal tabs (`Asset Details`, `Technical Details`, `Purchase Details`, `History`) to the specific pillar of the selected asset, the system ensures IT Operators and Facilities Managers only see data relevant to their exact domain.

## In Scope

- A fixed 700px right-side slide-out panel triggered by row clicks.
- A top-level tab navigation structure.
- A primary "Asset Details" summary view featuring a device image, status badge, 2-column data grid, and a recent Maintenance Records list.
- A "QR Code" icon button located in the Asset Details grid.
- Distinct, pillar-specific tab layouts for Hardware, Software, Furniture, and Electronics.
- Context-aware Quick Action buttons (e.g., Edit, Assign, Return) pinned to the bottom footer.

## Out of Scope / Limitations

- Generating or printing the QR codes (Covered in Epic 9).
- The full execution of Maintenance ticketing (This is a separate Operations Epic; this UI merely displays the summary).
- Modifying the Audit History is strictly prohibited (Read-Only).

### User Stories

- [US-8.1 — Slide-Out Panel & Navigation](https://app.clickup.com/t/86ewvhjb1)
- [US-8.2 — Hardware Asset Profile](https://app.clickup.com/t/86ewvhjb7)
- [US-8.3 — Software Asset Profile](https://app.clickup.com/t/86ewvhjbn)
- [US-8.4 — Furniture & Fixtures Profile](https://app.clickup.com/t/86ewvhjc7)
- [US-8.5 — Office Electronics Profile](https://app.clickup.com/t/86ewvhjce)
- [US-8.6 — Purchase Details & History Mechanics](https://app.clickup.com/t/86ewvhjcx)

---

## User Story: US-8.1 — Slide-Out Panel & Navigation

- As a System User,
- I want to click on a grid row to open a standardized Slide-Out Panel and stays open while I click around the grid,
- So that I can rapidly audit multiple assets one after the other by watching the panel dynamically update, without having to constantly open and close it.

### Acceptance Criteria (Gherkin)

- Scenario: The User Journey (Triggering the Panel)
  - Given I navigate to a pillar registry (e.g., Hardware) and search for a specific asset
  - When I click the row for "Thinkpad T14"
  - Then a panel exactly 700px wide slides in from the right edge of the screen
  - And the left sidebar dynamically collapses to icons to make room
  - And the main data grid remains fully visible and completely interactive next to the panel.

![](https://t90181861921.p.clickup-attachments.com/t90181861921/14bf1ac8-91eb-43f4-8e2c-af63991d1ffb/Asset%20Details%20(Assigned)-%20Desktop.png)

- Scenario: Dynamic Row Switching (Rapid Auditing)
  - Given the slide-out panel is currently open and displaying data for "Thinkpad T14"
  - When I click a different row (e.g., "HP EliteBook 840") in the adjacent data grid
  - Then the panel does not close and reopen
  - And the panel's data instantly hot-swaps to display the details, tabs, and history of the newly selected "HP EliteBook 840".
- Scenario: Closing the Panel
  - Given the panel is open
  - When I click the small "X" close icon located in the top right corner of the panel header
  - Then the panel slides away seamlessly
  - And the left sidebar expands back to its full width.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/c9c7c1af-60c9-4ebf-b433-830bb890dcba/Asset%20Details%20(Assigned)(Close)-%20Desktop.png)

### UI/UX Specifications & Constraints

- Active Row Highlighting: When the panel is open, the currently selected row in the data grid must remain visually highlighted (e.g., a light blue or gray background hue) so the user never loses track of which asset they are viewing in the panel.
- Loading State: When dynamically switching between rows, if the API takes a moment to fetch the new asset's history, display a subtle loading skeleton inside the panel rather than flashing a blank white screen.

### Technical Implementation Tasks

- [ ] Build the base Slide-Out Sheet React component ensuring it does _not_ trap focus or block interaction with the underlying DOM elements.
- [ ] Implement a `selectedAssetId` state variable at the grid level that passes down to the panel.
- [ ] Write a `useEffect` hook inside the panel component that listens for changes to `selectedAssetId` and triggers a fresh `GET /api/v1/assets/{id}` fetch, smoothly replacing the panel's internal data.

---

## User Story: US-8.2 — Hardware Asset Profile

- As an IT Operator troubleshooting physical devices,
- I want to view a Hardware-specific tab layout,
- So that I can quickly find device specifications, assignments, repair history, and the physical QR code tag.

### Acceptance Criteria (Gherkin)

- Scenario: The User Journey (Hardware Tabs)
  - Given I navigate to the Hardware registry and click on a Laptop row
  - When the panel loads
  - Then I see four specific tabs: `Asset Details`, `Technical Details`, `Purchase Details`, and `History`.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/351f81eb-f4d1-469d-a473-ce16a3f6b857/Asset%20Details%20(Assigned)-%20Desktop%20Tabs%20hilighted.png)
- Scenario: Asset Details Summary View
  - Given I am on the default "Asset Details" tab
  - Then I see an image of the device centered at the top, with a pill-shaped Status badge (e.g., `Assigned`) directly underneath it.
  - And below that, I see a 2-column grid containing: `Asset ID`, `Category`, `Model`, `Brand`, `Serial Number`, `Owner`, `Assigned to`, `Group`, `Date Created`, `Warranty` (with status badge), `Updated at`, and `Last Repaired`.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/f8b42ab9-619e-42fe-b925-7df7debc2859/Asset%20Details%20(Assigned)-%20Desktop.png)
- Scenario: QR Code Tag Button
  - Given I am reviewing the 2-column grid on the Asset Details tab
  - When I look at the "Asset Tag" row
  - Then I see an outline button labeled "\[QR Icon\] QR Code"
  - And clicking it opens a preview of the physical tracking tag (logic deferred to Epic 9).
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/ea467e00-2332-4324-bf24-d7df673aa31c/Asset%20Details%20(QR%20preview)-%20Desktop.png)
- Scenario: Maintenance Records Summary
  - Given I scroll down on the Asset Details tab
  - Then I see a "Maintenance Records" card displaying the 3 most recent service events (Date and Description) and a "View all maintenance records" link.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/2fa4429c-612d-404c-bf17-0e7601d0419e/Asset%20Details%20(Assigned)-%20Desktop(maintainance%20Records).png)
- Scenario: Technical Details Tab
  - Given I click the "Technical Details" tab
  - Then I see the dynamic Custom Fields established in Epic 3 (e.g., "RAM: 16GB", "Storage: 512GB SSD").
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/ff47534d-f320-487d-bfc7-384dde9d9254/Tech%20Details-%20Desktop.png)

### Technical Implementation Tasks

- [ ] Implement conditional tab rendering based on `asset.pillar === 'Hardware'`.
- [ ] Build the 2-column CSS Grid layout for the Asset Details tab.
- [ ] Add the QR icon button placeholder that will trigger the Epic 9 generation modal.

---

## User Story: US-8.3 — Software Asset Profile

- As an IT Operator managing digital licenses,
- I want to view a Software-specific tab layout,
- So that I can track subscription keys and seat counts without being cluttered by physical specifications like "Maintenance Records".

### Acceptance Criteria (Gherkin)

- Scenario: The User Journey (Software Tabs)
  - Given I navigate to the Software registry and click on the "Photoshop" (PRP-003) row
  - When the panel loads
  - Then I see three specific tabs: Details, Purchase Details, and Assignments.
- Scenario: Asset Details Tab (Digital Info)
  - Given I am on the "Details" tab
  - Then the 2-column grid displays: Software ("Photoshop"), Category ("Subscription"), Licensed Key ("dddd-dd-dddd"), Total Seats ("50"), Available Seats ("30"), and Renewal Date ("02 / 03 / 2026").
  - And the "Maintenance Records" section and "QR Code" button are completely hidden, as software cannot be physically tagged or repaired.
- Scenario: Assignments Tab (Seat Allocation and History)
  - Given I click the "Assignments" tab
  - Then I see an assignment table with columns: User, Action, Date of Action, and Performed By (e.g., "Thushara").
  - And I see specific assignment records (e.g., "User 1" marked as "Assigned" on "12/03/2026").
  - And I see contextual action buttons on each row to "Revoke" an active seat or "Assign" a previously revoked seat.

### Technical Implementation Tasks

- [ ] Implement conditional tab rendering based on `asset.pillar === 'Software'`.
- [ ] Build the securely masked "reveal" component for the License Key on the frontend.

![](https://t90181861921.p.clickup-attachments.com/t90181861921/f86df33b-5165-4e0c-81e4-3266b5f1a697/Software%20List%20View%20-%20Desktop.png)
![](https://t90181861921.p.clickup-attachments.com/t90181861921/aabb2423-3742-4b0f-bf18-74b19b7e2dab/Software%20Asset%20Profile-%20Desktop.png)
![](https://t90181861921.p.clickup-attachments.com/t90181861921/3976321a-cbdb-4797-8661-a2d5b9ab0269/Software%20license%20assignment%20History%20-%20Desktop.png)

---

## User Story: US-8.4 — Furniture & Fixtures Profile

- As a Facilities Manager,
- I want to view a Furniture-specific tab layout,
- So that I can verify physical dimensions, locations, and conditions of office property.

### Acceptance Criteria (Gherkin)

- Scenario: The User Journey (Furniture Tabs)
  - Given I navigate to the Furniture registry and click on an Ergonomic Chair row
  - When the panel loads
  - Then I see four specific tabs: `Asset Details`, `Physical Details`, `Purchase Details`, and `History`.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/223536fe-d513-4939-a5e1-ae92ad2ab125/Asset%20Details%20(Assigned)-%20Auditor%20View(Furniture)-Tabs.png)
- Scenario: Asset Details Tab (Location Focus)
  - Given I am on the "Asset Details" tab
  - Then the 2-column grid prominently displays the `Location` (Building/Floor/Zone) and `Condition` instead of a user assignment.
  - And the "QR Code" icon button is visible.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/026dd8e6-6e95-4be3-9a90-bfb3c11afd6d/Asset%20Details%20(Assigned)-%20Auditor%20View(Furniture)-Details.png)
- Scenario: Physical Details Tab
  - Given I click the "Physical Details" tab
  - Then I see dynamic Custom Fields related to furniture (e.g., "Dimensions: 60x30", "Material: Wood").
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/92bdf3b4-c399-4169-8096-2982757b4a5e/Tech%20Details-%20Desktop(Auditor%20View)(Furniture)Tiny.png)

### Technical Implementation Tasks

- [ ] Implement conditional tab rendering based on `asset.pillar === 'Furniture'`.

---

## User Story: US-8.5 — Office Electronics Profile

- As an IT or Facilities Manager,
- I want to view an Electronics-specific tab layout,
- So that I can track shared infrastructure and its network configurations.

### Acceptance Criteria (Gherkin)

- Scenario: The User Journey (Electronics Tabs)
  - Given I navigate to the Office Electronics registry and click on a Smart TV row
  - When the panel loads
  - Then I see four specific tabs: `Asset Details`, `Technical Details`, `Purchase Details`, and `History`.
- Scenario: Asset Details Tab (Infrastructure Focus)
  - Given I am on the "Asset Details" tab
  - Then the 2-column grid prominently displays the `Location`, `Maintenance Status`, and `Next Scheduled Maintenance Date`.
  - And the "QR Code" icon button is visible.
  - And the "Maintenance Records" section is visible at the bottom of the tab.

### Technical Implementation Tasks

- [ ] Implement conditional tab rendering based on `asset.pillar === 'Electronics'`.

---

## User Story: US-8.6 — Purchase Details & History Mechanics

- As a Finance Auditor or Security Admin,
- I want to review the financial lifecycle and audit history of the asset regardless of its pillar,
- So that I can track depreciation and chronological user assignments across the entire system.

### Acceptance Criteria (Gherkin)

- Scenario: Reviewing Purchase Details
  - Given I click the "Purchase Details" tab on any asset
  - When the view loads
  - Then I see the Initial Purchase Cost, Tax, Shipping, and the original Currency (e.g., $1150 USD).
  - And I can click "Download Invoice" to securely retrieve the PDF receipt from cloud storage.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/f0744dbb-921f-4509-b6b8-a6779ebafcc7/Purchase%20Details-%20Desktop.png)
- Scenario: Viewing the Audit Timeline
  - Given I click the "History" tab on any asset
  - When the view loads
  - Then I see a vertical, chronological timeline generated from the Epic 4 Audit Log.
  - And the timeline details every state change (e.g., "02/03/2026: Assigned to Mark Kim").
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/56a3c50c-cf6f-4f62-8f19-003263e5c6b3/Asset%20History%20-%20Desktop.png)

### Technical Implementation Tasks

- [ ] Implement secure file retrieval logic from the AWS S3/Azure Blob bucket to generate a temporary, signed download URL for the invoice.
- [ ] Write an API query pulling specifically from the `AuditLogs` table where `target_asset_id = {current_asset}` to populate the History timeline.
