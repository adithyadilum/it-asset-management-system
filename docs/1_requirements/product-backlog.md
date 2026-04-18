# Product Backlog

This document contains the comprehensive list of user stories and their associated technical implementation tasks, categorized by Frontend, Backend, Database, and Infrastructure/DevOps.

_Total Tasks across all Epics: 540_

---

## Epic 1: Authentication & App Shell (Completed - v1 Mock Architecture)

**Architectural Note:** To accelerate development, this epic was built using a custom **Server-Side JWT Authentication** architecture leveraging Next.js Server Actions and Edge Middleware, rather than the originally planned Client-Side SPA (MSAL.js/Axios) approach. Corporate Azure AD SSO integration has been moved to a post-review Tech Debt ticket.

### US-1.1 — Secure Mock Login & JWT Generation

**Backend / Infrastructure**

- [x] Configure environment variables for a secure `JWT_SECRET` used for local signing.
- [x] Create a mock `users` table using Drizzle ORM to store Admin/Employee test accounts.
- [x] Implement the `mockLogin` Server Action to validate credentials against the database.
- [x] Utilize the `jose` Edge-compatible library to generate a signed JWT payload containing user ID, email, name, and role.
- [x] Set the JWT securely in the user's browser as an `HttpOnly`, `Secure` cookie, preventing XSS attacks.

**Frontend**

- [x] Build the responsive Login Page UI component (TIQRI logo, title/description, and credential input form).
- [x] Connect the login form directly to the Server Action for seamless, mutation-based authentication.

### US-1.2 — Unauthorized Access Prevention & Edge Routing

**Backend / Proxy**

- [x] Implement Next.js Edge Middleware (`src/proxy.ts`) to act as the primary security gatekeeper.
- [x] Configure the middleware matcher to intercept all routes except `/login` and static `_next` assets.
- [x] Write logic to decode and verify the JWT signature at the Edge on every request.
- [x] Handle Server Action validation errors (e.g., "User not found") by returning typed objects rather than throwing HTTP 500 errors, ensuring smooth frontend state handling.

### US-1.3 — Persistent Sessions & State Management

**Frontend / Proxy**

- [x] Eliminate "UI flashing" by handling authentication redirects server-side before React hydrates.
- [x] Automatically bounce unauthenticated users trying to access protected routes back to `/login`.
- [x] Automatically bounce authenticated users trying to access `/login` into the dashboard.
- [x] Deep-Link Preservation: Update the middleware to store the originally requested URL (e.g., `/assets/hardware`) as a query parameter and redirect the user back to it after successful login.

### US-1.4 — Application Shell & User Profile Menu

**Frontend**

- [x] Utilize Next.js Route Groups `(app-shell)` to maintain clean URLs while sharing a persistent layout wrapper.
- [x] Build the `AppSidebar` component using `shadcn/ui` for complex, mobile-responsive navigation state.
- [x] Build the `TopHeader` component with dynamic breadcrumbs utilizing the `usePathname` hook.
- [x] Implement the Server-to-Client prop passing pattern: Decode the JWT in the server `layout.tsx` and pass the user's `name`, `email`, and `role` to the client-side `TopHeader`.
- [x] Build the profile dropdown menu containing user details and the logout trigger.
- [x] Implement the `logout` Server Action utilizing a native `<form>` submission to securely destroy the `HttpOnly` cookie and trigger a server-side redirect to `/login`.

---

### Technical Debt / Post-Review Migration

**Tech Debt: Transition Mock Auth to Corporate Azure AD (MSAL)**
_To be executed after the core Asset CRUD operations are finalized._

- [ ] Register the application in the Azure AD portal (Client ID, Tenant ID).
- [ ] Replace the custom `mockLogin` Server Action with NextAuth.js (Auth.js) configured for the Azure AD provider, OR implement the MSAL Node confidential client flow.
- [ ] Update JWT payload extraction to map Azure AD claims (e.g., `tid`, `oid`) to internal system roles.

---

## Epic 2: System Permissions & Role-Based Access Control (Updated Architecture)

### US-2.1 — Administrator Control Panel for System Permissions

**Frontend**

- [x] Build the Master-Detail split-view layout component at `src/app/(app-shell)/(management)/settings/roles/page.tsx`.
- [x] Colocate specific UI components (`roles-management-table.tsx`, `user-role-assignment-modal.tsx`) directly inside the `roles` folder, avoiding global HTML-type folders.
- [x] Build the "Add User/Change Role" modal with a searchable input, role dropdown, and "Confirm Mapping" CTA.
- [x] Implement self-lockout prevention logic in the UI: disable the role dropdown/trash icon on the active user's own row.

**Backend / Infrastructure**

- [x] Replace the legacy `UserRoles` mapping table with a strict PostgreSQL Enum (`roleEnum`) directly on the `users` table via `src/db/schema.ts`.
- [x] Create a `src/actions/roles.ts` file using the `"use server"` directive.
- [x] Write the `assignUserRole(targetUserId, newRole)` action featuring a "Zero-Trust" authorization guard (requires `GlobalAdmin`).
- [x] Use Drizzle's `.returning()` method in the assignment action to verify the database row was modified.
- [x] Execute `revalidatePath("/settings/roles")` upon successful role assignment to clear the Next.js cache.
- [x] Write the `searchUsers(query)` action with an authorization guard to prevent data enumeration by non-admins.

### US-2.2 — Global Admin Role Capabilities

**Frontend**

- [x] Implement the role-aware `AppSidebar` component using a `.filter()` method on the `allowedRoles` array to dynamically render navigation items.
- [x] Ensure all action buttons (Edit, Delete, Assign, Dispose) render without restriction for this role across all pages.
      **Backend / Infrastructure**

- [x] Configure the `src/actions/*` files to identify and validate the `GlobalAdmin` claim from the JWT token payload.
- [x] Ensure the Edge Proxy (`src/proxy.ts`) grants full pass-through access for requests carrying the `GlobalAdmin` role.

### US-2.3 — IT Operator Role Capabilities

**Frontend**

- [x] Configure the `managementItems` array in the Sidebar to hide the "Settings" namespace when `user.role === 'ITOperator'`.
- [x] Build a reusable branded error page at `src/app/403/page.tsx` with a "Return to Dashboard" action.

**Backend / Infrastructure**

- [x] Write logic in the Next.js 16 Edge Proxy (`src/proxy.ts`) to extract the JWT payload and verify the active session in the Neon database.
- [x] Return a `NextResponse.redirect(new URL('/403'))` if an IT Operator attempts to access `pathname.startsWith('/settings')`.

### US-2.4 — Finance Auditor Role Capabilities

**Frontend**

- [x] Configure the `AppSidebar` to display the Financial module and Reports module, but hide the Operations and Settings namespaces.
- [x] Implement conditional rendering logic on data tables to completely remove write-action buttons (Edit, Assign, Dispose, Delete) from the DOM when `user.role === 'FinanceAuditor'`.

**Backend / Infrastructure**

- [x] Apply strict Zero-Trust Server Action enforcement for the `FinanceAuditor` role, ensuring they are blocked from executing state-mutating actions (e.g., `updateAsset`, `deleteAsset`).
- [x] Ensure Edge Proxy routing allows `FinanceAuditor` access to `/financials/*` and `/reports/*`.

### US-2.5 — Default "Least Privilege" Access Assignment

**Database & Seeding**

- [x] Add a `.default("Employee")` constraint on the `role` column in `src/db/schema.ts` to enforce least-privilege strictly at the database schema level.
- [x] Update the Drizzle seed script (`src/db/seed.ts`) to generate the exact 4 test personas (`GlobalAdmin`, `ITOperator`, `FinanceAuditor`, `Employee`) for frontend testing.

**Backend / Infrastructure**

- [x] Ensure the `getAuthenticatedUser()` helper securely defaults to bouncing traffic to `/login` or stripping privileges if the JWT lacks a recognized role string, preventing accidental privilege escalation.

---

## Epic 3: Flexible Asset Categorization & Master Data Setup

### US-3.1 — Centralized Master Data Dashboard

**Frontend**

- [ ] Build the `MasterDataLayout` React wrapper component with nested tab routing for each entity (Categories, Locations, Departments, Vendors, Brands & Models).
- [ ] Implement a reusable `DataTable` UI component with built-in pagination (configurable rows per page), sortable column headers, and a fixed header row.
- [ ] Build a reusable empty-state component with an illustration and dynamic prompt text.

**Backend**

- [ ] Create a base CRUD controller pattern/template for Master Data entities that all specific entity controllers will extend.

### US-3.2 — Location Data Management

**Frontend**

- [ ] Build the "Add/Edit Location" modal component with form validation (required fields, duplicate detection on blur).
- [ ] Implement the Toast notification system (reusable across all Master Data entities) for success/error feedback.
- [ ] Implement multi-select checkboxes with a bulk-action toolbar featuring a "Delete" button.
- [ ] Implement the Archive confirmation dialog for locations with active assets (disabling the hard-delete option).

**Backend**

- [ ] Create RESTful CRUD endpoints for Locations (`GET`, `POST`, `PUT`, `DELETE /api/v1/locations`).
- [ ] Write dependency-check queries (`SELECT count(*) FROM assets WHERE location_id = X`) before executing `DELETE` — return `409 Conflict` if dependencies exist.
- [ ] Implement the `PATCH /api/v1/locations/{id}/archive` endpoint to set `IsActive = false` for soft-delete.

**Database**

- [ ] Create the `Locations` table with columns: `id`, `building_name`, `floor`, `is_active` (boolean, default `true`), `created_at`, `updated_at`.
- [ ] Add a `UNIQUE` constraint on the `building_name` column to enforce duplicate prevention at the schema level.

### US-3.3 — Department & Cost Center Management

**Frontend**

- [ ] Build the "Add/Edit Department" modal with the short code input and a read-only preview field displaying the generated Cost Center ID (`tiq-{shortCode}`).
- [ ] Implement the auto-formatting logic for the short code input: force lowercase, strip spaces and special characters, update the preview field on every keystroke.
- [ ] Implement duplicate code validation on blur by querying the backend before submission.

**Backend**

- [ ] Create RESTful CRUD endpoints for Departments (`GET`, `POST`, `PUT`, `DELETE /api/v1/departments`).
- [ ] Write the server-side Cost Center ID generation logic (`'tiq-' + shortCode.toLowerCase()`) as a validation step before insert.
- [ ] Implement relational deletion checks against the `Users` and `Assets` tables to prevent orphaned records.

**Database**

- [ ] Create the `Departments` table with columns: `id`, `name`, `short_code`, `department_id` (generated), `is_active`, `created_at`, `updated_at`.
- [ ] Add `UNIQUE` constraints on both the `name` and `department_id` columns.

### US-3.4 — Vendor Directory Management

**Frontend**

- [ ] Build the "Add/Edit Vendor" modal with fields: Company Name, Contact Person, Contact Phone, Support Email.
- [ ] Implement email field regex validation and inline error messaging.
- [ ] Render the `Support Email` column in the data grid as a clickable `mailto:` link.

