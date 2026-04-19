# Project Learnings & Architecture Decisions

**Project:** IT Asset Management System  
**Stack:** Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, Drizzle ORM, Neon Postgres

---

## Date: April 2026

### Enforcing Code Quality & Preventing Merge Conflicts

- **The Context:** Multiple developers working in the same repository can lead to messy Git histories, "format wars" (tabs vs. spaces), and broken integration branches.
- **What we learned:** We implemented an "Automated Bouncer" CI pipeline using GitHub Actions to block Pull Requests that contain type errors. Locally, we instituted a `npm run check` script (running ESLint and `tsc --noEmit`) and set up **Prettier** to automatically format code on save.
- **The Impact:** This guarantees that our `dev` branch remains stable. We also learned that to prevent Git merge conflicts, tasks must be separated architecturally (e.g., UI developer works in `app/`, API developer works in `actions/`) to avoid simultaneous edits to the same file.
- **CI Optimization:** We optimized our GitHub Actions YAML with `paths-ignore: ['**/*.md']` so we do not waste cloud build minutes when only updating documentation.

### Adopting a Design System (shadcn/ui) over Raw Tailwind

- **The Context:** Our Figma design included complex states, border radii, and specific corporate branding. Manually writing raw Tailwind CSS for every button and input was unscalable and difficult to maintain.
- **What we learned:** We initialized **shadcn/ui** (built on top of Radix UI for accessibility). Instead of hardcoding hex colors in every file, we translated the Figma design tokens into HSL variables inside `src/app/globals.css` and mapped them to semantic names (e.g., `--primary` for the corporate TIQRI blue, and custom variables like `--status-repair` for asset tracking).
- **The Impact:** Components are now fully accessible by default. Global branding updates only require changing a single CSS file, and frontend development speed has drastically increased.

### Server Actions vs. Traditional REST APIs

- **The Context:** We needed to connect our Next.js frontend to our Neon Postgres database (managed via Drizzle ORM) to handle CRUD operations for Hardware Assets and Users.
- **What we learned:** Following industry advice from our mentor, we pivoted from building traditional `/api` REST endpoints to using Next.js **Server Actions** (`"use server"`). This allows us to call backend database logic directly from frontend React components without writing boilerplate `fetch()` requests or manually parsing JSON.
- **The Impact:** This provides end-to-end TypeScript safety—if the database schema changes, the frontend form immediately throws a type error in VS Code.
- **Security Consideration:** Because Server Actions expose hidden endpoints to the internet, we established a strict rule to authenticate and authorize the user _inside_ the action before querying the database.

### Handling Next.js Caching Issues (Turbopack)

- **The Context:** After installing new npm packages (like `tw-animate-css` for our UI components), local development servers were throwing "Module not found" errors even after running `npm install`.
- **What we learned:** Next.js Turbopack aggressively caches build failures. If a package is missing on the first run, the compiler remembers the failure and refuses to look for the newly installed package.
- **The Resolution:** Deleting the hidden `.next` folder (`rmdir /s /q .next` on Windows) forces Turbopack to dump its cache and rebuild the dependency tree from scratch, resolving the ghost errors.

### Continuous Deployment Infrastructure

- **The Context:** Waiting to deploy the application until the end of the project lifecycle introduces massive risk and makes it difficult for stakeholders to monitor progress.
- **What we learned:** We connected our GitHub repository to **Vercel**.
- **The Impact:** Every merge to the `main` branch automatically deploys to production. More importantly, Vercel generates unique, isolated "Preview URLs" for every Pull Request. This allows our mentors to click a link and test new UI features directly in their browser before the code is merged into `dev`.

### Mocking Azure AD & Role-Based Access Control (RBAC)

- **What we learned:** Instead of building a complex password system, we are simulating Azure AD by creating an HTTP-only session cookie that stores the user's ID and Role.
- **The Architecture:** We rely on Next.js `proxy.ts` to intercept page requests and verify the session cookie. If an "Employee" tries to hit an "Admin" route, the proxy rejects them before the page even renders. This protects our routes and perfectly mimics how real OIDC token verification will work.

### Authentication (AuthN) vs. Authorization (AuthZ) Architecture

