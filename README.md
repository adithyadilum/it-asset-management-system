# Enterprise IT Asset Management System (EITAMS)

[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://github.com/adithyadilum/it-asset-management-system/graphs/commit-activity)
[![Next.js](https://img.shields.io/badge/Next.js-16+-black)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38bdf8)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-TIQRI_Corp-blue.svg)](LICENSE)

EITAMS is a centralized, enterprise-grade platform designed for TIQRI Corporation to manage the full lifecycle of IT hardware, software, and office assets. It provides a robust framework for tracking asset assignments, financial valuations, compliance status, and maintenance history.

## Key Features

### Core Platform

- **Role-Based Access Control (RBAC)**: Integrated with Azure AD / Entra ID for secure enterprise identity management.
- **Immutable Audit Logging**: Every change is tracked with actor, timestamp, and data diffs for full compliance.
- **Dynamic Category Schemas**: Flexible JSONB-based modeling to handle diverse asset types.

### Asset Management

- **Intelligent Registry**: Multi-step registration wizard with dynamic validation based on asset category.
- **Lifecycle Tracking**: State-machine driven transitions (Available <-> Assigned <-> In Repair <-> Retired).
- **Digital Asset Tags**: Automated generation of QR codes and printable PDF tags for physical identification.

### Financial Intelligence

- **TCO Analysis**: Comprehensive Total Cost of Ownership tracking including taxes, shipping, and maintenance.
- **Automated Depreciation**: Real-time financial valuation and depreciation modeling.
- **Renewal Alerts**: Proactive notifications for warranty and license expirations.

### Operations & Compliance

- **Maintenance Ledger**: Track RMA numbers, vendor interactions, and repair costs.
- **Disposal Workflow**: Formal request and approval process with secure document storage for E-Waste certificates.
- **Employee Portal**: Self-service view for employees to manage their assigned hardware and software.

## Technology Stack

- **Frontend**: [Next.js 16+](https://nextjs.org/) (App Router), [React 19](https://react.dev/), [Tailwind CSS 4](https://tailwindcss.com/)
- **Backend**: Next.js Server Actions, Node.js Runtime
- **Database**: [Neon Serverless Postgres](https://neon.tech/) with [Drizzle ORM](https://orm.drizzle.team/)
- **UI Architecture**: [Shadcn UI](https://ui.shadcn.com/), [Radix UI](https://www.radix-ui.com/), [Lucide React](https://lucide.dev/)
- **Storage**: Vercel Blob for document and invoice management
- **Testing**: [Vitest](https://vitest.dev/), [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

## Getting Started

### Prerequisites

- **Node.js**: 20.x or higher
- **Database**: Neon Postgres instance (or any Postgres 15+ compatible DB)
- **Environment**: Copy `.env.example` to `.env.local`

### Installation & Setup

1. **Clone the repository**:

   ```bash
   git clone https://github.com/adithyadilum/it-asset-management-system.git
   cd it-asset-management-system
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Initialize the database**:

   ```bash
   npm run db:push
   npm run db:seed
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:3000`.

## Testing & Quality

Maintain high code quality with our integrated test suite:

- **Run unit tests**: `npm run test`
- **Type check & Lint**: `npm run check`
- **Watch mode**: `npm run test:watch`

## Project Structure

```text
├── src/
│   ├── actions/      # Secure Server Actions (Mutations)
│   ├── app/          # Next.js App Router (Pages & API)
│   ├── components/   # UI & Feature-specific components
│   ├── db/           # Drizzle Schema & Migrations
│   ├── lib/          # Business logic & Repository patterns
│   └── types/        # Global TypeScript definitions
├── docs/             # Technical specs & Requirements
└── public/           # Static assets & Branding
```

## Documentation

The main entry point for all project documentation is the [**Documentation Index**](docs/README.md).

### Quick Links

- **Overview & Scope**
  - [Project Scope Statement](docs/0_project-overview/project-scope.md)
- **Requirements**
  - [Software Requirements Specification (SRS)](docs/1_requirements/SRS.md)
  - [Functional Requirements](docs/1_requirements/functional-requirements.md)
  - [Non-Functional Requirements](docs/1_requirements/non-functional-requirements.md)
  - [User Journeys](docs/1_requirements/user-journeys.md)
- **Design & Architecture**
  - [Design Hub Directory](docs/2_design/README.md)
  - [System Context (C4-L1)](docs/2_design/01_architecture/c4-01-system-context.md)
  - [Core Database ERD](docs/2_design/02_data_model/erd-diagram.md)
  - [Asset Lifecycle State Machine](docs/2_design/05_business_logic/asset-lifecycle.md)

---

Developed for **TIQRI Corporation**. All rights reserved.