**Backend**

- [ ] Create RESTful CRUD endpoints for Vendors (`GET`, `POST`, `PUT`, `DELETE /api/v1/vendors`).
- [ ] Ensure the "Edit Vendor" API cascades updated data naturally via foreign key relationships.
- [ ] Implement relational deletion checks against `Assets` and `MaintenanceTickets` tables before allowing deletion.

**Database**

- [ ] Create the `Vendors` table with columns: `id`, `company_name`, `contact_person`, `contact_phone`, `support_email`, `is_active`, `created_at`, `updated_at`.
- [ ] Add a `UNIQUE` constraint on the `company_name` column.

### US-3.5 — Brand Management (Manufacturers)

**Frontend**

- [ ] Build the "Add/Edit Brand" modal component with case-insensitive duplicate validation.
- [ ] Build the Brands data grid displaying `Brand Name`, `Status` (Active/Inactive toggle badge), and a computed `Model Count` column.
- [ ] Implement the Active/Inactive toggle with visual state change (green for active, gray for inactive).

**Backend**

- [ ] Create RESTful CRUD endpoints for Brands (`GET`, `POST`, `PUT /api/v1/brands`).
- [ ] Implement case-insensitive uniqueness validation on the brand name before insert/update.
- [ ] Implement a `PATCH /api/v1/brands/{id}/deactivate` endpoint for soft-delete (setting `is_active = false`).
- [ ] Write a `GET /api/v1/brands` response aggregation that includes a computed `model_count` for each brand.

**Database**

- [ ] Create the `Brands` table with columns: `id`, `name`, `is_active` (boolean, default `true`), `created_at`, `updated_at`.
- [ ] Add a case-insensitive `UNIQUE` constraint on the `name` column (e.g., `UNIQUE(LOWER(name))` or `CITEXT` type).

### US-3.6 — Brand & Model Hierarchy Management

**Frontend**

- [ ] Build the expandable/accordion row data table component: clicking a Brand row reveals a nested sub-table of its Models.
- [ ] Build the "Add/Edit Model" modal contextually anchored to the expanded Brand row.
- [ ] Implement the dependent dropdown logic for asset registration forms: selecting a Brand triggers an API call to `GET /api/v1/brands/{brandId}/models` to populate the Model dropdown.

**Backend**

- [ ] Create RESTful CRUD endpoints for Models (`GET`, `POST`, `PUT`, `DELETE /api/v1/brands/{brandId}/models`).
- [ ] Enforce composite uniqueness: a model name must be unique _within_ a given brand, but the same name can exist under different brands.
- [ ] Implement relational deletion checks against the `Assets` table before allowing Brand or Model deletion.

**Database**

- [ ] Create the `Models` table with columns: `id`, `name`, `brand_id` (FK → `Brands.id`), `is_active`, `created_at`, `updated_at`.
- [ ] Add a composite `UNIQUE` constraint on `(brand_id, name)`.

### US-3.7 — Sub-Category Management (Under the 4 Pillars)

**Frontend**

- [ ] Build the right-side Slide-Out Panel (Sheet) component covering 40% of the viewport width for category creation/editing.
- [ ] Implement the Main Pillar selector as a locked dropdown or radio group with only the 4 hardcoded options.
- [ ] Integrate the Sub-Category panel with the auto-prefix generator (US-3.8) and schema builder (US-3.9) as sub-sections.

**Backend**

- [ ] Create RESTful CRUD endpoints for SubCategories (`GET`, `POST`, `PUT`, `DELETE /api/v1/subcategories`).
- [ ] Enforce uniqueness: a sub-category name must be unique within its parent pillar.
- [ ] Implement relational deletion safeguards linking Sub-Categories to the main `Assets` table.

**Database**

- [ ] Create the `SubCategories` table with columns: `id`, `name`, `pillar` (ENUM: Hardware, Software, Furniture, Electronics), `prefix`, `schema` (JSONB), `is_active`, `created_at`, `updated_at`.
- [ ] Add a composite `UNIQUE` constraint on `(pillar, name)`.

### US-3.8 — Automated Sub-Category Prefixing

**Frontend**

- [ ] Implement the auto-prefix generation logic triggered on the Sub-Category Name input's `onBlur` event (e.g., first letter of each word, or first 3 consonants for single words).
- [ ] Implement an async validation call on the generated prefix to check uniqueness against the backend before form submission.
- [ ] Apply the visual lock styling to the Prefix field after creation: gray background (`bg-gray-100`), padlock icon, `readOnly` attribute.

**Backend**

- [ ] Write server-side prefix generation logic with collision resolution: if the generated prefix already exists, automatically append an incrementing number (e.g., `LAP` → `LAP2` → `LAP3`).
- [ ] Write a `GET /api/v1/subcategories/validate-prefix?prefix={prefix}` endpoint for frontend async validation.
- [ ] Block `PUT`/`PATCH` requests from modifying the `prefix` column after initial creation.

### US-3.9 — Custom Field Builder (Schema Engine)

**Frontend**

- [ ] Build the Custom Field Builder UI at the bottom of the Sub-Category slide-out panel using a drag-and-drop library (e.g., `dnd-kit`).
- [ ] Implement the field row component with: a drag handle (`⋮⋮`), a "Field Name" text input, a "Type" dropdown (`Text | Number | Dropdown | Date | Boolean`), a "Required" toggle, and a delete button.
- [ ] Implement the conditional dropdown options sub-UI: when Type is set to "Dropdown", render a secondary input for comma-separated option values.
- [ ] Write schema serialization logic to convert the field builder state into a JSON payload for API submission.

**Backend**

- [ ] Implement JSONB schema storage to save each sub-category's custom field definitions as a structured JSON array.
- [ ] Create a `GET /api/v1/subcategories/{id}/schema` endpoint to fetch the field schema payload for dynamic frontend form rendering.
- [ ] Write server-side validation logic to enforce required fields defined in the schema when assets are registered under this sub-category.

---

## Epic 4: Automated System Audit Log

### US-4.1 — Automated Action & IP Logging (The Ledger)

**Backend**

- [ ] Write a reusable backend middleware/interceptor that automatically hooks into all `POST`, `PUT`, `PATCH`, and `DELETE` controller actions to capture audit data.
- [ ] Implement a utility function to compute Before/After object states by fetching the current record before mutation, then serializing both states into a JSON diff payload.
- [ ] Implement IP address extraction logic from the request object, handling `X-Forwarded-For` headers for requests behind Load Balancers or Reverse Proxies.
- [ ] Ensure the middleware captures the `actor_id` from the authenticated JWT payload and attaches it to every audit log entry.
- [ ] Implement performance safeguards: use asynchronous (non-blocking) log writes where possible to stay under the 100ms latency budget.

**Database**

- [ ] Create an append-only `AuditLogs` table with columns: `id`, `actor_id` (FK → Users), `actor_email`, `action_type` (ENUM: CREATE, UPDATE, DELETE, DISPOSE), `entity_type`, `entity_id`, `ip_address`, `before_state` (JSONB), `after_state` (JSONB), `created_at`.
- [ ] Strictly revoke `UPDATE` and `DELETE` database privileges on the `AuditLogs` table at the database-user level to enforce immutability.
- [ ] Create an index on `(entity_type, entity_id)` and `(actor_id)` for efficient querying by the Audit Log viewer.

### US-4.2 — Forensic Audit Log Viewer & Export

**Frontend**

- [ ] Build the Audit Log data table page in React with chronological ordering (newest first) and pagination.
- [ ] Build the filter bar component with: Date Range pickers, Actor searchable dropdown, Action Type multi-select, and Entity Type filter.
- [ ] Implement color-coded action-type badges component (Green = CREATE, Blue = UPDATE, Red = DELETE/DISPOSE).
- [ ] Build the expandable row / "View Details" modal component rendering Before/After JSON diffs in a monospace font with a highlighted-change visual indicator.
- [ ] Implement the "Export Log (CSV)" button that sends the current filter parameters to the backend and triggers the CSV file download.

**Backend**

- [ ] Create an API endpoint `GET /api/v1/audit-logs` with support for complex query parameters: `dateFrom`, `dateTo`, `actorId`, `actionType[]`, `entityType`, `entityId`, and cursor-based or offset pagination.
- [ ] Implement a backend CSV streaming/generation service that accepts the same filter parameters and returns the result set as a downloadable `.csv` file (`GET /api/v1/audit-logs/export`).
- [ ] Ensure the endpoint enforces RBAC: only `GlobalAdmin` and `FinanceAuditor` roles can access the audit log API.

---

## Epic 5: Third-Party Integrations & Automation

### US-5.1 — Secure API Key Management

**Frontend**

- [ ] Build the API Key management data grid page within the Settings/Integrations module, displaying: Key Name, Masked Key, Created Date, Last Used, and Status.
- [ ] Build the "Generate New API Key" modal with a Key Name input and a "show-once" key reveal UI (monospace text box + "Copy to Clipboard" button + warning banner).
- [ ] Build the "Revoke Key" confirmation modal with destructive-action styling and a clear warning message.
- [ ] Implement the key masking display logic: show only the prefix and last 4 characters of each key.

**Backend**

- [ ] Implement cryptographically secure API key generation using a random string prefixed for identification (e.g., `idams_live_{random}`).
- [ ] Implement secure hashing logic (bcrypt or Argon2) to store only the hashed version of the key in the database — the plaintext is returned only once during generation.
- [ ] Create a `POST /api/v1/api-keys` endpoint for key generation that returns the plaintext key in the response body.
- [ ] Create a `DELETE /api/v1/api-keys/{id}` endpoint for key revocation that invalidates the key immediately.
- [ ] Write middleware to authenticate incoming external API requests by comparing the `Authorization: Bearer {key}` header against hashed keys in the database.

**Database**

- [ ] Create an `ApiKeys` table with columns: `id`, `name`, `key_hash`, `key_prefix`, `key_suffix` (last 4 chars for display), `created_by` (FK → Users), `last_used_at`, `is_revoked` (boolean), `created_at`.

### US-5.2 — External Data Consumption (Open API)

**Frontend**

- [ ] Add a "View API Documentation" button/link on the Integrations dashboard that navigates to the Swagger UI.

**Backend**

- [ ] Implement Token Authentication middleware for the `/api/v1/external/*` route group that validates API keys against hashed values in the database.
- [ ] Implement rate-limiting middleware (e.g., using `express-rate-limit` or Redis-backed sliding window) scoped per API key and/or IP address, returning `429 Too Many Requests` on threshold breach.
- [ ] Create read-only endpoints: `GET /api/v1/external/assets`, `GET /api/v1/external/assets/{id}`, `GET /api/v1/external/assets/user/{employee_id}`, and `GET /api/v1/external/assignments`.
- [ ] Integrate Swagger/OpenAPI auto-generation library to produce interactive API documentation from route definitions.
- [ ] Update the `last_used_at` timestamp on the `ApiKeys` record each time a key is successfully authenticated.

**Infrastructure / DevOps**

