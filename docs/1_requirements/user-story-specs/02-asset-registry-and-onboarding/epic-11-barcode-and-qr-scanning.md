# Epic 11: Mobile Companion Tag Scanning

## Summary

This epic introduces a Progressive Web App (PWA) Mobile Companion that radically speeds up field operations and data entry. It acts as a role-aware mobile dashboard: standard employees see a restricted view (deferred to a future epic), while IT Admins get a powerful launchpad featuring a massive "Launch Scanner" tool.
Powered by WebSockets and Azure AD identity matching, the scanner operates in three modes:
1. Standalone Lookup: Scanning a QR tag in the field opens a mobile bottom-sheet with asset details.
2. Desktop Synchronization: Scanning a QR tag while logged into the desktop _automatically_ slides open the 700px Asset Details panel on the desktop monitor.
3. Tethered Data Entry: Scanning a 1D manufacturer barcode injects the serial number directly into the active desktop registration form.

## In Scope

- Role-based mobile routing (Admins vs. Standard Employees).
- An Admin Mobile Dashboard featuring quick metrics and a primary "Launch Scanner" button.
- Mobile "Empty State" blockers preventing access to complex desktop-only grids.
- A PWA HTML5 camera scanner interface.
- A Standalone Mobile Lookup bottom-sheet UI.
- Real-time WebSocket cross-device synchronization (Remote Control & Data Injection).

## Out of Scope / Limitations

- Employee Portal Features: The specific functionality of the standard employee mobile view (requesting assets, reporting issues) is deferred to the future Employee Portal epic. This epic only handles the access gating.
- Native App Store Deployment: The scanner is accessed entirely via the mobile browser.

### User Stories

- [US-11.1 — Mobile Role Routing & Admin Dashboard](https://app.clickup.com/t/86ewvm380)
- [US-11.2 — Desktop Feature Gating (Empty State)](https://app.clickup.com/t/86ewvm3c3)
- [US-11.3 — Standalone Mobile Scanner & Lookup](https://app.clickup.com/t/86ewvm3h2)
- [US-11.4 — Cross-Device Desktop Synchronization (Remote Control)](https://app.clickup.com/t/86ewvm3nc)
- [US-11.5 — Barcode Injection (Tethered Registration)](https://app.clickup.com/t/86ewvm3qx)

---

## User Story: US-11.1 — Mobile Role Routing & Admin Dashboard

- As an IT Admin logging into the system on my phone,
- I want to be presented with a mobile-optimized dashboard tailored to my role,
- So that I have immediate access to the scanner tool and quick metrics without trying to navigate a desktop-sized UI.

### Acceptance Criteria (Gherkin)

- Scenario: Role-Based Rendering (Standard Employee)
  - Given I log into the PWA on my mobile device
  - When my Azure AD token identifies my role as "Standard Employee"
  - Then the scanner functionality is entirely hidden from my UI
  - And I am routed to a minimal employee dashboard (to be fully built in a future epic).
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/d010ca65-38b7-48c1-83c2-86e18c9fb1db/Employee-Portal-Mobile.png)
- Scenario: Admin Mobile Dashboard
  - Given I log into the PWA on my mobile device
  - When my role is "Global Admin" or "IT Operator"
  - Then I am presented with the Admin Mobile Dashboard.
  - And the UI prominently displays a massive, dark-blue "Launch Scanner" button at the top.
  - And below it, I see "Quick Metrics" cards (e.g., My Assigned Assets, Pending Approvals) and a list of "Recent Activities".
  - And a fixed bottom navigation bar is present (Home, My Assets, Notifications).
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/bc59bf00-15e9-4985-8bab-17c6c44eb56d/Admin%20Portal%20-%20Mobile.png)

### UI/UX Specifications & Constraints

- Touch Targets: The "Launch Scanner" button must be massive, acting as the primary hero element of the page to ensure it is easily tappable while walking or holding equipment.
- Bottom Navigation: The bottom nav must remain fixed (`position: fixed; bottom: 0`) across all mobile screens to provide an easy escape hatch back to the dashboard.

### Technical Implementation Tasks

- [ ] Build the mobile-responsive `AdminMobileDashboard` React layout.
- [ ] Implement routing guards that read the JWT role and direct standard users away from the Admin UI.

---

## User Story: US-11.2 — Desktop Feature Gating (Empty State)

- As a mobile user,
- I want the system to gracefully block me from accessing complex desktop screens,
- So that I don't struggle with broken, unreadable 15-column data grids on a 6-inch screen.

### Acceptance Criteria (Gherkin)

- Scenario: Desktop-Only Feature Gating
  - Given I am logged into the mobile PWA
  - When I try to manually type or navigate to a dense desktop route like `/registry/hardware`
  - Then I am prevented from loading the grid
  - And I am presented with a clean "Desktop Screen Required" Empty State view.
  - And the view includes a monitor icon illustration, an explanatory message, and a primary "Return to Mobile Dashboard" button.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/b016020b-ac0a-4e57-a0a9-7905f6c6097d/Admin%20Portal%20-%20Empty%20-%20Mobile.png)

### Technical Implementation Tasks

- [ ] Write React viewport hooks (`window.innerWidth`) or CSS Media Queries to detect mobile constraints.
- [ ] Build the Fallback Illustration component matching the exact UI design.

---

## User Story: US-11.3 — Standalone Mobile Scanner & Lookup

- As an IT Admin walking through the office,
- I want to tap "Launch Scanner" and scan a physical QR sticker to instantly see the asset's details on my phone,
- So that I can verify hardware assignments in the field without returning to my desk.

### Acceptance Criteria (Gherkin)

- Scenario: Launching the Scanner
  - Given I am on the Admin Mobile Dashboard
  - When I tap the "Launch Scanner" button
  - Then a full-screen camera overlay activates with a targeting reticle.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/4d490863-ff1b-411a-9d34-62955b0f53e7/Scanner%20-%20Mobile.png)
- Scenario: Asset Detection & Bottom-Sheet
  - Given the camera viewfinder is active
  - When I successfully scan a TIQRI asset QR code
  - Then the mobile device vibrates briefly to confirm the read
  - And a bottom-sheet UI slides up from the bottom of the screen displaying the Asset ID, Model, Custodian, and Quick Actions.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/7214b19f-6b5b-4393-b9c6-f5cf36b2d9c1/Scan%20success%20-%20Mobile.png)

