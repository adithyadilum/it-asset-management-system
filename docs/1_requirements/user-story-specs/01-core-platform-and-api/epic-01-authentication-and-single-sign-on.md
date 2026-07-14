# Epic 1: Authentication & Single Sign-On (SSO)

## Summary

This epic focuses entirely on establishing the front door of the asset management platform. It implements secure authentication using Keycloak as a federated Identity Provider (IdP) via NextAuth.js. This ensures employees can easily access the system using existing credentials while blocking unauthorized outsiders and inactive employees.

By leveraging NextAuth.js, Server Actions, and Postgres advisory locks, the system guarantees a secure, robust session lifecycle spanning from Just-in-Time (JIT) user provisioning to concurrent token refreshes in a multi-worker environment.

## In Scope

- Custom Login Page UI handling redirects to the Identity Provider.
- Integration with Keycloak (OIDC) via NextAuth.js for Single Sign-On (SSO).
- Just-in-Time (JIT) provisioning for new users into the PostgreSQL database.
- Server-side session state management, token expiration tracking, and silent refresh mechanisms.
- Route protection using Next.js App Router server-side layouts.
- Cross-process concurrency management for refresh tokens using Postgres advisory locks.

## Out of Scope / Limitations

- Custom local user registration directly in the app is strictly prohibited.
- Role management UI (Handled via Keycloak/DB syncing and RBAC in Epic 2).
- Native application credentials (passwords).

## Assumptions & Dependencies

- The organization maintains an active Keycloak identity provider configured to broker authentication (e.g., to Entra ID/Azure AD).
- Employee terminations or suspensions are synchronized such that the local DB `isActive` flag or Keycloak disables their access.
- Application depends on NextAuth.js and server-side session management.

---

### User Stories

