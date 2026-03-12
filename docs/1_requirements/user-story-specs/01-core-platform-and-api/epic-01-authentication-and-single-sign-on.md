# Epic 1: Authentication & Single Sign-On (SSO)

## Summary

This epic focuses entirely on establishing the front door of the asset management platform. It implements secure, passwordless authentication using the company's existing Azure Active Directory. This ensures employees can easily access the system while blocking unauthorized outsiders and terminated employees.

## In Scope

- Custom Login Page UI.
- Integration with Microsoft Azure AD for Single Sign-On (SSO) via popup authentication.
- Granular frontend error handling for network drops, cancelled authentication flows, and unauthorized tenants.

## Out of Scope / Limitations

- Role assignment and data isolation (This is covered in Epic 2).
- Local user registration (custom usernames/passwords) is strictly prohibited.
- External guest access (contractors without a corporate Microsoft account cannot log in).

## Assumptions & Dependencies

- The organization maintains an active Microsoft Azure AD tenant.
- Employee terminations are handled by HR directly in Azure AD, which automatically cascades to this system by rejecting their SSO tokens.

### User Stories

- [US-1.1 — Corporate Single Sign-On (SSO)](https://app.clickup.com/t/86ewvb7kh)
- [US-1.2 — Unauthorized Access Prevention](https://app.clickup.com/t/86ewvbahy)
- [US-1.3 — Persistent Login Sessions (Bypass Login)](https://app.clickup.com/t/86ewvcm3k)
- [US-1.4 — Application Shell & User Profile Menu](https://app.clickup.com/t/86ewvf7ey)

---

## User Story: US-1.1 — Corporate Single Sign-On (SSO)

- As a Corporate Employee,
- I want to log in using my existing Microsoft company account via a secure popup,
- So that I don't have to remember a new password, and the system is automatically protected by the company's multi-factor authentication (MFA).

### Acceptance Criteria (Gherkin)

- Scenario: Standard Login Flow & Redirect
  - Given I navigate to the [`assets.tiqri.com`](http://assets.tiqri.com) URL the I will navigate to the login screen of the asset management system
  - When I click the "Login with Microsoft" button on the login page
  - Then a Microsoft login popup window appears for authentication
  - And after successful login, I am automatically redirected to the main dashboard page.
- Scenario: Cancelled Login Attempt
  - ~~Given the Microsoft login popup is open to enter Azure AD credentials~~
  - ~~When I close the popup window without completing the authentication~~
  - ~~Then the system remains on the login page~~
  - ~~And no login occurs.~~

> **Note:** This scenario is directly handled by the Microsoft Identity Platform (Azure AD) authentication handshake, where the system must gracefully catch the "window closed" event from the SSO provider.

- Scenario: Network Connection Failure
  - Given I am attempting to authenticate via the Microsoft popup
  - When there is a connection issue or timeout during authentication
  - Then the system restrict access during that authentication attempt
  - And displays a message indicating that the login process failed due to a network problem and redirect back to login page.

> **Note:** This is a Non-Functional Requirement (NFR) regarding system availability and reliability; the application must ensure session timeouts and network retries are managed to maintain SOC2 compliance.

### UI/UX Specifications & Constraints

- Page Load: Navigating to [`assets.tiqri.com`](http://assets.tiqri.com) must route unauthenticated users directly to the login page.
- Visual Elements: The login page must contain:
  - The TIQRI logo according to the design mockup.
  - A title and a short description explaining the system.
  - A primary action button labeled "Login with Microsoft".
- Interactivity: The login button must include a CSS hover effect.
- Responsiveness: The login page must be fully responsive and adapt cleanly to different screen sizes.
- Minimalism: No custom username or password input fields should exist on the page.

_Wireframe – Login Page_
![Login Page Wireframe](https://t90181861921.p.clickup-attachments.com/t90181861921/b10bf483-aa93-47f6-ac32-ff005882e4bc/Login%20-%20Desktop.png)

### Technical Implementation Tasks

#### Infrastructure / DevOps

- [ ] Register the application in the Azure AD portal (configure Client ID, Client Secret, Tenant ID, and Redirect URIs).
- [ ] Restrict the App Registration to the specific corporate tenant (single-tenant mode).
- [ ] Configure environment variables for Azure AD credentials in the deployment pipeline (`.env` / secrets manager).

#### Frontend

- [ ] Build the responsive Login Page UI component (TIQRI logo, title/description, "Login with Microsoft" CTA button with hover effect).
- [ ] Integrate the MSAL.js library and implement the `loginPopup()` authentication flow.
- [ ] Write error boundary logic to catch and display user-friendly messages for popup-closed events and network timeouts.
- [ ] Implement the post-login redirect to the main dashboard route upon successful token acquisition.

#### Backend

- [ ] Write authentication middleware to validate incoming JWT signatures against Azure AD's public signing keys (JWKS endpoint).
- [ ] Implement Tenant ID validation in the middleware to reject tokens from non-approved Azure AD issuers.
- [ ] Create a protected health-check endpoint (`GET /api/v1/auth/me`) to verify token validity and return basic user claims.

---

## User Story: US-1.2 — Unauthorized Access Prevention

- As an Unauthorized External User without TIQRI corporate account (or Terminated Employee with TIQRI corporate account but access blocked by HR ),
- I want to be explicitly blocked from passing the login screen,
- So that the company's internal hardware and financial data remains completely secure from outside threats.

### Acceptance Criteria (Gherkin)

- Scenario: Outsider Login Attempt (Unauthorized Tenant)
  - Given a person navigate to the login screen of asset management system and attempts to log in using a personal account (e.g., `@outlook.com`) or an account from a different company
  - When clicking on the "Login with Microsoft" button, they process through the Microsoft login screen
  - Then the Microsoft SSO gateway rejects the login natively, preventing any access to internal data.
- Scenario: Terminated Employee Access Block
  - Given an employee has been terminated and their Microsoft account was disabled by HR
  - When they attempt to access the asset management URL and authenticate
  - Then the Microsoft SSO gateway rejects the login natively, preventing any access to internal data.

### UI/UX Specifications & Constraints

- No Custom UI Designs: Because the authentication rejection is handled natively by the Microsoft SSO gateway, there are no internal application screens or UI designs for these specific scenarios.

### Technical Implementation Tasks

#### Backend

- [ ] Write backend middleware to extract and validate the Tenant ID (`tid` claim) from the incoming JWT, strictly rejecting any tokens issued by non-approved Azure tenants.
- [ ] Implement a catch-all error handler that maps standard Azure AD error codes (e.g., `AADSTS50057` for disabled accounts, `AADSTS700016` for wrong tenant) to structured JSON error responses.

#### Frontend

- [ ] Map structured backend error responses to clean, user-friendly toast/banner messages on the login page (e.g., "Your account does not have access to this application.").
- [ ] Ensure the login page gracefully handles and displays the error state without crashing or showing raw error codes.

---

## User Story: US-1.3 — Persistent Login Sessions (Bypass Login)

- As a Corporate Employee,
- I want the system to remember my active login session,
- So that I don't have to repeatedly click the "Login with Microsoft" button every time I open the app or open a new tab during my workday.

### Acceptance Criteria (Gherkin)

- Scenario: Active Session Redirect
  - Given I have a valid, unexpired authentication token stored in my browser
  - When I navigate to the root URL [`assets.tiqri.com`](http://assets.tiqri.com) or explicitly to [`assets.tiqri.com/login`](http://assets.tiqri.com/login)
  - Then the system automatically detects my active session
  - And instantly redirects me to the main dashboard without rendering the login UI.
- Scenario: Expired Session Handling
  - Given my previous authentication token has expired or my session was revoked
  - When I navigate to [`assets.tiqri.com`](http://assets.tiqri.com)
  - Then the system clears the invalid session data automatically
  - And keeps me on the login screen, displaying a clear message stating: "Your session has expired. Please log in again to continue."
  - And prompts me to re-authenticate via the Microsoft SSO gateway.
    ![Session Expired Wireframe](https://t90181861921.p.clickup-attachments.com/t90181861921/b7d080e2-e976-4aa1-ab48-5c6e0fb479d3/Session%20Expired-%20Desktop.png)
- Scenario: Deep Link Redirection (Optional)
  - Given I have a valid session
  - When I click a direct link to a specific asset (e.g., [`assets.tiqri.com/assets/AST-LAP-0142`](http://assets.tiqri.com/assets/AST-LAP-0142))
  - Then the system validates my session and routes me directly to that specific asset's detail page, bypassing the dashboard.

### UI/UX Specifications & Constraints

- No UI Flashing: The application must check the authentication state _before_ rendering the login screen. It should never "flash" the login button for a split second before redirecting the user to the dashboard.
- Loading State: If validating the session token takes time, display a clean, full-screen TIQRI loading spinner during the check.
- Session Expiry Feedback: When redirected due to an expired token, the login screen must persist a "Session Expired" alert banner above the Microsoft SSO button to provide context to the user.
  ![Login Loading State Wireframe](https://t90181861921.p.clickup-attachments.com/t90181861921/933aa8d7-d129-4a1d-9263-e7b46dc08606/Login%20-%20Desktop%20LOADING.png)

### Technical Implementation Tasks

#### Frontend

- [ ] Implement route guards (`PublicRoute` and `PrivateRoute` wrapper components) that check for a valid JWT in `localStorage` or `HttpOnly` cookies before rendering any protected page.
- [ ] Implement a silent token refresh mechanism using MSAL.js `acquireTokenSilent()` on initial application load to seamlessly renew expiring tokens.
- [ ] Build a full-screen TIQRI loading spinner component displayed during the initial auth-state check to prevent login page UI flashing.
- [ ] Write an Axios/Fetch HTTP interceptor to listen for `401 Unauthorized` API responses, automatically clearing the stale session and redirecting to `/login`.
- [ ] Implement deep-link preservation: store the originally requested URL before an auth redirect, and navigate to it after successful re-authentication.
- [ ] Build the "Session Expired" alert banner component that renders contextually on the login page when a token expiration triggers a redirect.

#### Backend

- [ ] Implement a token refresh endpoint or relay mechanism to support silent token renewal without requiring user interaction.
- [ ] Ensure all protected API routes consistently return a standardized `401 Unauthorized` response with a clear error code when tokens are expired or invalid.

---

## User Story: US-1.4 — Application Shell & User Profile Menu

- As an Authenticated User,
- I want to see my profile information in a persistent top navigation bar and have a secure way to log out,
- So that I know exactly which account I am currently operating under and can safely end my session on a shared computer.

### Acceptance Criteria (Gherkin)

- Scenario: Profile Data Extraction
  - Given I have successfully authenticated via Microsoft SSO
  - When the main application layout loads
  - Then the Topbar displays my First Name, Last Name, and Corporate Email Address extracted directly from my Azure AD token.
  - And displays my Microsoft profile picture (or generic initials if no picture exists).
    ![User Profile Highlighted Wireframe](https://t90181861921.p.clickup-attachments.com/t90181861921/c8daaac5-3a04-4cb7-b7d1-14724b306b87/User%20profile%20highlighted.png)
- Scenario: Secure Logout
  - Given I am logged into the system
  - When I click my profile avatar in the Topbar and select "Log Out"
  - Then the frontend clears my JWT token from local storage
  - And redirects me securely to the Microsoft logout endpoint, ensuring my session is completely terminated.
    ![Logout Menu Wireframe](https://t90181861921.p.clickup-attachments.com/t90181861921/a7e32835-13ad-43ec-b71c-3d22225acd58/logout%20menu%20-%20Desktop.png)

### UI/UX Specifications & Constraints

- Layout: The Topbar must be fixed to the top of the viewport (`position: sticky` or `fixed`), remaining visible even when the user scrolls down long data grids.
- Profile Dropdown: Clicking the user profile avatar must open a small popover menu containing the user's full name, email, their current System Role (e.g., "Global Admin"), and a distinct "Log Out" button.

### Technical Implementation Tasks

#### Frontend

- [ ] Build the `MainLayout` React wrapper component containing a fixed Topbar and a collapsible Sidebar shell (placeholder for Epic 2+).
- [ ] Build the Topbar component displaying the user avatar (Microsoft profile picture or generated initials fallback), full name, and email.
- [ ] Implement the profile dropdown/popover menu component displaying the user's name, email, system role, and a "Log Out" action button.
- [ ] Parse the decoded JWT payload (or call the Microsoft Graph API `/me` endpoint) to extract the user's `displayName`, `mail`, and `photo` for rendering in the Topbar.
- [ ] Implement the `logout()` function that clears all local session data (`localStorage`, cookies) and invokes the MSAL.js `logoutRedirect()` to the Azure AD end-session endpoint.

#### Backend

- [ ] Create a `GET /api/v1/auth/profile` endpoint that returns the authenticated user's profile data (name, email, role) from the JWT claims or the database.
- [ ] Implement a `POST /api/v1/auth/logout` endpoint (optional server-side cleanup) to invalidate any server-held session references or refresh tokens.