- [ ] Configure rate-limiting thresholds as environment variables (e.g., `API_RATE_LIMIT_PER_MINUTE=60`) so they can be tuned per deployment environment.

### US-5.3 — Automated Outbound Webhooks

**Frontend**

- [ ] Build the Webhooks management data grid within the Integrations tab, displaying: Endpoint URL, Description, Subscribed Events, Health Status (badge), and actions (Edit / Delete).
- [ ] Build the "Add/Edit Webhook" modal with: Endpoint URL input (with URL format validation), Description text area, and grouped event-trigger checkboxes (Assets, Lifecycle, Maintenance).
- [ ] Implement the Health Status badge component: Green "Healthy" badge if last delivery was HTTP 2xx, Red "Failing" badge if last delivery timed out or returned an error.

**Backend**

- [ ] Create RESTful CRUD endpoints for Webhook subscriptions (`GET`, `POST`, `PUT`, `DELETE /api/v1/webhooks`).
- [ ] Write an asynchronous webhook dispatch service (using a message queue like Redis/BullMQ or native background workers) that fires HTTP `POST` payloads to registered URLs when subscribed system events are triggered.
- [ ] Implement exponential backoff retry logic within the dispatch worker (e.g., retry at 1s, 5s, 30s, 5min intervals) to handle temporary network failures.
- [ ] Write delivery logging logic: record the HTTP response status and timestamp of each dispatch attempt, and update the webhook's health status accordingly.
- [ ] Implement the event-hook integration points in existing controllers: when an asset status changes, assignment occurs, or maintenance event fires, push the event payload to the webhook dispatcher.

**Database**

- [ ] Create a `WebhookSubscriptions` table with columns: `id`, `endpoint_url`, `description`, `subscribed_events` (JSONB array), `is_active`, `last_delivery_status`, `last_delivery_at`, `created_by` (FK → Users), `created_at`, `updated_at`.
- [ ] Create a `WebhookDeliveryLogs` table for auditing: `id`, `webhook_id` (FK), `event_type`, `payload` (JSONB), `http_status`, `response_body` (text), `attempt_number`, `created_at`.

---

## Epic 6: Asset Registries & Data Grids

### US-6.1 — Global Omni-Search (Cmd+K)

**Frontend**

- [ ] Build the Command Palette UI component using a specialized accessibility library (e.g., `cmdk` or custom implementation).
- [ ] Register the global `Cmd+K` / `Ctrl+K` keyboard shortcut listener and wire it to toggle the modal overlay.
- [ ] Implement a static frontend index of all system routes (Pages) and global functions (Actions) to allow for instant, zero-latency client-side filtering.
- [ ] Implement categorized result rendering with sticky sub-headers (`PAGES`, `ASSETS`, `USERS`, `ACTIONS`) and distinct leading icons per category.
- [ ] Implement full keyboard navigation within the results list (Arrow Up/Down to highlight, Enter to select, Escape to close).
- [ ] Wire the selected result to either a `react-router` navigation (for Pages/Assets) or a frontend action dispatcher (for Actions).

**Backend**

- [ ] Create an optimized multi-table search endpoint (`GET /api/v1/search?q={query}`) that queries Assets (by ID, name, serial number), Users (by name, email), and Master Data entities concurrently.
- [ ] Implement result ranking/relevance scoring to surface the most likely matches first (e.g., exact Asset ID matches above partial name matches).
- [ ] Add a debounced query parameter to prevent excessive database hits from rapid keystroke input.

### US-6.2 — Universal Registry Header & Local Table Filter

**Frontend**

- [ ] Build a reusable `RegistryHeader` React component that accepts the current pillar context as a prop and renders the dynamic heading, subcategory dropdown, search bar, Filters button, and "+ Add Asset" CTA.
- [ ] Implement the subcategory dropdown powered by a `GET /api/v1/subcategories?pillar={pillar}` API call, triggering a grid data refresh on selection change.
- [ ] Integrate the local search input state directly with the data table's global text filter logic for instant client-side filtering.
- [ ] Build a dynamic breadcrumbs component in the top nav bar that updates based on sidebar grouping and current subcategory selection.

**Backend**

- [ ] Create a `GET /api/v1/subcategories?pillar={pillar}` endpoint to return active subcategories for the selected pillar.

### US-6.3 — Hardware Inventory Grid

**Frontend**

- [ ] Build the `HardwareGrid` React component with the exact column definitions: Asset ID, Asset Name, Serial Number, Category, Assigned to, Status.
- [ ] Build a reusable `StatusBadge` component rendering color-coded outline pill badges with leading icons per status (Available=Green, Assigned=Gray, In Repair=Purple, etc.).
- [ ] Build a `CategoryBadge` component and implement conditional visibility: hidden when a specific subcategory is selected, visible when "All" is selected.

**Backend**

- [ ] Create a `GET /api/v1/assets?pillar=Hardware&subcategory={id}` endpoint that returns paginated asset data filtered by pillar and optionally by subcategory, supporting sorting and search parameters.

### US-6.4 — Software & Licenses Grid

**Frontend**

- [ ] Build the `SoftwareGrid` React component with software-specific column definitions: Software Name, License Key (masked display), Total Seats, Available Seats, Expiration Date.
- [ ] Implement visual warnings for the Expiration Date column: highlight rows in yellow/orange when expiry is within 30 days, red when expired.

**Backend**

- [ ] Create a `GET /api/v1/assets?pillar=Software&subcategory={id}` endpoint returning software-specific data including computed `Available Seats` (Total Seats minus active assignments).

### US-6.5 — Furniture & Fixtures Grid

**Frontend**

- [ ] Build the `FurnitureGrid` React component with furniture-specific column definitions: Asset ID, Asset Name, Category, Location (Building/Floor), Condition.

**Backend**

- [ ] Create a `GET /api/v1/assets?pillar=Furniture&subcategory={id}` endpoint returning furniture-specific data with location details.

### US-6.6 — Office Electronics Grid

**Frontend**

- [ ] Build the `ElectronicsGrid` React component with electronics-specific column definitions: Asset ID, Asset Name, Category, Location, IP/MAC Address, Maintenance Status.

**Backend**

- [ ] Create a `GET /api/v1/assets?pillar=Electronics&subcategory={id}` endpoint returning electronics-specific data including network identifiers and maintenance status.

### US-6.7 — Advanced Grid Controls (Filtering, Sorting, & Pagination)

**Frontend**

- [ ] Build the custom table footer component matching the UI mockup: total record count, rows-per-page dropdown, and First/Prev/Next/Last page navigation controls.
- [ ] Build the "Filters" dropdown panel with multi-select filter options (Status, Location, Brand, Category, Date Range) that apply to the current grid.
- [ ] Implement sortable column headers: clicking a column header toggles ascending/descending sort with a visual indicator arrow.
- [ ] Wire all filter/sort/pagination state to the backend API as query parameters for server-side data processing.

**Backend**

- [ ] Extend all asset listing endpoints to accept query parameters for: `page`, `pageSize`, `sortBy`, `sortOrder`, `status[]`, `locationId`, `brandId`, `subcategoryId`, `dateFrom`, `dateTo`.
- [ ] Implement server-side pagination returning a standardized response envelope: `{ data: [...], meta: { total, page, pageSize, totalPages } }`.

### US-6.8 — Bulk Operations

**Frontend**

- [ ] Implement row-selection state management within the data table component (individual checkboxes + a "select all on page" checkbox in the header).
- [ ] Build the dynamic Bulk Action Toolbar component that appears when one or more rows are selected, showing a selected count badge.
- [ ] Write frontend logic to compute the intersection of valid allowed actions based on the current `pillar` and `status` of all selected rows: hide impossible pillar actions entirely, disable conflicting status actions with tooltips.
- [ ] Build the bulk-action confirmation modal component with a dynamic warning message (e.g., "You are about to update {count} assets.").

**Backend**

- [ ] Create a transactional batch-update endpoint (`PATCH /api/v1/assets/bulk`) that accepts an array of asset IDs and the target update operation.
- [ ] Implement atomic transaction logic: all updates succeed or the entire batch rolls back if any single item fails business logic validation (e.g., assigning an already-assigned asset).
- [ ] Ensure each individual asset change within the batch writes a separate entry to the Audit Log (Epic 4) for traceability.
- [ ] Implement backend validation that mirrors the frontend pillar/status constraint rules to prevent bypassing via direct API calls.

---

## Epic 7: Asset Registration

### US-7.1 — Universal Registration Panel & Automation

**Frontend**

- [ ] Build the reusable Slide-Out Panel React component (40-50% width, dark backdrop overlay, smooth slide-in/out animation).
- [ ] Integrate React Hook Form (or equivalent) for form state management, validation, and submission.
- [ ] Implement the Pillar lock mechanism: read the current pillar from the routing context and render it as a read-only disabled field.
- [ ] Implement dynamic Subcategory selection: on change, fetch the sub-category's custom schema from `GET /api/v1/subcategories/{id}/schema` and re-render the form fields accordingly.
- [ ] Implement the `onChange` listener for the Brand/Model dropdowns that auto-binds Epic 3 Master Data technical specs to the form's hidden payload.
- [ ] Build form section dividers/accordion cards to visually organize long forms into logical groups.
- [ ] Implement the disabled Submit button state: grayed out until all mandatory fields pass validation.

**Backend**

- [ ] Create a `POST /api/v1/assets` endpoint that accepts the registration payload, validates required fields, and persists the record.
- [ ] Implement server-side Asset Tracking ID generation using the format `[Pillar Prefix]-[Subcategory Prefix]-[Sequence Number]`, ensuring atomic sequential number assignment.
- [ ] Write server-side validation to enforce mandatory fields based on the sub-category's custom schema definition.

**Database**

- [ ] Design the `Assets` table schema with columns for all shared fields: `id`, `asset_id` (generated tracking ID), `pillar`, `subcategory_id` (FK), `brand_id` (FK), `model_id` (FK), `status`, `custom_fields` (JSONB), `created_by`, `created_at`, `updated_at`.
- [ ] Create a sequence or counter mechanism for the auto-incrementing portion of the Asset Tracking ID.

### US-7.2 — Hardware Registration & Consumables

**Frontend**

- [ ] Build the conditional Hardware form rendering: show `Serial Number`, `MAC Address`, `Condition`, `Assigned User` fields for standard subcategories.
- [ ] Build the Consumables variant: hide individual tracking ID and serial number fields, render the Stepper Input for "Quantity to Add".
- [ ] Implement MAC Address input auto-formatting logic (insert colons/hyphens every 2 characters).

**Backend**

- [ ] Implement the backend bypass for Asset ID generation when `subcategory.type === 'Consumable'`: instead of creating individual records, increment a stock counter.
- [ ] Create a `POST /api/v1/assets/consumables` endpoint for consumable stock adjustments.
- [ ] Add `UNIQUE` constraint validation on `serial_number` within the Hardware pillar to prevent duplicate serial entries.

### US-7.3 — Software Registration

**Frontend**