- [US-1.1 — Corporate Single Sign-On (SSO) via Keycloak](#user-story-us-11--corporate-single-sign-on-sso-via-keycloak)
- [US-1.2 — Unauthorized Access Prevention](#user-story-us-12--unauthorized-access-prevention)
- [US-1.3 — Persistent Login Sessions (Server-side Session & Refresh)](#user-story-us-13--persistent-login-sessions-server-side-session--refresh)
- [US-1.4 — Application Shell & User Profile Menu](#user-story-us-14--application-shell--user-profile-menu)

---

## User Story: US-1.1 — Corporate Single Sign-On (SSO) via Keycloak

- **As a** Corporate Employee,
- **I want to** log in using my existing company account via a secure SSO redirect,
- **So that** I don't have to remember a new password and can securely access internal tools.

### Acceptance Criteria (Gherkin)

- **Scenario: Standard Login Flow & Redirect**
  - **Given** I navigate to the asset management URL, I will be routed to the login screen of the asset management system
  - **When** I click the "Sign in with Microsoft" button on the login page
  - **Then** I am redirected to the Keycloak authentication portal
  - **And** after successful login, I am automatically redirected to the main dashboard page.

- **Scenario: Deep Link Login**
  - **Given** I navigate to a protected specific route (e.g., `/assets/123`)
  - **When** I am unauthenticated
  - **Then** the system intercepts the request and redirects me to the login page with a `redirectTo` parameter
  - **And** after successful login, I am returned to my originally requested page without losing context.

- **Scenario: Just-in-Time (JIT) Provisioning (New User)**
  - **Given** I am a valid corporate employee who has never logged into the system
  - **When** I successfully authenticate via Keycloak for the first time
  - **Then** the system automatically creates a local database record for my account
  - **And** assigns me the default baseline role of 'Employee'
  - **And** grants me access to the dashboard.

- **Scenario: Identity Provider Unavailable**
  - **Given** the Keycloak SSO service is temporarily unreachable
  - **When** I attempt to sign in
  - **Then** the system safely catches the exception
  - **And** displays an error banner on the login page stating "An unexpected error occurred. Please try again."

### UI/UX Specifications & Constraints

- **Page Load:** Navigating to the app must route unauthenticated users directly to `/login`.
- **Visual Elements:** The login page must contain the TIQRI logo, a welcoming message ("Welcome back"), and a primary action button labeled "Sign in with Microsoft" with a standard Microsoft four-square icon.
- **Loading State:** Upon clicking the login button, the UI should swap to a loading state ("Redirecting to login...") to prevent multiple clicks.

### Technical Implementation Tasks

#### Frontend

- [x] Build the responsive `/login` Next.js route page with a centralized login card.
- [x] Implement the `signIn('keycloak')` action from NextAuth.js handling try/catch.
- [x] Handle deep link redirection by utilizing and sanitizing the `redirectTo` query parameter.

#### Backend

- [x] Configure `NextAuthOptions` with the Keycloak Provider utilizing environment variables (`KEYCLOAK_CLIENT_ID`, `KEYCLOAK_CLIENT_SECRET`, `KEYCLOAK_ISSUER`).
- [x] Implement `signIn` NextAuth callback to handle Just-in-Time (JIT) provisioning.
- [x] On successful Keycloak authentication, verify if the user exists in the local PostgreSQL database using Drizzle ORM.
- [x] If the user does not exist, insert them with a default 'Employee' role.

---

## User Story: US-1.2 — Unauthorized Access Prevention

- **As an** Unauthorized External User (or an Inactive Employee),
- **I want to** be explicitly blocked from accessing the system,
- **So that** internal hardware and financial data remain completely secure.

### Acceptance Criteria (Gherkin)

- **Scenario: Inactive Local Employee Access Block**
  - **Given** an employee's account has been marked as inactive in the local database (`isActive = false`) (e.g. by HR)
  - **When** they attempt to authenticate via SSO
  - **Then** the NextAuth callback verifies their database record and identifies the inactive state
  - **And** rejects the login attempt natively before creating a session, returning them to an error state.

- **Scenario: Unassigned Keycloak User**
  - **Given** a person with an active company email attempts to log in
  - **When** they do not have the required application roles mapped in Keycloak
  - **Then** the Keycloak IdP itself rejects their authentication request before they ever reach the local system.

### Technical Implementation Tasks

#### Backend

- [x] In the NextAuth `signIn` callback, check the `isActive` flag on the existing local user record.
- [x] If `!existingUser.isActive`, return `false` to reject the authentication attempt immediately.
- [x] Secure all `(app-shell)` routes using a server-side layout check (`getAuthenticatedUser()`).

---

## User Story: US-1.3 — Persistent Login Sessions (Server-side Session & Refresh)

- **As a** Corporate Employee,
- **I want the** system to seamlessly maintain my login session,
- **So that** I don't have to manually re-authenticate when my short-lived tokens naturally expire in the background.

### Acceptance Criteria (Gherkin)

- **Scenario: Active Session Access**
  - **Given** I have a valid server-side NextAuth session
  - **When** I navigate to a protected page
  - **Then** the system allows access securely and without flickering the login screen (rendered server-side).

- **Scenario: Background Token Auto-Refresh**
  - **Given** my short-lived access token is nearing expiration (within the 60-second buffer window)
  - **When** I make a request to the server
  - **Then** the backend silently negotiates a new access token via Keycloak using my securely stored refresh token
  - **And** updates the session payload and database store transparently without requiring my interaction.

- **Scenario: Concurrent Token Refresh from Multiple Workers (Advisory Locks)**
  - **Given** I have multiple tabs open or multiple background API requests fire simultaneously just as my token expires
  - **When** those requests hit multiple isolated Node.js server workers
  - **Then** the database enforces a cross-process advisory lock (`pg_advisory_xact_lock`)
  - **And** exactly one request goes to Keycloak to refresh the token, while the others wait and use the newly refreshed state, preventing token revocation anomalies.

- **Scenario: Expired Refresh Token (Hard Expiration)**
  - **Given** my refresh token has fundamentally expired after a long period of inactivity
  - **When** the system attempts a background refresh
  - **Then** the refresh fails and my session is securely invalidated
  - **And** I am forced to log in via the Keycloak portal again.

### Technical Implementation Tasks

#### Backend

- [x] Implement `jwt` callback in `NextAuthOptions` to track the token expiration time and evaluate against a 60-second buffer.
- [x] Build a reliable `refreshAccessToken` function that negotiates new tokens with the Keycloak `/protocol/openid-connect/token` endpoint.
- [x] Store refresh tokens securely in a server-side `userRefreshTokens` database table upon initial login.
- [x] Utilize PostgreSQL advisory locks (`pg_advisory_xact_lock`) translating the user's UUID into an Int64 key to synchronize refresh attempts across multiple Next.js server instances.
- [x] Handle refresh failures by applying a `RefreshAccessTokenError` tag on the token so the client can trigger a forced re-login.

---

## User Story: US-1.4 — Application Shell & User Profile Menu

- **As an** Authenticated User,
- **I want to** see my profile information in a persistent navigation shell and have a secure way to log out,
- **So that** I can navigate the application efficiently and cleanly terminate my session on shared devices.

### Acceptance Criteria (Gherkin)

- **Scenario: App Shell & Topbar Rendering**
  - **Given** I have successfully authenticated
  - **When** the main application layout loads
  - **Then** the fixed Topbar displays my Name, Corporate Email Address, and Role (e.g. Employee, GlobalAdmin) extracted from the session state.

- **Scenario: Fallback Avatar Generation**
  - **Given** I do not have a profile picture explicitly set
  - **When** the Topbar renders my profile avatar
  - **Then** the system procedurally generates an avatar displaying my initials.

- **Scenario: Secure Federated Logout**
  - **Given** I am logged into the system
  - **When** I click my avatar and select "Log Out" from my profile menu
  - **Then** an audit log is written recording my logout action
  - **And** my local NextAuth session is cleared locally via `signOut`
  - **And** I am securely redirected to the Keycloak `/protocol/openid-connect/logout` endpoint to kill the central IdP session.

### Technical Implementation Tasks

#### Frontend

- [x] Construct the `(app-shell)/layout.tsx` to include the `AppSidebar` and `TopHeader`.
- [x] Extract user data from the NextAuth session via the custom `getAuthenticatedUser()` server action and pass it to the UI shell.
- [x] Implement logout using the `signOut({ redirect: false })` NextAuth function.
- [x] Navigate the browser explicitly to the federated logout URL upon local sign out.

#### Backend

- [x] Ensure the `session` NextAuth callback populates user role, ID, email, and name correctly for client-side components.
- [x] Implement a `getFederatedLogoutUrl()` server action to build the Keycloak `/protocol/openid-connect/logout` URL containing the `id_token_hint` and `post_logout_redirect_uri`.
- [x] Ensure all sign-outs are recorded securely in the audit log via `logAuditAction()` before clearing the session.
