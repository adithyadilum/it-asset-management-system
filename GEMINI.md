<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Enterprise IT Asset Management System (EITAMS)

EITAMS is a centralized, enterprise-grade platform designed for TIQRI Corporation to manage the full lifecycle of IT hardware, software, and office assets. It replaces legacy tracking tools with a modern Next.js application, providing robust tracking for asset assignments, financial valuations, compliance, and maintenance history.

## Project Overview

- **Purpose**: Manage the full lifecycle of IT assets (Hardware, Software, Furniture, Electronics).
- **Core Features**:
  - Asset Registry with multi-step registration wizard.
  - Role-Based Access Control (RBAC) via Azure AD / Entra ID.
  - Lifecycle state-machine tracking (Available, Assigned, In Repair, Retired, Disposed).
  - Immutable system-wide audit logging.
  - Financial analytics including TCO and depreciation.
  - Software Asset Management (SAM) with license allocation tracking.
  - Digital hardware tag generation (QR codes and PDF printing).

### Architecture & Tech Stack

- **Frontend**: [Next.js 16+](https://nextjs.org/) (App Router), [React 19](https://react.dev/), [Tailwind CSS 4](https://tailwindcss.com/)
- **Backend**: Next.js Server Actions (Mutations), REST API (Next.js Route Handlers)
- **Database**: [Neon Serverless Postgres](https://neon.tech/) with [Drizzle ORM](https://orm.drizzle.team/)
- **UI Components**: [Shadcn UI](https://ui.shadcn.com/), [Radix UI](https://www.radix-ui.com/), [Lucide React](https://lucide.dev/)
- **Authentication**: [NextAuth.js](https://next-auth.js.org/) (Azure AD integration)
- **State Management**: React Server Actions, [TanStack Table](https://tanstack.com/table/v8)
- **Storage**: Vercel Blob for document management (invoices, certificates)
- **Testing**: [Vitest](https://vitest.dev/), [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

## Project Structure

- `src/actions/`: Server Actions for database mutations and business logic.
- `src/app/`: Next.js App Router (pages, layouts, and API routes).
- `src/components/`:
  - `features/`: Module-specific components (assets, financials, maintenance, etc.).
  - `layout/`: App shell, sidebar, and navigation components.
  - `shared/`: Generic components used across multiple features.
  - `ui/`: Base Shadcn UI components.
- `src/db/`: Database schema definitions (`schema.ts`), seeds, and migrations.
- `src/lib/`: Utility functions, shared logic, and repository patterns for data fetching.
- `src/types/`: TypeScript interfaces and type definitions.
- `docs/`: Comprehensive technical and project documentation.

## Building and Running

### Prerequisites
- Node.js 20+
- Neon Postgres instance (or local Postgres)

### Commands
- `npm install`: Install dependencies.
- `npm run dev`: Start the development server at `http://localhost:3000`.
- `npm run build`: Build the application for production.
- `npm run start`: Start the production server.
- `npm run lint`: Run ESLint checks.
- `npm run test`: Run unit and integration tests with Vitest.
- `npm run check`: Run linting and TypeScript type checking.
- `npm run db:push`: Push schema changes to the database.
- `npm run db:seed`: Seed the database with initial master data.
- `npm run db:seed:assets`: Seed the database with sample assets.

## Development Conventions

### Coding Style
- **Surgical Changes**: Prefer precise edits over full file rewrites.
- **Type Safety**: Strictly use TypeScript; avoid `any`. Define Zod schemas for validation (see `src/lib/validations/`).
- **Server Actions**: Use `'use server'` for mutations. Follow the pattern in `src/actions/` (e.g., auth check -> validation -> DB operation -> audit log -> revalidate).
- **Data Fetching**: Prefer server components and repository functions in `src/lib/data/` for read operations.
- **Tailwind CSS**: Use Tailwind 4 utility classes. Prefer CSS variables for themes (see `src/app/globals.css`).
- **Audit Logs**: All significant data changes must be logged using `logAuditAction` or `logAuditActionTx`.

### Testing Practices
- **Vitest**: Use Vitest for all tests.
- **File Naming**: Tests should be co-located with source files or in `src/test/` and named `*.test.ts` or `*.test.tsx`.
- **Reproduce First**: When fixing bugs, create a reproduction test case before applying the fix.

### UI & Aesthetics
- **Shadcn UI**: Follow Shadcn conventions for UI components.
- **Consistency**: Maintain visual parity with TIQRI branding (see `BrandHeader` and `PhysicalTag` components).
- **Aesthetics**: Ensure interactive feedback and consistent spacing. Use modern interactive components from Radix UI.
