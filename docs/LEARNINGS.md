# Project Learnings & Architecture Decisions

**Project:** IT Asset Management System  
**Stack:** Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, Drizzle ORM, Neon Postgres

---

### Date: April 2026

**Topic:** Enforcing Code Quality & Preventing Merge Conflicts

- **The Context:** Multiple developers working in the same repository can lead to messy Git histories, "format wars" (tabs vs. spaces), and broken integration branches.
- **What we learned:** We implemented an "Automated Bouncer" CI pipeline using GitHub Actions to block Pull Requests that contain type errors. Locally, we instituted a `npm run check` script (running ESLint and `tsc --noEmit`) and set up **Prettier** to automatically format code on save.
- **The Impact:** This guarantees that our `dev` branch remains stable. We also learned that to prevent Git merge conflicts, tasks must be separated architecturally (e.g., UI developer works in `app/`, API developer works in `actions/`) to avoid simultaneous edits to the same file.
- **CI Optimization:** We optimized our GitHub Actions YAML with `paths-ignore: ['**.md']` so we do not waste cloud build minutes when only updating documentation.

---

### Date: April 2026

**Topic:** Adopting a Design System (shadcn/ui) over Raw Tailwind

- **The Context:** Our Figma design included complex states, border radii, and specific corporate branding. Manually writing raw Tailwind CSS for every button and input was unscalable and difficult to maintain.
- **What we learned:** We initialized **shadcn/ui** (built on top of Radix UI for accessibility). Instead of hardcoding hex colors in every file, we translated the Figma design tokens into HSL variables inside `src/app/globals.css` and mapped them to semantic names (e.g., `--primary` for the corporate TIQRI blue, and custom variables like `--status-repair` for asset tracking).
- **The Impact:** Components are now fully accessible by default. Global branding updates only require changing a single CSS file, and frontend development speed has drastically increased.

---

### Date: April 2026

**Topic:** Server Actions vs. Traditional REST APIs

- **The Context:** We needed to connect our Next.js frontend to our Neon Postgres database (managed via Drizzle ORM) to handle CRUD operations for Hardware Assets and Users.
- **What we learned:** Following industry advice from our mentor, we pivoted from building traditional `/api` REST endpoints to using Next.js **Server Actions** (`"use server"`). This allows us to call backend database logic directly from frontend React components without writing boilerplate `fetch()` requests or manually parsing JSON.
- **The Impact:** This provides end-to-end TypeScript safety—if the database schema changes, the frontend form immediately throws a type error in VS Code.
- **Security Consideration:** Because Server Actions expose hidden endpoints to the internet, we established a strict rule to authenticate and authorize the user _inside_ the action before querying the database.

---

### Date: April 2026

**Topic:** Handling Next.js Caching Issues (Turbopack)

- **The Context:** After installing new npm packages (like `tw-animate-css` for our UI components), local development servers were throwing "Module not found" errors even after running `npm install`.
- **What we learned:** Next.js Turbopack aggressively caches build failures. If a package is missing on the first run, the compiler remembers the failure and refuses to look for the newly installed package.
- **The Resolution:** Deleting the hidden `.next` folder (`rmdir /s /q .next` on Windows) forces Turbopack to dump its cache and rebuild the dependency tree from scratch, resolving the ghost errors.

---

### Date: April 2026

**Topic:** Continuous Deployment Infrastructure

- **The Context:** Waiting to deploy the application until the end of the project lifecycle introduces massive risk and makes it difficult for stakeholders to monitor progress.
- **What we learned:** We connected our GitHub repository to **Vercel**.
- **The Impact:** Every merge to the `main` branch automatically deploys to production. More importantly, Vercel generates unique, isolated "Preview URLs" for every Pull Request. This allows our mentors to click a link and test new UI features directly in their browser before the code is merged into `dev`.