### Technical Implementation Tasks

- [ ] Implement HTML5 `getUserMedia` API alongside a lightweight scanning library (e.g., `html5-qrcode`).
- [ ] Build the mobile Bottom-Sheet React component and hook up the haptic feedback API (`navigator.vibrate`).

---

## User Story: US-11.4 — Cross-Device Desktop Synchronization (Remote Control)

- As an IT Admin logged into both my phone and my computer,
- I want my phone to act as a remote control, so that scanning a tag with my phone automatically pulls up the asset details on my large desktop monitor,
- So that I can rapidly audit multiple machines stacked on my desk without touching my mouse.

### Acceptance Criteria (Gherkin)

- Scenario: Identity-Based WebSocket Auto-Link
  - Given I am signed in on my desktop browser and my mobile device with the exact same Azure AD account
  - When I open the scanner on my mobile device
  - Then the WebSocket server seamlessly matches both connections using my `user_id`.
- Scenario: Desktop Panel Synchronization
  - Given my devices are auto-linked
  - And I am viewing the main Asset Registry grid on my desktop monitor
  - When I scan a TIQRI QR code using my mobile phone
  - Then the mobile device shows the bottom-sheet details
  - AND the desktop UI instantly reacts to the WebSocket event by sliding out the 700px Asset Details Panel (Epic 8) for that exact asset.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/483f229d-2df3-4454-ba3e-2c58e2e615e1/Asset%20Details%20(Assigned)-%20Desktop.png)

### Technical Implementation Tasks

- [ ] Implement a `UserSessionMap` in the WebSocket server to pair connections by `user_id`.
- [ ] Write a desktop listener for an `ASSET_SCANNED` event that automatically updates the `selectedAssetId` state, triggering the Epic 8 slide-out panel to open.

---

## User Story: US-11.5 — Barcode Injection (Tethered Registration)

- As a System Admin registering new hardware,
- I want to use my phone to scan a manufacturer's 1D barcode on a laptop box,
- So that the 16-digit serial number instantly types itself into my desktop monitor without manual typing errors.

### Acceptance Criteria (Gherkin)

- Scenario: Direct Field Injection
  - Given my phone and desktop are auto-linked
  - And my desktop cursor is actively focused on the "Serial Number" text field in the Epic 7 registration panel
  - When I scan a Dell 1D barcode with my phone
  - Then the mobile device emits the decoded string
  - And the desktop text field is instantly populated with the scanned value.
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/c6e2ddaf-5205-41d2-9aac-a67e776b75a8/Asset-Registry-Wizard.png)
- Scenario: Memory Buffering
  - Given my devices are auto-linked
  - When I scan a 1D barcode on my phone, BUT my desktop cursor is _not_ focused on any input field
  - Then the desktop UI temporarily buffers the payload in its local memory
  - And displays a toast notification: "Barcode scanned. Click an input field to paste."
  ![](https://t90181861921.p.clickup-attachments.com/t90181861921/c70427f2-162c-49f8-ad82-d7580421dd33/Asset%20Registry%20Wizard%20_field%20not%20selected%20for%20Pasting%20with%20QR.png)

### Technical Implementation Tasks

- [ ] Configure the mobile scanning library to recognize 1D formats (Code 128, UPC, EAN).
- [ ] Write the WebSocket listener logic on the desktop React client to inject received payloads into `document.activeElement`.