- [ ] Build the conditional Software form rendering: show Software Name, Category, Agreement Type, Publisher, Payment Model, License Key, Total Seats, Licensed Email; hide physical fields (Location, Condition, Serial Number).
- [ ] Build the software icon image upload placeholder with preview.
- [ ] Build the Purchase Details form section with currency dropdown, date picker, cost fields, vendor selection, and invoice attachment.

**Backend**

- [ ] Implement server-side validation rules specific to Software assets: enforce mandatory fields like `license_key`, `total_seats`, and `agreement_type`.
- [ ] Create a `SoftwareLicenses` extension table (or JSONB fields) to store software-specific data (seats, keys, publisher, etc.) linked to the main `Assets` record.

### US-7.4 — Furniture & Fixtures Registration

**Frontend**

- [ ] Build the conditional Furniture form rendering: show `Building Location`, `Floor/Zone`, `Condition`, and dynamic Custom Fields from Epic 3.
- [ ] Implement the dependent Location dropdown: selecting a Building filters the available Floor/Zone options.
- [ ] Build the Condition dropdown with color-coded status indicator dots beside each option.

**Backend**

- [ ] Implement server-side validation rules specific to Furniture assets: enforce mandatory `location_id` and `condition`.

### US-7.5 — Office Electronics Registration

**Frontend**

- [ ] Build the conditional Electronics form rendering: show `Building Location`, `Network IP/MAC Address`, `Next Scheduled Maintenance Date`, and dynamic Custom Fields.
- [ ] Implement IPv4/IPv6 input masking with regex validation.
- [ ] Integrate a date picker component for the "Next Scheduled Maintenance Date" field.

**Backend**

- [ ] Implement server-side validation for the Electronics pillar: enforce mandatory `location_id`, validate IP address format, and validate maintenance date is in the future.

### US-7.6 — Financial Proof & Invoice Upload

**Frontend**

- [ ] Build the "Financials" form section with: Currency selector (with flags/symbols), Base Price, Tax, Shipping cost inputs, and a read-only auto-calculated Total Initial Cost field.
- [ ] Implement the real-time auto-calculation logic: `Total = Base Price + Tax + Shipping`, updating the locked total field on every keystroke.
- [ ] Build a secure drag-and-drop file upload component with client-side file type validation (allow `.pdf`, `.jpg`, `.png` only) and a visual upload progress bar.

**Backend**

- [ ] Create a `POST /api/v1/uploads/invoices` endpoint that accepts multipart file uploads, validates file type and size on the server, and stores the file in the cloud bucket.
- [ ] Return a `file_url` or `file_key` from the upload endpoint to be saved alongside the asset record.
- [ ] Store the financial breakdown (`base_price`, `tax`, `shipping`, `total_cost`, `currency`) in a dedicated `PurchaseDetails` table linked to the `Assets` record via foreign key.

**Infrastructure / DevOps**

- [ ] Configure a cloud storage bucket (AWS S3 or Azure Blob Storage) for invoice file storage with appropriate access policies and CORS configuration.
- [ ] Set up signed URL generation for secure, time-limited file downloads.

---

## Epic 8: Asset Details View

### US-8.1 — Slide-Out Panel & Navigation

**Frontend**

- [ ] Build the base 700px Slide-Out Sheet React component that does _not_ trap focus or block interaction with the underlying DOM elements (non-modal sheet).
- [ ] Implement sidebar auto-collapse logic: when the panel opens, the main sidebar collapses to icon-only mode; when the panel closes, the sidebar expands back.
- [ ] Implement the `selectedAssetId` state management at the grid level, passed down as a prop to the panel.
- [ ] Write a `useEffect` hook inside the panel component that listens for `selectedAssetId` changes and triggers a fresh `GET /api/v1/assets/{id}` fetch, smoothly replacing the panel's data.
- [ ] Implement a loading skeleton component displayed inside the panel during data fetching transitions.
- [ ] Implement active row highlighting in the data grid: apply a distinct background color to the row matching `selectedAssetId`.

**Backend**

- [ ] Create a `GET /api/v1/assets/{id}` endpoint returning the complete asset profile including base details, custom fields, purchase details, and related maintenance records.

### US-8.2 — Hardware Asset Profile

**Frontend**

- [ ] Implement conditional tab rendering based on `asset.pillar === 'Hardware'` to show the 4-tab layout (Asset Details, Technical Details, Purchase Details, History).
- [ ] Build the "Asset Details" summary tab: device image, status badge, 2-column CSS Grid of key-value pairs, and the Maintenance Records summary card.
- [ ] Build the QR Code icon button that triggers the Epic 9 tag preview modal.
- [ ] Build the "Technical Details" tab that dynamically renders custom fields from the sub-category schema via `GET /api/v1/subcategories/{id}/schema`.
- [ ] Build the "Maintenance Records" summary card showing the 3 most recent events with a "View all" navigation link.

**Backend**

- [ ] Create a `GET /api/v1/assets/{id}/maintenance` endpoint returning the maintenance record history for a specific asset (used in the summary card and the "View all" page).

### US-8.3 — Software Asset Profile

**Frontend**

- [ ] Implement conditional tab rendering for `asset.pillar === 'Software'` showing 3 tabs: Details, Purchase Details, Assignments.
- [ ] Build the License Key masked display component with a "Reveal" toggle button.
- [ ] Build the "Assignments" tab with a data table (User, Action, Date, Performed By) and contextual "Revoke"/"Assign" action buttons per row.
- [ ] Ensure Maintenance Records section and QR Code button are completely hidden for Software assets.

**Backend**

- [ ] Create `GET /api/v1/assets/{id}/assignments` endpoint to return the seat allocation history for a software license.
- [ ] Create `POST /api/v1/assets/{id}/assignments` and `DELETE /api/v1/assets/{id}/assignments/{userId}` endpoints for seat assignment and revocation.

### US-8.4 — Furniture & Fixtures Profile

**Frontend**

- [ ] Implement conditional tab rendering for `asset.pillar === 'Furniture'` showing 4 tabs: Asset Details, Physical Details, Purchase Details, History.
- [ ] Build the Asset Details tab variant with Location (Building/Floor/Zone) and Condition prominently displayed instead of user assignment.
- [ ] Build the "Physical Details" tab rendering dynamic Custom Fields from the sub-category schema (e.g., Dimensions, Material, Weight).

### US-8.5 — Office Electronics Profile

**Frontend**

- [ ] Implement conditional tab rendering for `asset.pillar === 'Electronics'` showing 4 tabs: Asset Details, Technical Details, Purchase Details, History.
- [ ] Build the Asset Details tab variant with Location, Maintenance Status, Next Scheduled Maintenance Date, and the Maintenance Records summary card.

### US-8.6 — Purchase Details & History Mechanics

**Frontend**

- [ ] Build the "Purchase Details" tab component displaying the financial breakdown (Base Price, Tax, Shipping, Total Cost, Currency) in a clean key-value layout.
- [ ] Implement the "Download Invoice" button that requests a signed URL from the backend and triggers a file download.
- [ ] Build the "History" tab component rendering a vertical chronological timeline from audit log entries, with color-coded event-type indicators.

**Backend**

- [ ] Implement secure signed-URL generation for invoice file retrieval from the cloud storage bucket (AWS S3 `getSignedUrl` / Azure Blob `generateSasUrl`), with a configurable expiry (e.g., 15 minutes).
- [ ] Create a `GET /api/v1/assets/{id}/history` endpoint that queries the `AuditLogs` table filtered by `entity_id = {assetId}` and returns chronologically ordered events.

---

## Epic 9: Physical Tagging & Tag Printing

### US-9.1 — Single Tag Generation & Reprinting

**Frontend**

- [ ] Integrate a QR code generation library (e.g., `qrcode.react` or `qrcode`) to render SVG/Canvas QR codes on the client.
- [ ] Build the Tag Preview Modal component displaying the fixed-layout sticker design: company logo (top), QR code (center), Asset ID in monospace (bottom).
- [ ] Hook the QR generation and Tag Preview Modal into the Epic 7 registration success callback.
- [ ] Wire the "QR Code" button on the Epic 8 Asset Details panel to open the same Tag Preview Modal for reprinting.
- [ ] Implement the "Print Tag" button that triggers the browser's `window.print()` API with a print-specific CSS stylesheet for the tag.

**Backend**

- [ ] Implement the routing URL generation logic: compose the URL using the system domain and asset tracking ID (e.g., `assets.tiqri.com/scan/{assetId}`).
- [ ] Store the generated `qr_url` in the asset record upon creation, ensuring it points to the Mobile Lookup PWA route (Epic 11).

### US-9.2 — Bulk Print Engine (A4 Constant Grid)

**Frontend**

- [ ] Build the Bulk Print configuration modal triggered from the Bulk Action Toolbar's "Print QR Code" button, showing a count of selected assets and layout confirmation.
- [ ] Implement the "Generating PDF..." loading state with a disabled button to prevent duplicate submissions.

**Backend**

- [ ] Integrate a robust server-side PDF generation library (e.g., `pdfmake`, `puppeteer`, or `pdf-lib`).
- [ ] Create a `POST /api/v1/assets/print-tags` endpoint that accepts an array of asset IDs, generates QR codes for each, and composes them into a single A4 PDF document.
- [ ] Hardcode the exact PDF millimeter dimensions (margins, padding, cell size) to align perfectly with a standard A4 sticker sheet template (e.g., Avery 5160).
- [ ] Stream the generated PDF back to the client for download or new-tab preview.

### US-9.3 — [Optional] Thermal Printer Support

**Frontend**

- [ ] Add a "Layout Format" toggle/dropdown to the Bulk Print configuration modal: options for "A4 Sheet" (default) and "Thermal Roll".

**Backend**

- [ ] Build a secondary PDF template configuration in the `print-tags` endpoint specifying custom page dimensions tailored for Zebra/Dymo standard label rolls (e.g., 2x1 inch pages).
- [ ] Enforce the same tag layout constraints (logo, QR, Asset ID) used in US-9.2 to guarantee visual parity across both A4 and thermal output formats.

---

## Epic 10: Bulk Asset Registration

### US-10.1 — The Bulk Import Entry Point & Upload UI

**Frontend**

- [ ] Update the `RegistryHeader` component to convert the "+ Add Asset" button into a split-button dropdown with "Add Single Asset" and "Bulk Import" options.
- [ ] Build the Bulk Import Modal with a drag-and-drop file upload zone, accepting `.csv` and `.xlsx` file types only.
- [ ] Implement the multi-stage loading UI: "Uploading..." with a progress bar during network transfer, transitioning to "Reading & Processing File..." during server-side parsing.
- [ ] Implement client-side file type validation: reject unsupported file extensions immediately with an inline error.

**Backend**

- [ ] Create a `POST /api/v1/assets/bulk-import` endpoint that accepts multipart file uploads.
- [ ] Integrate server-side file parsing libraries (`papaparse` for CSV, `exceljs` or `SheetJS` for Excel) to extract row data.

### US-10.2 — Automatic Column Matching & Strict Validation

**Frontend**

