# Enterprise IT Asset Management System

EITAMS is a centralized, enterprise-grade platform designed for TIQRI Corporation to manage the full lifecycle of IT hardware, software, and office assets. It provides a robust framework for tracking asset assignments, financial valuations, compliance status, and maintenance history.

## Executive Summary

The system replaces legacy tracking tools with a modern, web-based interface that enforces accountability through immutable audit logs and integrates with enterprise identity providers. EITAMS offers real-time financial intelligence, including automated depreciation calculations and proactive alert notifications for warranty and license renewals.

## Deployment

Continuous Delivery is implemented via Vercel. The live application and latest deployments can be accessed at:
[tiqri-assets.vercel.app](https://tiqri-assets.vercel.app)

## Key Modules

### Core Platform
- Role-Based Access Control (RBAC) via enterprise identity integration.
- Dynamic category schemas using JSONB-based document modeling.
- Immutable system-wide audit logging for change tracking and compliance.

### Asset Registry & Onboarding
- Multi-step registration wizard with dynamic form fields based on category.
- High-density data grids with advanced filtering and server-side search.
- Support for various asset types (Hardware, Software, Furniture, Electronics).

### Operations & Lifecycle
- Lifecycle state-machine tracking (Available, Assigned, In Repair, Retired, Disposed).
- Asset assignment history and maintenance record ledger.
- Employee self-service view for personal asset assignments.

### Financial Analytics
- Multi-currency initial cost tracking (USD, LKR, NOK) including tax and shipping.
- Total Cost of Ownership (TCO) calculation based on purchase and maintenance costs.
- Warranty and license expiry date tracking.

### Compliance & Disposal
- Formal disposal request and approval workflow.
- Secure document storage for invoices and E-Waste certificates via Vercel Blob.
- Immutable audit trails capturing actor, timestamp, and data diffs.

## Technology Stack

- **Frontend**: Next.js 16+ (App Router), React 19, Tailwind CSS 4
- **Backend**: Next.js Server Actions, Node.js Runtime, REST API (Next.js Routes)
- **UI Components**: Shadcn UI, Radix UI, Lucide React
- **State Management**: TanStack Table, React Server Actions
- **Database & ORM**: Neon Serverless Postgres, Drizzle ORM
- **Authentication**: NextAuth.js (configured for Azure AD / Entra ID)
- **Storage**: Vercel Blob for documents and invoices
- **Testing**: Vitest, React Testing Library

## Getting Started

### Prerequisites

- Node.js 20 or higher
- A Neon Postgres database instance
- Azure AD credentials (optional, mock authentication supported for development)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/adithyadilum/it-asset-management-system.git
   ```

2. Navigate to the web directory:
   ```bash
   cd it-asset-management-system/web
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Configure environment variables:
   Copy `.env.example` to `.env.local` and fill in the required values:
   ```bash
   cp .env.example .env.local
   ```

5. Initialize the database:
   ```bash
   npm run db:push
   ```

### Running the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## Project Structure

- `/web`: The Next.js application source code.
- `/docs`: Comprehensive project documentation, including architecture and requirements.
- `.github/workflows`: Continuous integration pipelines for linting and type checking.

## Documentation Index

For detailed technical specifications, requirements, and design documents, please refer to the following:

### Project Foundations
- [Project Scope Statement](docs/0_project-overview/project-scope.md)
- [Software Requirements Specification (SRS)](docs/1_requirements/SRS.md)
- [Functional Requirements](docs/1_requirements/functional-requirements.md)
- [Non-Functional Requirements](docs/1_requirements/non-functional-requirements.md)
- [Detailed User Story Specifications](docs/1_requirements/user-story-specs/README.md)

### Technical Design
- [Technical Design Index](docs/2_design/README.md)
- [System Container Diagram (C4-L2)](docs/2_design/01_architecture/c4-02-container-diagram.md)
- [Entity Relationship Diagram (ERD)](docs/2_design/02_data_model/erd-diagram.md)
- [Asset Lifecycle State Machine](docs/2_design/05_business_logic/asset-lifecycle.md)
- [Audit Log Schema](docs/2_design/02_data_model/audit-log-schema.md)

### Project Management
- [Project Meetings Ledger](docs/meetings/)

## License

This project is developed for TIQRI Corporation. All rights reserved.
