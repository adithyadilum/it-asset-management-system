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