- [ ] Add a prominent "Download Template (.xlsx)" link inside the Bulk Import Modal that serves a pre-built template file for each pillar.

**Backend**

- [ ] Write column-header matching logic: compare parsed headers against the expected schema keys (exact string match, case-insensitive), and return a structured error response listing missing/misspelled columns if validation fails.
- [ ] Implement row-level NOT NULL validation for mandatory fields based on the pillar's required field schema.
- [ ] Create a `GET /api/v1/assets/bulk-import/template?pillar={pillar}` endpoint to serve downloadable Excel templates pre-populated with the correct column headers for each pillar.

### US-10.3 — Partial Success Processing & Error Reporting

**Frontend**

- [ ] Build the Success Summary screen displaying: success count (green), failure count (red), total records processed, and a "Download Error Report" button.
- [ ] Implement the "Download Error Report" button that requests a CSV from the backend and triggers a browser file download.

**Backend**

- [ ] Write the iterative processing script that loops through parsed rows, validating and inserting each individually rather than as a batch transaction.
- [ ] Implement row-level `try/catch` logic: append failed rows (with their specific error messages) to an error array rather than throwing a fatal API error.
- [ ] Trigger the Epic 7 Asset ID generation and Epic 9 QR routing URL generation utilities for every successfully imported record.
- [ ] Compile the error array into a downloadable CSV stream with an appended `Error` column explaining each row's failure reason.
- [ ] Return a structured JSON response: `{ successCount, failureCount, errorReportUrl }` to power the frontend summary screen.

---

## Epic 11: Mobile Companion Tag Scanning

### US-11.1 — Mobile Role Routing & Admin Dashboard

**Frontend**

- [ ] Build the mobile-responsive `AdminMobileDashboard` React layout with the hero "Launch Scanner" button, Quick Metrics cards, and Recent Activities list.
- [ ] Implement JWT role-based routing guards that direct "Standard Employee" users to the employee portal and "Global Admin"/"IT Operator" users to the Admin Dashboard.
- [ ] Build the fixed bottom navigation bar component (Home, My Assets, Notifications) with `position: fixed; bottom: 0`.

**Backend**

- [ ] Create a `GET /api/v1/mobile/dashboard` endpoint returning aggregated quick metrics (assigned asset count, pending approvals count, recent activity feed) for the authenticated user.

**Infrastructure / DevOps**

- [ ] Configure the PWA manifest (`manifest.json`) with app name, icons, theme color, and `display: standalone` for mobile home-screen installation.
- [ ] Set up a Service Worker for offline caching of the app shell and static assets.

### US-11.2 — Desktop Feature Gating (Empty State)

**Frontend**

- [ ] Write a React viewport detection hook using `window.innerWidth` (or `useMediaQuery`) to identify mobile screen sizes.
- [ ] Build the "Desktop Screen Required" fallback component with the monitor icon illustration, explanatory message, and "Return to Mobile Dashboard" navigation button.
- [ ] Wrap all desktop-only routes (registry grids, settings, master data) with the viewport guard to intercept mobile access attempts.

### US-11.3 — Standalone Mobile Scanner & Lookup

**Frontend**

- [ ] Implement the full-screen camera scanner interface using the HTML5 `getUserMedia` API with a QR scanning library (e.g., `html5-qrcode` or `zxing`).
- [ ] Build the targeting reticle overlay on the camera viewfinder for visual scan guidance.
- [ ] Implement haptic feedback on successful scan using the `navigator.vibrate()` API.
- [ ] Build the mobile Bottom-Sheet component that slides up on successful scan, displaying: Asset ID, Model, Custodian, Status, and Quick Action buttons (View Details, Assign, Return).
- [ ] Extract the asset ID from the scanned QR URL and call the `GET /api/v1/assets/{id}` endpoint to populate the bottom-sheet data.

### US-11.4 — Cross-Device Desktop Synchronization (Remote Control)

**Frontend**

- [ ] Implement a WebSocket client connection on both mobile and desktop that authenticates using the JWT `user_id`.
- [ ] Write a desktop-side WebSocket event listener for the `ASSET_SCANNED` event that automatically updates the `selectedAssetId` state, triggering the Epic 8 slide-out panel to open with the scanned asset's data.

**Backend**

- [ ] Set up a WebSocket server (e.g., using `Socket.IO` or native `ws` library) alongside the REST API.
- [ ] Implement a `UserSessionMap` data structure on the WebSocket server to pair and manage multiple device connections by `user_id`.
- [ ] Handle the `ASSET_SCANNED` event: when a mobile client emits a scan event, broadcast it to all other connections belonging to the same `user_id`.

**Infrastructure / DevOps**

- [ ] Configure WebSocket support in the deployment environment (ensure the load balancer/reverse proxy supports sticky sessions or WebSocket passthrough).

### US-11.5 — Barcode Injection (Tethered Registration)

**Frontend**

- [ ] Configure the mobile scanning library to recognize 1D barcode formats (Code 128, UPC-A, EAN-13) in addition to QR codes.
- [ ] On the mobile client, emit a `BARCODE_SCANNED` WebSocket event containing the decoded serial string.
- [ ] On the desktop client, write a WebSocket listener for the `BARCODE_SCANNED` event that injects the received payload into `document.activeElement.value` if an input field is currently focused.
- [ ] Implement memory buffering on the desktop: if no input field is focused, store the payload temporarily and display a toast notification ("Barcode scanned. Click an input field to paste.").
- [ ] Implement a "paste" mechanism: when the user next focuses an input field after buffering, auto-populate it with the buffered barcode value.

---

## Epic 12: Employee Portal & Digital Handshake

### US-12.1 — Secure Portal Routing & Role Restriction

**Frontend**

- [ ] Implement a `<ProtectedRoute allowedRoles={['GlobalAdmin', 'ITOperator']} />` higher-order component (HOC) or route guard wrapper around all admin-only routes (Epic 6, 7, 8 components).
- [ ] Implement the role-aware Sidebar component that shows only "My Dashboard", "My Assets", and "Service Requests" (disabled placeholder) for Standard Employees.
- [ ] Implement post-login routing logic: if `user.role === 'StandardEmployee'`, redirect to `/portal/my-assets` instead of the admin dashboard.
- [ ] Reuse the 403 Forbidden error page component from Epic 2 for route interception.

**Backend**

- [ ] Write strict backend middleware ensuring all admin API endpoints (`/api/v1/assets`, `/api/v1/settings`, `/api/v1/master-data`) validate the JWT role and return `403 Forbidden` for Standard Employee tokens.

### US-12.2 — "My Assets" Dashboard

**Frontend**

- [ ] Build the `EmployeeDashboard` React layout with a personalized greeting ("Welcome back, {firstName}") and a responsive CSS Grid of `AssetCard` components.
- [ ] Build the `AssetCard` component displaying: asset type icon/image, model name, Asset ID, date assigned, and status badge.
- [ ] Implement mobile responsive layout: sidebar collapses to hamburger menu, asset cards stack in a single column on small screens.
- [ ] Ensure asset cards are strictly read-only with no click-through to admin panels.

**Backend**

- [ ] Create a secure `GET /api/v1/portal/my-assets` endpoint that _forces_ the database query to filter strictly by the requesting user's ID (`WHERE assigned_to = jwt.user_id`), returning only their assigned assets.

### US-12.3 — Digital Acceptance & Escalating Reminders

**Frontend**

- [ ] Build the "Action Required" alert banner component that renders at the top of the Employee Dashboard when there are pending acceptance items.
- [ ] Build the Acceptance Modal with: asset details summary, mandatory acknowledgment checkbox (linked to IT acceptable use policy), and a "Confirm Receipt" button that enables only when the checkbox is checked.
- [ ] Implement the "Report Issue / Did Not Receive" rejection pathway as a secondary action in the Acceptance Modal.

**Backend**

- [ ] Create a `POST /api/v1/portal/assignments/{id}/accept` endpoint that logs the digital acceptance timestamp, updates the assignment status to "Confirmed", and cancels any pending reminder events.
- [ ] Create a `POST /api/v1/portal/assignments/{id}/reject` endpoint for the "Did Not Receive" pathway, notifying the issuing admin.
- [ ] Implement an escalation scheduler (cron job or task queue): at 24h, 48h, and 72h intervals, check for assignments still in "Pending Acceptance" state and enqueue `REMINDER_ESCALATED` events to the notification queue.

**Database**

- [ ] Create a `NotificationQueue` table with columns: `id`, `event_type` (ENUM: PENDING_ACCEPTANCE, REMINDER_24H, REMINDER_48H, REMINDER_72H_ADMIN), `assignment_id` (FK), `recipient_id` (FK → Users), `is_processed` (boolean), `created_at`.

### US-12.4 — Asset Return Reminders & Admin Requests

**Frontend**

- [ ] Build the yellow "Upcoming Return" alert banner component, conditionally rendered when an asset's expected return date is within 14 days.
- [ ] Build the red "Urgent Action Required" alert banner component for admin-initiated return requests.
- [ ] Implement real-time banner rendering via WebSocket or polling to display admin-initiated return requests without requiring a page refresh.

**Backend**

- [ ] Implement a scheduled task (cron job) that runs daily, identifies assignments with `expected_return_date` within 14 days, and enqueues `UPCOMING_RETURN` events to the notification queue.
- [ ] Implement the admin "Request Return" action handler: when triggered, enqueue an `URGENT_RETURN_REQUESTED` event and push a real-time notification to the employee's active session (via WebSocket or push API).
- [ ] Create a `GET /api/v1/portal/notifications` endpoint that returns the authenticated employee's pending alerts and banners.

---

## Epic 13: Asset Assignment

### US-13.1 — The Operations Dashboard & Single Assignment

**Frontend**

- [ ] Build the `Assignments & Returns` layout component with the 3-tab navigation structure (Available Assets, Assigned Assets, Returned Assets).
- [ ] Configure the `Available Assets` data grid to automatically apply a `status=Available` filter to the API fetch.
- [ ] Add an "Assign" action button to the Asset Details panel footer, conditionally rendered only when `asset.status === 'Available'`.

**Backend**

- [ ] Create a `GET /api/v1/operations/assignments?tab={available|assigned|returned}` endpoint that returns filtered asset data based on the selected tab.

### US-13.2 — Bulk Asset Assignment

**Frontend**

- [ ] Add a "Bulk Assign" button to the Bulk Actions toolbar that only renders when `selectedRows > 1` and all selected rows have `status === 'Available'`.
- [ ] Adapt the Assignment Modal to accept an array of asset IDs and display a summary header (e.g., "Assigning 3 Assets").

**Backend**

- [ ] Create a `POST /api/v1/assets/bulk-assign` endpoint that accepts an array of asset IDs and a target user/location, processes all assignments in a single atomic database transaction.
- [ ] Trigger Epic 12 Digital Acceptance notifications for each asset in the batch.

### US-13.3 — The Assignment Modal & Allocation Types

**Frontend**