- **The Context:** We needed to decide how to map user roles (Admin vs. Employee) when integrating Azure AD SSO.
- **What we learned:** We chose a "Database-Driven Authorization" strategy. Azure AD will only handle AuthN (verifying the user's identity/email). Our local `Users` table will handle AuthZ (storing the `role` column).
- **The Impact:** This means we do not need a separate roles mapping table. Furthermore, because the local database is the source of truth for permissions, our Mock Auth flow perfectly mirrors our future Production Auth flow. We will manage role assignments via our own internal Next.js admin dashboard rather than the Microsoft Azure portal.

### Database Architecture (Neon vs. Supabase)

- **The Context:** Evaluating database providers before finalizing our schema.
- **What we learned:** Neon is a specialized serverless Postgres provider that favors a modular stack (bring-your-own-auth, bring-your-own-storage). Supabase is an all-in-one Backend-as-a-Service offering Postgres, built-in Authentication, and File Storage.

### Architecture for Enterprise Handoff (Vendor Lock-in)

- **The Context:** Deciding between a monolithic BaaS (Supabase) vs. a modular stack (Neon + Vercel Blob) while considering future corporate deployment on AWS/Azure.
- **What we learned:** Using a tightly coupled system like Supabase makes it difficult for an enterprise IT team to migrate the app to their private cloud infrastructure.
- **The Decision:** We are proceeding with a modular architecture: Neon (Postgres) managed by Drizzle ORM for data, custom Next.js proxy for Azure AD Auth, and Vercel Blob (S3-compatible) for document storage. This decoupled approach allows the corporate team to easily swap these services for Azure Postgres and Azure Blob Storage simply by updating environment variables.

### Refactoring REST to Server Actions & JWT Proxy

- **What we learned:** We removed our `/api/auth` endpoints and created a dedicated `src/actions` folder. Server actions allow us to execute backend Postgres queries and set secure HTTP-only cookies without writing client-side API calls.
- **Security & Edge Runtimes:** Next.js `proxy.ts` runs on the Edge runtime, which doesn't support traditional Node modules. We adopted the jose library to sign and verify real JWTs at the Edge. The proxy acts as a gatekeeper, reading the JWT and enforcing Role-Based Access Control before a protected page ever renders.

### API Coexistence (Server Actions vs. Route Handlers)

- **The Context:** We needed to ensure that switching to Server Actions for our UI wouldn't block us from opening read-only API integrations for third-party vendors later.
- **What we learned:** Next.js supports a hybrid architecture. We use Server Actions exclusively for internal Next.js UI-to-backend communication. We will use Route Handlers (`app/api/.../route.ts`) exclusively for external, third-party API consumption.
- **The Impact:** Because our Drizzle database logic is decoupled, both methods can query the database using the same core code. We must remember that external APIs will require a different authentication strategy (e.g., API Keys) since they cannot rely on our browser-based JWT cookies.

### Routing Architecture (SPA vs. Multi-Page Routing)

- **The Context:** Deciding whether to build the application as a monolithic Single Page Application (SPA) or utilize Next.js file-based routing for different modules.
- **What we learned:** We are using Next.js nested routing to create separate pages for different modules (`/dashboard`, `/assets`). This provides automatic code-splitting (improving initial load times) and enables deep-linking, which is critical for enterprise workflows.
- **The Impact:** By utilizing `layout.tsx`, we maintain the persistent UI elements (like the sidebar) across route changes. This gives the user the smooth, flicker-free experience of an SPA, while retaining the performance and SEO/sharing benefits of a multi-page application.

### Next.js 16 Architecture (Middleware vs. Proxy)

- **The Context:** Upgrading our Auth gatekeeper to comply with Next.js 16 standards.
- **What we learned:** Next.js 16 officially deprecated the `middleware.ts` file convention and renamed it to `proxy.ts`. This was done to clarify its architectural role: it acts as a network-level edge proxy (handling redirects and AuthZ) rather than traditional Node.js middleware.
- **The Fix:** We renamed our file to `src/proxy.ts` and updated the exported function to `export async function proxy(request)`. The core edge functionality and matcher config remain identical.

### Git Workflow: Atomic Pull Requests & Branch Naming

- **The Context:** Deciding how to group our commits for the Auth Fix and the new App Shell layout.
- **What we learned:** We must avoid "Frankenstein PRs" by keeping Pull Requests atomic (one PR = one specific fix or feature). If a PR contains multiple unrelated changes, reverting a bug in one will accidentally revert the good code in the other.
- **The Standard:** We adopted standard branch naming conventions: `feat/` for new additions, `fix/` for bug resolution, and `chore/` for maintenance.

### Next.js Route Groups & Clean URLs

- **The Context:** We wanted clean, shallow URLs (for example, /assets/hardware) instead of deeply nested URLs (/dashboard/assets/hardware) without losing our persistent App Shell layout.
- **What we learned:** We utilized Next.js Route Groups by wrapping a folder name in parentheses (for example, (app-shell)). This allows us to share a single layout.tsx across multiple route segments while keeping the folder name invisible in the browser URL.
- **Security Update:** Because our secure routes are now at the root level, we updated our proxy.ts matcher from an inclusion strategy (protect /dashboard) to an exclusion strategy (protect everything except /login and static assets).

### Root Routing & Server-Side Redirects

- **The Context:** We needed to remove the default Next.js starter page at the root URL (/) and ensure users are sent to the correct application module or the login screen.
- **What we learned:** We replaced the boilerplate in src/app/page.tsx with a server-side redirect() from next/navigation pointing to our default module (/assets/hardware).
- **The Impact:** This creates a seamless user experience. We do not need to check authentication status on this root page because our proxy.ts edge middleware automatically intercepts the redirect. If a user lacks a JWT session, they are redirected to /login before the page renders.

### Next.js Metadata & Favicons

- **The Context:** We needed to replace the default Next.js favicon with a custom PNG logo for corporate branding.
- **What we learned:** In the Next.js App Router, we do not need to manually configure head tags or link rel=icon tags. We used Next.js file conventions by placing an image named icon.png in src/app/. The framework automatically injects the metadata across the application.

### Implementing the App Shell with shadcn/ui Sidebar

- **The Context:** We needed to translate the Figma layout into a functional, responsive Next.js application shell.
- **What we learned:** We used the shadcn/ui Sidebar component to handle mobile-responsive navigation state. The architecture is split into three parts: app-sidebar.tsx for navigation data, top-header.tsx for search/profile, and layout.tsx to wrap the module in SidebarProvider.
- **The Impact:** This creates a scalable, enterprise-grade UI foundation. The declarative sidebar structure allows us to add or modify navigation routes without touching CSS.

### React Hydration Mismatches & Browser Extensions

- **The Context:** We encountered a Hydration failed error immediately after building the App Shell layout.
- **What we learned:** Hydration occurs when React attaches interactivity to server-rendered HTML. If the client DOM differs from the server DOM, React throws an error. Browser extensions (for example, password managers or grammar tools) can inject script tags and break Next.js hydration in local development.
- **The Resolution:** To prevent harmless extension injections from crashing local development, we added the suppressHydrationWarning prop to html and body in src/app/layout.tsx, following Next.js guidance.

### Server-to-Client Prop Passing (JWT Data)

- **The Context:** We needed to securely display the active user name and role in the client TopHeader without extra database or API calls.
- **What we learned:** We updated our mockLogin Server Action to include the user name in the JWT payload. Because TopHeader is a client component, it cannot read HTTP-only cookies. We solved this by reading the cookie in the parent server layout.tsx, decoding the JWT with jose, and passing the user object as a prop.
- **The Impact:** This pattern provides secure, immediate rendering of user data on initial page load without exposing cookie access to client-side JavaScript.

### Hybrid Project Management (ClickUp + GitHub)

- **The Context:** Maintaining parallel tracking boards during a tight sprint created process overhead and "ticket fatigue."
- **What we learned:** A hybrid model works best for our team: ClickUp for high-level business planning and design specifications, and GitHub for day-to-day engineering execution.
- **The Impact:** We mapped 23 Epics directly to GitHub Issues and used Semantic Versioning milestones (`v0.5.0` for core features, `v0.9.0` for Faculty Review) to measure progress automatically when PRs merge with `Closes #ID`.

### Route Groups vs. URL Structure

- **The Context:** Tying URL structure directly to UI collapsible groups (e.g., `/assets/ITandDigital/hardware`) created brittle routes that could break when business terminology changed.
- **What we learned:** We should keep URLs flat (`/assets/hardware`) and use Next.js Route Groups `(assets)` for internal code organization.
- **The Impact:** We can apply scoped `layout.tsx` files (for example, a search bar) to related pages without changing the user-facing URL scheme.

### Server Action Vulnerabilities (The "Hidden API" Threat)

- **The Context:** Hiding a UI button does not secure backend behavior because Next.js Server Actions can still be triggered manually.
- **What we learned:** Every Server Action must follow a Zero Trust model and enforce authentication and authorization internally.
- **The Impact:** Actions like `assignUserRole` now re-verify permissions against JWT/session data and server-side role checks before executing Drizzle queries, preventing privilege-escalation exploits.

### Component Colocation

- **The Context:** Grouping components by HTML type (for example, `components/tables/` or `components/modals/`) becomes a dumping ground as the codebase scales.
- **What we learned:** A feature-based colocation strategy is more maintainable.
- **The Impact:** Generic primitives stay in `src/components/ui`, while feature-specific implementations (such as `roles-management-table.tsx`) live alongside their route `page.tsx` in the App Router.

### Topic: TypeScript Modularity & Interface Colocation

- **Context:** As the application scales, there is a temptation to organize all TypeScript interfaces into a centralized `src/types/` folder to keep the codebase "clean."
- **What We Learned:** Centralizing all types creates a "context switching" tax for developers and risks synchronization drift between database schemas and manual interfaces. Modern Next.js architecture heavily favors Colocation and Single Sources of Truth over global type dumping grounds.
- **Impact:** We implemented a 3-Tiered Typing Strategy. Database types are automatically inferred and exported directly from `src/db/schema.ts`. Component props (e.g., `interface ModalProps`) are colocated directly within the `.tsx` file. A `src/types/` folder is strictly reserved for high-level, globally shared constructs (like API Response wrappers or Zod schemas), ensuring high developer velocity and self-documenting files.

### Topic: Edge Middleware Optimization & Stateless JWT Verification

- **Context:** The `proxy.ts` Edge Middleware was executing database queries (e.g., `session_active_lookup`) to verify user sessions. Because Edge functions are globally distributed and the database is geographically centralized (in Mumbai), establishing these HTTP connections introduced massive network latency (~100-300ms) on every single page navigation.
- **What We Learned:** Edge Middleware must never query a centralized database. Authentication at the network boundary should rely entirely on the stateless, cryptographic verification of the JSON Web Token (JWT) using libraries like `jose`. Any database-dependent state checks (such as verifying if an active session was manually revoked) must be pushed further down the stack into React Server Components (RSCs) and Server Actions.
- **Impact:** Stripping the database query from the Edge proxy reduced middleware routing overhead by 99% (dropping from ~300ms down to ~1-5ms). This drastically improves application responsiveness and protects the database connection pool from being overwhelmed by standard routing traffic.

### Topic: The UI Foundation & Avoiding Premature Abstraction

- **Context:** Before starting heavy feature work, there is a risk of developers either building inconsistent UI elements (creating "UI spaghetti") or over-engineering a "perfect" shared component (like a data table with 50 unused props).
- **What We Learned:** We must establish a baseline UI Foundation (using Shadcn UI for Sheets, Modals, Data Tables, and Toasts) but strictly enforce the YAGNI (You Aren't Gonna Need It) principle. We build basic, branded wrappers and stop.
- **Impact:** The frontend team can safely parallelize feature work using a unified design system. We save weeks of engineering time by allowing complex component logic to evolve naturally only when a specific feature demands it.

### Topic: Serverless Database Transactions (Neon HTTP)

- **Context:** Attempting to execute a standard `db.transaction()` for bulk operations (like assigning roles) resulted in a fatal application crash (`No transactions support in neon-http driver`).
- **What We Learned:** Serverless databases utilizing HTTP drivers cannot support traditional multi-query transactions because the HTTP protocol is stateless and cannot hold a database lock open.
- **Impact:** We replaced multi-step transactions with single, atomic SQL queries (utilizing `inArray` and `.returning()`). This guarantees data integrity and bulk-update capabilities without crashing the serverless connection.

### Topic: Network Waterfalls & Parallel Data Fetching

- **Context:** Application code execution was taking ~500ms+ even in production builds. This was caused by sequential database queries (Network Waterfalls), where the app paid the TLS/SSL geographic network latency tax multiple times per page load.
- **What We Learned:** React Server Components must execute independent database queries concurrently using `Promise.all()`. Furthermore, heavily used data-fetching helpers (e.g., `getAuthenticatedUser`) must be wrapped in React's `cache()` to deduplicate database calls during the render cycle.
- **Impact:** Eliminates compounding network latency, shaving hundreds of milliseconds off page load times. This maximizes Next.js server performance and ensures the UI remains highly responsive regardless of the physical distance to the database.

### Topic: Component Composition & Three-Tier UI Architecture

- **Context:** Transitioning from base UI components (Shadcn) to specific business requirements (Epic 3 forms) risked creating either repetitive boilerplate code or unmaintainable "God Components" packed with `if/else` logic. Furthermore, managing panel visibility via nested `useState` props causes excessive prop-drilling.
- **What We Learned:** 1. We must implement a strict Three-Tier UI Architecture:
  - **Tier 1 (Primitives):** Base layout wrappers (e.g., `SlidePanel.tsx`) that handle strictly UI behavior (animations, scrolling) with zero business logic.
  - **Tier 2 (Structural Archetypes):** Interaction-specific wrappers (e.g., `FormPanel`, `DetailPanel`) that standardize layouts, `<form>` tags, loading states, and button placements.
  - **Tier 3 (Feature Implementation):** Highly specific, single-responsibility components (e.g., `CategoryBuilderPanel`) that compose the Archetypes and contain only inputs and API logic.
  2. Panel state (`isOpen`) should be driven by Next.js URL Search Parameters (`?panel=category-builder`) rather than component state to enable deep-linking, browser history support, and simplified orchestration.
- **Impact:** Prevents merge conflicts by isolating feature work, guarantees 100% UI consistency across the application, accelerates frontend development velocity, and keeps shared components clean and strictly modular.

### Topic: Enterprise Folder Structure & Separation of Concerns (The Map vs. The Inventory)

- **Context:** Next.js App Router officially supports "colocation" (placing UI component files directly inside the `app/` routing folders). However, utilizing this for complex modules leads to "spaghetti imports" (routes importing from other routes), accidental mixing of Server and Client environments, and unreadable routing trees.
- **What We Learned:** We strictly enforce a physical boundary between Routing and UI implementation:
  1. **`app/` (The Map):** Strictly for Server Orchestration. Contains only Next.js convention files (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`). It reads URL parameters and dictates _what_ to render.
  2. **`src/components/ui/` & `shared/` (The Foundation):** Tier 1 Primitives (Shadcn) and Tier 2 Structural Archetypes (e.g., `FormPanel`).
  3. **`src/components/features/` (The Inventory):** Tier 3 Feature Implementations (e.g., `CategoryBuilderPanel`). These are Client Components (`"use client"`) that contain the actual business logic, forms, and UI state.
- **Impact:** Enforces a hard boundary between Server (data fetching) and Client (interactivity), completely eliminates spaghetti cross-route imports, and ensures the application routing tree remains a clean, easily scannable map even as the platform scales to hundreds of components.

### Topic: Next.js App Router Special Files (`loading.tsx` & `error.tsx`)

- **Context:** When rendering Server Components (`page.tsx`), slow database queries cause blank screens (blocking UX), and unhandled server errors crash the entire application routing tree.
- **What We Learned:** We must leverage Next.js special file conventions to handle these states gracefully:
  1. **`loading.tsx`:** Automatically wraps the route segment in a React `<Suspense>` boundary. This is where we place Tier-1 UI Skeletons to provide instant visual feedback while the server fetches data.
  2. **`error.tsx`:** Automatically wraps the route segment in a React `<ErrorBoundary>`. It _must_ be a Client Component (`"use client"`). It catches unhandled exceptions and displays a localized fallback UI with a retry mechanism, keeping the rest of the application shell (navigation, sidebar) intact.
- **Impact:** Prevents app-wide crashes from localized database/API failures and eliminates "white screen of death" loading delays. This guarantees a resilient, native-feeling user experience even under heavy server latency or outage conditions.