- [ ] Build the "Assign Asset" modal with a "User" vs. "Location" toggle that dynamically switches the searchable dropdown data source.
- [ ] Integrate the searchable User dropdown powered by `GET /api/v1/users?search={query}`.
- [ ] Integrate the searchable Location dropdown powered by `GET /api/v1/locations?search={query}`.
- [ ] Add an optional "Expected Return Date" date picker for temporary loaner assignments.

**Backend**

- [ ] Create a `POST /api/v1/assets/{id}/assign` endpoint that accepts the assignment payload (`type: 'user' | 'location'`, `targetId`, `expectedReturnDate`), updates the asset status to `Assigned`, and creates an Assignment record.

**Database**

- [ ] Create an `Assignments` table with columns: `id`, `asset_id` (FK → Assets), `assignment_type` (ENUM: USER, LOCATION), `assigned_to_user_id` (FK → Users, nullable), `assigned_to_location_id` (FK → Locations, nullable), `assigned_by` (FK → Users), `expected_return_date`, `actual_return_date`, `status` (ENUM: ACTIVE, RETURNED, CANCELLED), `created_at`, `updated_at`.

### US-13.4 — UI State Gating & Conflict Prevention

**Frontend**

- [ ] Write frontend logic to conditionally hide/disable the "Assign" button based on `asset.status`: only show for `Available` status.
- [ ] Display a user-friendly error toast when the backend returns a conflict error (409).

**Backend**

- [ ] Implement optimistic concurrency control or row-level locking: before processing an assignment, verify `asset.status === 'Available'` within the same database transaction, returning `409 Conflict` if the status has changed.

### US-13.5 — Pillar-Restricted Bulk Location Transfers

**Frontend**

- [ ] Update the Bulk Action toolbar logic to evaluate the `pillar` and `subcategory.isPortable` flag of selected rows: hide "Change Location" for Software and portable Hardware, show it for Furniture and Electronics.
- [ ] Build the "Change Location" bulk action modal with a searchable Location dropdown.

**Backend**

- [ ] Create a `PATCH /api/v1/assets/bulk-location` endpoint that accepts an array of asset IDs and a target `location_id`, validates pillar constraints server-side, and writes individual Audit Log entries for each updated asset.
- [ ] Enforce pillar validation: reject requests attempting to change location for Software or portable Hardware assets with a `422 Unprocessable Entity` response.

---

## Epic 14: Asset Returns

### US-14.1 — The Assigned Assets Tab

**Frontend**

- [ ] Configure the `Assigned Assets` data grid to automatically apply a `status=Assigned` filter to the API fetch.
- [ ] Ensure the Asset Details slide-out panel correctly maps and prominently displays the active user relationship (`Assigned to` field).

### US-14.2 — Requesting an Asset Return (Recall)

**Frontend**

- [ ] Add a conditionally rendered "Request Return" button to the Asset Details panel footer (visible only when `status === 'Assigned'`).
- [ ] Display a success confirmation toast upon successful return request submission.
- [ ] Update the grid row's visual label to show a `Requested` sub-status badge after a return is requested.

**Backend**

- [ ] Create a `POST /api/v1/assets/{id}/request-return` endpoint that flags the assignment record with a `return_requested` status and queues an `URGENT_RETURN_REQUESTED` notification event.
- [ ] Integrate with the escalating reminder scheduler: enqueue 24h, 48h, and 72h reminder events upon return request creation.

### US-14.3 — Receiving an Asset (Mark as Returned)

**Frontend**

- [ ] Add a conditionally rendered "Return" button to the Asset Details panel footer (visible only when `status === 'Assigned'`).
- [ ] On successful return, refresh the data grid to remove the asset from the `Assigned Assets` tab and show it in `Returned Assets`.

**Backend**

- [ ] Create a `POST /api/v1/assets/{id}/receive` endpoint that closes the active assignment record (`actual_return_date = now()`), clears the custodian, updates the asset status to `Pending Review`, and cancels any pending return reminder events.

### US-14.4 — The Returned Assets Tab & Condition Check

**Frontend**

- [ ] Build the "Process Return" modal with the 4 radio button condition options (Good Working Condition, Minor Issues, Needs Repair, Beyond Repair) and the "Condition Notes" text area.
- [ ] Implement form validation: "Confirm" button remains disabled until a condition radio is selected.

**Backend**

- [ ] Create a `POST /api/v1/assets/{id}/process-return` endpoint implementing the state-machine logic: automatically route the asset to `Available`, `Pending Maintenance`, or `Pending Disposal` based on the submitted condition enum.
- [ ] Append the condition notes and status change to the System Audit Log.
- [ ] If routed to `Pending Maintenance`, automatically create a stub record in the `MaintenanceTickets` table for the Epic 15 workflow.

---

## Epic 15: Maintenance & Repair

### US-15.1 — The Pending Review Tab & Triage Panel

**Frontend**

- [ ] Build the 3-tab `Maintenance & Repairs` layout component (Pending Review, Active Repairs, Repair History).
- [ ] Configure the `Pending Review` data grid to filter assets by `Pending Maintenance` / `Defective` status, displaying columns: Asset ID, Model, Reported By, Issue, Date Reported.
- [ ] Build the "Issue Review" slide-out panel displaying: reported issue, Purchase Date, Original Cost, Current Book Value, and Warranty Status badge (color-coded: Green=Active, Red=Expired).
- [ ] Add `Resolve Internally` and `Initiate Repair` action buttons to the panel footer.

**Backend**

- [ ] Create a `GET /api/v1/maintenance/pending` endpoint returning assets filtered by maintenance-related statuses, including aggregated financial and warranty data.

### US-15.2 — Fast-Track: Resolve Internally

**Frontend**

- [ ] Build a quick confirmation dialog for the "Resolve Internally" action with a mandatory resolution note text area.

**Backend**

- [ ] Create a `POST /api/v1/assets/{id}/resolve-internal` endpoint that: updates the asset status to `Available`, creates a maintenance record with `resolution_type: 'Internal'`, and writes an event to the System Audit Log.

### US-15.3 — Initiating a Vendor Repair

**Frontend**

- [ ] Build the "Send Asset for Repair" modal with: Vendor dropdown (searchable), RMA/Ticket Number input (required), Estimated Cost input, Expected Return Date picker.
- [ ] Implement form validation: `Confirm & Dispatch` button disabled until Vendor and RMA are filled.

**Backend**

- [ ] Create a `POST /api/v1/maintenance/dispatch` endpoint that: creates a `MaintenanceTicket` record, updates the asset status to `In Repair`, and writes an Audit Log entry.

**Database**

- [ ] Create a `MaintenanceTickets` table with columns: `id`, `asset_id` (FK → Assets), `ticket_type` (ENUM: VENDOR, INTERNAL), `vendor_name`, `rma_number`, `reported_issue`, `resolution_notes`, `estimated_cost`, `actual_cost`, `estimated_return_date`, `actual_completion_date`, `status` (ENUM: ACTIVE, COMPLETED, CANCELLED), `dispatched_by` (FK → Users), `created_at`, `updated_at`.

### US-15.4 — Active Repairs Tab & Logging Completion

**Frontend**

- [ ] Configure the `Active Repairs` grid to display data from `MaintenanceTickets` where `status = 'Active'`, showing: Vendor, RMA, Est. Return Date, Est. Cost.
- [ ] Build the "Log Completed Repair" modal with: Actual Final Cost input, Resolution Notes text area, and "Update Status To" dropdown (Available, Disposed).

**Backend**

- [ ] Create a `POST /api/v1/maintenance/{ticketId}/complete` endpoint that: updates the ticket status to `Completed`, records actual cost and resolution notes, updates the parent asset's global status to the selected value, and aggregates the `actual_cost` into the asset's cumulative maintenance cost.

### US-15.5 — Repair History Tab & Asset Details Integration

**Frontend**

- [ ] Configure the `Repair History` data grid to fetch completed `MaintenanceTickets` records, displaying: Asset ID, Vendor, Resolution Date, Final Cost, Resolution Notes.
- [ ] Update the Epic 8 `AssetDetailsPanel` component to fetch and display the 3 most recent maintenance records from the `MaintenanceTickets` table for the selected asset.

**Backend**

- [ ] Create a `GET /api/v1/maintenance/history` endpoint with pagination and filtering support (by date range, vendor, cost range).
- [ ] Ensure the existing `GET /api/v1/assets/{id}/maintenance` endpoint returns both vendor and internal resolution records.

---

## Epic 16: Asset History & Status Management

### US-16.1 — Asset History Timeline & Export

**Frontend**

- [ ] Build the vertical timeline React component for the `History` tab, rendering event cards with: Timestamp, Action type (color-coded), Old Value, New Value, and Actor.
- [ ] Implement the "Export CSV" button that sends the current asset ID to the backend export endpoint and triggers a browser file download.

**Backend**

- [ ] Create a `GET /api/v1/assets/{id}/history` endpoint to fetch, format, and chronologically sort asset-specific events from the global `AuditLogs` table.
- [ ] Create a `GET /api/v1/assets/{id}/history/export` endpoint that generates a CSV stream of the asset's audit history and returns it as a downloadable file.

### US-16.2 — Manual Status Override

**Frontend**

- [ ] Build the interactive `StatusBadge` React component with a built-in inline dropdown menu activated on click, showing a subtle hover state on the badge.
- [ ] Write frontend filtering logic to populate the dropdown with only permissible manual statuses from a `PermissibleManualStates` config, hiding workflow-driven statuses.
- [ ] Build the "Status Change Justification" modal with a mandatory note text area (minimum 10 characters) and a conditionally disabled "Save" button.
- [ ] On successful save, update the badge color/text reactively without requiring a full page reload.

**Backend**

- [ ] Create a `PATCH /api/v1/assets/{id}/status` endpoint that validates the requested status transition against a state-machine rule set, requires a justification note, and writes to the Audit Log.
- [ ] Implement automatic side-effects: if the asset was `Assigned` and is being changed to `Lost`/`Stolen`, automatically close the active assignment record in the background.
- [ ] Return `422 Unprocessable Entity` for illegal transitions (e.g., manually setting status to `Assigned` or `In Repair`).

### US-16.3 — Custom Status Configuration

**Frontend**

- [ ] Build the "Custom Status Configuration" UI page in Settings with a CRUD data grid: Status Name, Color Picker, Description, and actions (Edit / Delete).
- [ ] Update the global frontend status configuration to dynamically merge custom statuses from the API with the hardcoded system statuses, making them available in all dropdowns, filters, and badges.

**Backend**

- [ ] Create RESTful CRUD endpoints for custom statuses: `GET`, `POST`, `PUT`, `DELETE /api/v1/settings/statuses`.
- [ ] Update all backend validation logic to dynamically load and accept custom statuses alongside built-in statuses when validating status transitions.

**Database**

- [ ] Create a `CustomStatuses` table with columns: `id`, `name` (UNIQUE), `color` (hex), `description`, `is_active` (boolean), `created_by` (FK → Users), `created_at`, `updated_at`.

---

## Epic 17: Disposal Requests

### US-17.1 — Flagging Assets for Disposal

**Frontend**

- [ ] Build the "Initiate Disposal" intake modal with: Reason Category dropdown, Technician Notes text area (with 500-char limit and visible counter), and darkened backdrop overlay.
- [ ] Build the `Operations > Disposals` layout component with the tab structure (`Pending Disposal`, `Disposal History`).
- [ ] Configure the `Pending Disposal` data grid to filter by `status === 'Pending Disposal'`, displaying: Asset ID, Model, Reason, Requested By, Days Pending (dynamically calculated, color-coded badge).

**Backend**

- [ ] Create a `POST /api/v1/assets/{id}/request-disposal` endpoint that updates the asset status to `Pending Disposal`, stores the reason category and technician notes, and writes an Audit Log entry.
- [ ] Create a `GET /api/v1/disposals/pending` endpoint returning pending disposal requests with dynamically calculated `days_pending` values.

**Database**

- [ ] Create a `DisposalRequests` table with columns: `id`, `asset_id` (FK → Assets), `reason_category` (ENUM: DAMAGED_BEYOND_REPAIR, OBSOLETE, END_OF_LIFE, OTHER), `technician_notes` (500 char max), `requested_by` (FK → Users), `status` (ENUM: PENDING, APPROVED, REJECTED), `rejection_reason`, `rejected_by`, `created_at`, `updated_at`.

### US-17.2 — The Disposal Review Panel

**Frontend**

- [ ] Build the "Disposal Request Review" slide-out panel with: disposal context section (Requested By, Date, Reason, Technician Notes) and financial summary block (Purchase Date, Original Cost, Current Book Value, Warranty Status) with a distinct visual hierarchy.
- [ ] Add "Reject" (secondary/outline style) and "Initiate Disposal" (destructive red) action buttons to the panel footer.

**Backend**

- [ ] Create a `GET /api/v1/disposals/{id}` endpoint that aggregates the disposal request details alongside the asset's financial data (purchase details, real-time depreciated book value, warranty status) in a single response.

### US-17.3 — Rejecting a Disposal Request

**Frontend**

- [ ] Build the "Reject Disposal Request" modal with: contextual warning header ("You are declining the disposal of..."), mandatory Rejection Reason text area (auto-focused, >10 char minimum), Update Status To dropdown, and a conditionally disabled "Confirm Rejection" button.
- [ ] Implement strict React state binding: the "Confirm Rejection" button only activates when both the reason length (>10 chars) and status selection criteria are met.

**Backend**

- [ ] Create a `POST /api/v1/disposals/{id}/reject` endpoint that: updates the disposal request status to `REJECTED`, stores the rejection reason and rejector, applies the selected fallback status to the asset, writes the event to the Audit Log, and queues a notification alert for the original requesting operator.

---

## Epic 18: Executing Asset Disposals

### US-18.1 — Asset Disposal Modal (Single Asset)

**Frontend**

- [ ] Build the "Dispose Asset" compliance modal with: warning banner, Disposal Date picker, Reason for Disposal dropdown, Disposal Method dropdown, "Data wiped" checkbox, "Tags removed" checkbox, file upload zone (US-18.2), and exact Asset ID text confirmation input.
- [ ] Implement strict multi-condition React state management: the "Confirm Disposal" button only activates when ALL conditions are met (all dropdowns filled, both checkboxes checked, file uploaded, and text input exactly matches the Asset ID).

**Backend**

- [ ] Create a `POST /api/v1/assets/{id}/dispose` endpoint that validates all required fields (date, reason, method, checkboxes, receipt URL, text confirmation), updates the asset status to `Disposed`, writes the disposal record, and logs the event in the Audit Log.

### US-18.2 — Documentation/E-Waste Certificate Upload

**Frontend**

- [ ] Integrate a drag-and-drop file upload component (e.g., React Dropzone) into the Dispose Asset modal's Documentation section.
- [ ] Implement client-side file type validation (allow `.pdf`, `.jpg`, `.jpeg`, `.png` only) and display an upload progress indicator.

**Backend**

- [ ] Create a `POST /api/v1/uploads/disposal-receipts` endpoint that accepts multipart file uploads, validates file type and size, and stores the file in the cloud storage bucket.
- [ ] Return the generated `file_url` or `file_key` to be attached to the disposal record payload.

**Database**

- [ ] Add a `disposal_receipt_url` column to the `DisposalRequests` table (or create a dedicated `DisposalRecords` table) to store the link to the uploaded E-Waste certificate.

### US-18.3 — Bulk Disposal Processing

**Frontend**

- [ ] Add a red "Dispose assets" danger button to the Bulk Actions toolbar on the `Pending Disposal` grid, visible when rows are multi-selected.
- [ ] Build the Bulk Disposal modal: scrollable asset list box (max-height 120px, `overflow-y: auto`), shared compliance form (same fields as single-asset modal), and dynamic text confirmation prompt (`DISPOSE {count} ASSETS`).
- [ ] Implement the dynamic text-match validation: "Confirm Bulk Disposal" button only activates when the typed string exactly matches `DISPOSE {count} ASSETS`.

**Backend**

- [ ] Create a `POST /api/v1/assets/bulk-dispose` endpoint that: accepts an array of asset IDs plus the shared compliance payload (date, reason, method, checkboxes, receipt URL), processes all status changes in a single atomic database transaction, links the shared receipt URL to all disposal records, and writes individual Audit Log entries for each asset.

---

## Epic 19: Disposal History

### US-19.1 — The Disposal History Ledger

**Frontend**

- [ ] Build the `Disposal History` data grid React component with read-only rows (no checkboxes or bulk action toolbar).
- [ ] Configure the grid columns: Asset ID, Category, Reason, Flagged By, Disposed By, Disposal Date, Status badge (muted gray "Disposed"), and Documents.
- [ ] Implement the `Documents` column: render the uploaded filename with a clickable PDF icon that opens a signed URL in a new browser tab.

**Backend**

- [ ] Create a `GET /api/v1/disposals/history` endpoint that fetches assets with `status === 'Disposed'`, joining the `Users` table twice to retrieve both the `Flagged By` (requester) and `Disposed By` (executor) display names.
- [ ] Generate signed URLs for the disposal receipt documents on-demand for secure, time-limited access.

### US-19.2 — Soft Delete Architecture

**Backend**

- [ ] Add an `is_archived` boolean column (default `false`) to the `Assets` table, set to `true` upon disposal completion.
- [ ] Apply a global `WHERE is_archived = false` (or `WHERE status != 'Disposed'`) filter to all standard `GET` API endpoints that feed the main registries, assignment dropdowns, and Master Data lookups.
- [ ] Ensure the `GET /api/v1/disposals/history` endpoint explicitly queries `WHERE is_archived = true` to retrieve only archived records.

**Database**

- [ ] Add a database index on the `is_archived` column for query performance optimization.

### US-19.3 — Record Finality & Edit Locking

**Frontend**

- [ ] Write conditional rendering logic in the `AssetDetailsPanel`: if `asset.status === 'Disposed'`, hide all "Edit" buttons, disable all form inputs, and hide the interactive `StatusBadge` dropdown.

**Backend**

- [ ] Write backend middleware that intercepts all `PUT`, `PATCH`, and `DELETE` requests for assets with `is_archived === true` or `status === 'Disposed'`, returning `403 Forbidden: Record is finalized`.

---

## Epic 20: Main KPI Dashboard

### US-20.1 — KPI Widgets & Data Definitions

**Frontend**

- [ ] Build the responsive dashboard layout with 3 rows: KPI Cards (top), Visualizations (middle), Actionable Tables (bottom).
- [ ] Build the 4 KPI Metric Card components displaying: primary value, MoM/WoW percentage change indicator (green arrow up / red arrow down), and a descriptive label.
- [ ] Integrate a charting library (e.g., Recharts, Chart.js, or ApexCharts) to render the `Asset Allocation by Department` bar chart and the `Current Inventory Status` donut chart.
- [ ] Build the bottom-row actionable data tables with tabs: `Overdue Returns` and `High-Maintenance Assets (Lemons)`.
- [ ] Add a global Date Range picker to the dashboard header for filtering all widgets by a selected time period.

**Backend**

- [ ] Create a `GET /api/v1/dashboard/kpis` endpoint returning aggregated KPI data: total asset value (with MoM delta), active asset count (with WoW delta), in-repair count, and expiring software count.
- [ ] Create a `GET /api/v1/dashboard/charts` endpoint returning: department allocation data (group by custodian department) and status distribution data (group by status).
- [ ] Create a `GET /api/v1/dashboard/overdue-returns` endpoint returning assets where `expected_return_date < CURRENT_DATE`.
- [ ] Create a `GET /api/v1/dashboard/high-maintenance` endpoint returning assets with a repair count ≥ 3 from the `MaintenanceTickets` table.
- [ ] Write optimized SQL aggregation queries with proper indexing to ensure dashboard load time stays under 2 seconds.

### US-20.2 — Global Admin View (Full Access)

**Frontend**

- [ ] Ensure the Global Admin role renders all dashboard widgets without any conditional hiding.

### US-20.3 — IT Operator View (Operational Access)

**Frontend**

- [ ] Implement conditional rendering logic on the dashboard layout: hide the `Total Asset Value` KPI card when `user.role === 'ITOperator'` and adjust the CSS Grid to fill the remaining 3 cards at full width.

**Backend**

- [ ] Ensure the `GET /api/v1/dashboard/kpis` endpoint omits the `totalAssetValue` field from the response payload when the requesting JWT lacks financial permissions.

### US-20.4 — Finance View (Financial Access)

**Frontend**

- [ ] Implement Finance-role conditional rendering: show `Total Asset Value` card, hide `Expiring Software` and `Assets in Repair` cards, default bottom table to the `Pending Approvals` tab, and replace `High-Maintenance Assets` with `Recent Write-Offs`.

**Backend**

- [ ] Create a `GET /api/v1/dashboard/pending-approvals` endpoint returning pending disposal requests requiring financial sign-off.
- [ ] Create a `GET /api/v1/dashboard/recent-writeoffs` endpoint returning recently disposed assets with their write-off values.

### US-20.5 — Dashboard Interactions & Deep-Linking

**Frontend**

- [ ] Implement URL deep-linking on KPI cards: clicking each card navigates to the corresponding Operations page with filter query parameters pre-applied (e.g., `/operations/maintenance?tab=active`).
- [ ] Bind the "Send Reminder" inline button to the `POST /api/v1/assets/{id}/request-return` endpoint and display a success toast.
- [ ] Bind the "Flag for Disposal" inline button to open the Epic 17 "Initiate Disposal" modal as an overlay on the dashboard.

---

## Epic 21: Standard Reporting

### US-21.1 — Quick Templates & Preview

**Frontend**

- [ ] Build the split-screen layout: Left Configuration Sidebar (template cards, filter controls) and Right Report Preview Panel (data grid with empty state).
- [ ] Build the reusable `TemplateCard` component displaying: icon, title, description, and "Preview report" button.
- [ ] Implement the empty state UI for the preview panel with an illustrative icon and guidance text.

**Backend**

- [ ] Create a `GET /api/v1/reports/templates` endpoint returning all available report templates (system-default + custom).
- [ ] Create a `POST /api/v1/reports/preview` endpoint that accepts filter parameters and returns paginated query results for the report preview grid.

### US-21.2 — Custom One-time Reporting

**Frontend**

- [ ] Implement the `Primary Data Source` dropdown that dynamically updates the available filter options based on the selected source (e.g., "Assets" shows Category/Location/Status filters; "Maintenance Records" shows Vendor/Date/Cost filters).
- [ ] Build the dynamic filter controls: Date Range picker, Category multi-select, Location dropdown, Status multi-select.
- [ ] Implement the "Clear filters" button to reset all filter state to defaults.

**Backend**

- [ ] Create a `GET /api/v1/reports/datasources` endpoint returning the available primary data sources and their respective filter schemas.

### US-21.3 — Creating Custom Report Templates

**Frontend**

- [ ] Build the "Add New Template" multi-step modal with: Basic Information section (Name, Code, Description, Active toggle), Data Source and Filters section, Report Fields checkbox grid, and Sort configuration (field + direction).
- [ ] After successful save, dynamically append the new template card to the sidebar without requiring a page refresh.

**Backend**

- [ ] Create RESTful CRUD endpoints for report templates: `POST /api/v1/reports/templates` (create), `PUT /api/v1/reports/templates/{id}` (update), `DELETE /api/v1/reports/templates/{id}` (delete).

**Database**

- [ ] Create a `ReportTemplates` table with columns: `id`, `name`, `code` (UNIQUE), `description`, `is_active` (boolean), `data_source` (ENUM: ASSETS, MAINTENANCE, ASSIGNMENTS, DISPOSALS), `filters` (JSON), `fields` (JSON array of selected column keys), `sort_field`, `sort_direction` (ENUM: ASC, DESC), `created_by` (FK → Users), `created_at`, `updated_at`.

### US-21.4 — CSV Export

**Frontend**

- [ ] Build the "Export as CSV" configuration modal with: Data Scope toggle (Current preview / Full dataset), File Name input, Include Header Row checkbox, and "Export as CSV" button.

**Backend**

- [ ] Create a `POST /api/v1/reports/export/csv` endpoint that: accepts the report query parameters and scope option, executes the query, and streams the results as a CSV file response.
- [ ] Implement streaming CSV generation using Node.js `Transform` streams to handle datasets exceeding 50,000 rows without exhausting server memory.

### US-21.5 — PDF Generation

**Frontend**

- [ ] Build the "Generate PDF Report" configuration modal with: Layout toggle (Portrait/Landscape, auto-default to Landscape if >8 columns), Page Size dropdown (A4/Letter), and Branding checkboxes (company logo, report title, filter summary, timestamp, generated by).

**Backend**

- [ ] Create a `POST /api/v1/reports/export/pdf` endpoint that accepts the report query parameters and PDF configuration options (layout, page size, branding flags).
- [ ] Integrate a robust server-side PDF generation library (e.g., Puppeteer or pdfmake) capable of rendering the data grid as a clean table, injecting the company logo image, and respecting the layout and page-size constraints.
- [ ] Stream the generated PDF back to the client as a downloadable file.

---

## Epic 22: Financial Ledgers & Cost Analysis

### US-22.1 — Financial Module Security (RBAC)

**Frontend**

- [ ] Update the global Sidebar component with conditional rendering: hide the `Financials` accordion menu entirely when `user.role` is not `FinanceManager` or `GlobalAdmin`.
- [ ] Wrap all Financial module routes with the `<ProtectedRoute allowedRoles={['FinanceManager', 'GlobalAdmin']} />` guard, redirecting unauthorized users to the 403 page.

**Backend**

- [ ] Write backend middleware to reject API requests to all `/api/v1/financials/*` endpoints from non-authorized roles, returning `403 Forbidden`.

### US-22.2 — The Depreciation Ledger

**Frontend**

- [ ] Build the `Depreciation Ledger` data grid UI with the specified columns and the financial toolbar (search bar, Filters dropdown, `Export Log (CSV)` button).
- [ ] Format financial values as localized currency strings (e.g., `$1,400.00 USD`) in the grid cells.

**Backend**

- [ ] Create a `GET /api/v1/financials/depreciation` endpoint with pagination, search, and filter support.
- [ ] Implement the Straight-Line Depreciation calculation in a SQL View or backend aggregation: `Current Book Value = Original Purchase Price - ((Original Purchase Price / Expected Lifespan in months) * Months Elapsed Since Purchase)`, floored at `$0.00`.
- [ ] Wire the `Export Log (CSV)` button to the Epic 21 CSV generation engine via a `POST /api/v1/reports/export/csv` call with pre-configured depreciation query parameters.

### US-22.3 — Total Cost of Ownership (TCO)

**Frontend**

- [ ] Build the `Total Cost of Ownership` data grid UI with the specified columns and the financial toolbar (search, filters, `Export Log (CSV)` button).

**Backend**

- [ ] Create a `GET /api/v1/financials/tco` endpoint that executes a SQL aggregation query joining the `Assets` table (`purchase_price`) with `SUM(actual_cost)` from all related `MaintenanceTickets` records, computing `Total TCO = purchase_price + SUM(actual_cost)`.
- [ ] Support pagination, search (by Asset ID, Category), and filter (by date range, cost range) on the TCO endpoint.

### US-22.4 — Write-Offs & Salvage Ledger

**Frontend**

- [ ] Build the `Write-Offs & Salvage` data grid UI with the specified columns and the financial toolbar (search, filters, `Export Log (CSV)` button).

**Backend**

- [ ] Create a `GET /api/v1/financials/writeoffs` endpoint fetching only assets with `status === 'Disposed'`, joining the disposal record for `disposal_date`, the locked `book_value_at_disposal`, and the `salvage_value`.

**Database**

- [ ] Add a `salvage_value` numeric column to the Epic 18 Disposal payload schema (either in `DisposalRequests` or `Assets` table).
- [ ] Add a `book_value_at_disposal` numeric column to persist the calculated depreciated value at the moment of disposal, ensuring it never changes after finalization.

---

## Epic 23: Automated Alerts & Notification

### US-23.1 — The Notification Center (Inbox)

**Frontend**

- [ ] Build the Notification Center Bell icon component in the global header/navbar with a numeric unread badge.
- [ ] Build the Notification Dropdown UI: scrollable container (`max-height: 400px`, `overflow-y: auto`), individual notification items with: message text, relative timestamp (using `date-fns` `formatDistanceToNow`), unread visual cue (blue background), and a "Mark all as read" footer button.
- [ ] Implement deep-linking on notification item click: navigate to the `target_url` and call the mark-as-read API.
- [ ] Implement real-time badge updates via WebSocket or polling to reflect new notifications without page refresh.

**Backend**

- [ ] Create a `GET /api/v1/notifications` endpoint returning the authenticated user's notifications, sorted by `created_at DESC`, with pagination.
- [ ] Create a `GET /api/v1/notifications/unread-count` endpoint returning the count of unread notifications for badge rendering.
- [ ] Create a `PATCH /api/v1/notifications/{id}/read` endpoint to mark an individual notification as read.
- [ ] Create a `PATCH /api/v1/notifications/read-all` endpoint to mark all of the user's notifications as read in a single operation.

**Database**

- [ ] Create an `AppNotifications` table with columns: `id`, `user_id` (FK → Users, indexed), `message` (text), `target_url` (the deep-link path), `is_read` (boolean, default `false`), `event_type` (ENUM: DISPOSAL_REQUEST, WARRANTY_EXPIRY, RETURN_OVERDUE, ROLE_CHANGE, ASSIGNMENT_PENDING, etc.), `created_at`.

### US-23.2 — Alert Configuration & Multi-Channel Delivery

**Frontend**

- [ ] Build the `Alerts & Notifications` settings page with categorized sections: Hardware Lifecycle, Operational Workflows, Security & Audits.
- [ ] For each notification rule, render: master toggle switch, threshold parameter dropdown (where applicable), and channel checkboxes (In-App, Email, MS Teams).

**Backend**

- [ ] Create RESTful endpoints for notification rules: `GET /api/v1/settings/notification-rules` (list all rules with their current config) and `PUT /api/v1/settings/notification-rules/{id}` (update a specific rule's toggle, threshold, and channel settings).

**Database**

- [ ] Create a `NotificationRules` table with columns: `id`, `rule_key` (UNIQUE, e.g., `WARRANTY_EXPIRY_WARNING`), `display_name`, `category` (ENUM: HARDWARE_LIFECYCLE, OPERATIONAL, SECURITY), `is_enabled` (boolean), `threshold_days` (integer, nullable), `channel_in_app` (boolean), `channel_email` (boolean), `channel_teams` (boolean), `updated_by` (FK → Users), `updated_at`.

### US-23.3 — The Scheduled CRON Engine

**Backend**

- [ ] Configure a background Scheduler service (e.g., `node-cron`, Azure Functions Timer Trigger, or AWS EventBridge) to execute alert-checking jobs during off-peak hours (e.g., 2:00 AM UTC daily).
- [ ] Write a `warrantyExpiryCheck` job: query assets where `warranty_expiry_date - CURRENT_DATE <= threshold_days` AND where a notification has not already been sent for this threshold period (deduplication).
- [ ] Write an `overdueRepairCheck` job: query `MaintenanceTickets` where `status = 'Active'` AND `expected_return_date < CURRENT_DATE`, alert the dispatching admin.
- [ ] Write an `overdueReturnCheck` job: query assignments where `expected_return_date < CURRENT_DATE` AND `status = 'ACTIVE'`, alert the assigning admin.
- [ ] Implement a `NotificationDispatcher` service that reads the configured channels from `NotificationRules` and routes each alert payload to the appropriate handler (In-App insert, Email queue, Teams webhook).

**Infrastructure / DevOps**

- [ ] Deploy the CRON scheduler as a separate service or serverless function to avoid impact on the main API's performance.
- [ ] Set up monitoring and alerting on the CRON jobs themselves (e.g., if a job fails to execute, alert DevOps).

### US-23.4 — External Dispatch (Email & Teams Integration)

**Backend**

- [ ] Implement an Email dispatch service using a transactional email provider (e.g., SendGrid, AWS SES, or direct SMTP via `nodemailer`) with configurable templates for each notification type.
- [ ] Implement exponential backoff retry logic (e.g., 1s, 2s, 4s, 8s, max 5 retries) for failed email deliveries, logging failures to a dead-letter queue after exhausting retries.
- [ ] Implement an MS Teams webhook integration service: format notification payloads as MS Teams Adaptive Card JSON and POST to the configured Incoming Webhook URL.

**Infrastructure / DevOps**

- [ ] Add environment variables for SMTP configuration (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`) and MS Teams Webhook URL (`TEAMS_WEBHOOK_URL`).
- [ ] Create a `Settings > Integrations` page (or add a section to the Alerts settings) for admins to input and test the MS Teams Webhook URL.

---
