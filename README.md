# Enterprise IT Asset Management System (EITAMS)

[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://github.com/adithyadilum/it-asset-management-system/graphs/commit-activity)
[![Next.js](https://img.shields.io/badge/Next.js-16+-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38bdf8)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-TIQRI_Corp-blue.svg)](file:///d:/VS%20code/it-asset-management-system/README.md)

EITAMS is a centralized, enterprise-grade web application custom-designed for **TIQRI Corporation** to manage the full lifecycle, assignment custody, financial intelligence, compliance, and maintenance of all IT hardware, software licenses, office electronics, and furniture assets. 

Replacing legacy trackers and spreadsheets, EITAMS enforces transparency and accountability through a Postgres-level immutable audit log ledger, a modern responsive interface, and real-time dashboard analytics.

---

## Key Features

EITAMS organizes IT asset lifecycle management into five key areas:

* **Security & RBAC**: Role-based access control integrated with Azure AD/Keycloak, enforced by database-level immutable audit logs capturing exact data diffs.
* **Asset Onboarding**: Dynamic JSONB-based custom specifications, a multi-step registration wizard, high-density grids, and automated QR/PDF tag printing.
* **Lifecycle & Operations**: State-machine driven transitions (Available, Assigned, In Repair, Retired), digital custody acceptance handovers, and a maintenance repair ledger.
* **Disposal Compliance**: Executive approval workflows, hard-stop wipe checks, and soft-delete historical archival for compliance.
* **Financial Analytics**: Straight-line depreciation modeling, Total Cost of Ownership (TCO) tracking, software license seat allocation, and automated CRON alert notifications.

## Mobile Companion

EITAMS includes a dedicated **React Native mobile companion app** built using Expo. It runs natively on iOS and Android devices, acting as a high-speed utility for IT Operators and Admins to manage physical inventory in the field.

### Key Capabilities
* **Tethered Data Entry (Barcode Injection)**: Scan manufacturer 1D barcodes (Code 128, Code 39, UPC, EAN) using the device camera to instantly inject values into the active input field on your EITAMS desktop screen via Pusher WebSockets.
* **Remote Control & Sync**: Scanning a TIQRI asset QR code automatically slides open the Asset Details Panel on your active desktop monitor.
* **Standalone Lookup**: Scan QR codes on-the-go to load live asset metadata (Model, Custodian, Location, and Warranty details) in a native overlay sheet.
* **Identity Handshake**: Link the mobile client securely to EITAMS desktop sessions using encrypted JWT keys with `expo-secure-store`.

### Repository & Resources
* **Mobile Companion Repository**: [it-asset-management-system-mobile](https://github.com/adithyadilum/it-asset-management-system-mobile)
* **Tethered Socket Design Specifications**: [tethered-scanner.md](file:///d:/VS%20code/it-asset-management-system/docs/2_design/05_business_logic/tethered-scanner.md)

---

## Technology Stack

### Frontend & UI
- **Core Framework**: [Next.js 16+](https://nextjs.org/) (App Router with Server Actions & Route Handlers), [React 19](https://react.dev/) (incorporating the React Compiler)
- **Styling**: [Tailwind CSS 4.0](https://tailwindcss.com/) using modern CSS variables
- **Components**: [Shadcn UI](https://ui.shadcn.com/) & [Radix UI](https://www.radix-ui.com/) primitives
- **Icons**: [Lucide React](https://lucide.dev/)
- **Themes**: Dark/Light mode toggle via [Next Themes](https://github.com/pacocoursey/next-themes)
- **Analytics & Charts**: [Recharts](https://recharts.org/) for beautiful, responsive dashboards

### Mobile Companion
- **Core Framework**: [React Native](https://reactnative.dev/) / [Expo SDK 54](https://expo.dev/)
- **Navigation**: [Expo Router](https://docs.expo.dev/router/introduction/) (file-based native routing)
- **Styling**: [NativeWind v4](https://www.nativewind.dev/) (Tailwind CSS engine for React Native)
- **Hardware Integration**: `expo-camera` (viewfinder scanning) and `expo-haptics` (vibration feedback)
- **Keychain Security**: `expo-secure-store` for hardware-encrypted token preservation

### Backend, Database & Infrastructure
- **Database & ORM**: [Neon Serverless Postgres](https://neon.tech/) with type-safe [Drizzle ORM](https://orm.drizzle.team/)
- **Authentication**: [NextAuth.js](https://next-auth.js.org/) integrated with Keycloak / Azure AD
- **Caching & Rate Limiting**: [Upstash Redis](https://console.upstash.com) with `@upstash/ratelimit`
- **Background Jobs & Message Queue**: [Upstash QStash](https://upstash.com/docs/qstash) for reliable job scheduling
- **Real-Time Notification Dispatch**: Pusher Channels for immediate UI badge and notification updates
- **File Storage**: Vercel Blob for storing invoices, warranty documents, and E-Waste certificates

### Testing & Verification
- **Unit & Integration Testing**: [Vitest](https://vitest.dev/) and [React Testing Library](https://testing-library.com/)
- **End-to-End Testing**: [Playwright](https://playwright.dev/) for full user-flow browser testing

---

## Project Structure

```text
├── .github/          # GitHub Actions workflows
├── docs/             # Technical specifications, user journeys, & BA logs
├── public/           # Static media assets, icons, and branding
├── scripts/          # Helper scripts and automation utilities
├── src/
│   ├── actions/      # Next.js Server Actions (Database mutations & business logic)
│   ├── app/          # Next.js App Router (Pages, layouts, & API route handlers)
│   ├── components/   # UI components divided into features/, layout/, and ui/
│   ├── db/           # Drizzle schema definitions, seeds, and migrations
│   ├── lib/          # Helper utilities, validations, and data fetching repos
│   └── types/        # Global TypeScript definitions
├── vitest.config.ts  # Vitest configurations
└── playwright.config.ts # Playwright E2E configurations
```

---

## Getting Started

### Prerequisites

- **Node.js**: 20.x or higher
- **Package Manager**: npm (bundled with Node.js)
- **Database**: Neon Postgres instance (or any Postgres 15+ compatible DB)
- **Integrations**: Access credentials for Keycloak, Upstash Redis/QStash, Pusher, and Vercel Blob

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

3. **Configure Environment Variables**:
   Copy `.env.example` to create your local `.env` file:
   ```bash
   cp .env.example .env
   ```
   Open the `.env` file and replace the placeholder values with your database credentials and API keys.

4. **Initialize and Seed the Database**:
   Push the schema to Neon and run the data seeding scripts:
   ```bash
   # Push schema changes to Neon Postgres
   npm run db:push
   ```

5. **Run the development server**:
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:3000`.

---

## Testing & Quality Assurance

EITAMS maintains high code quality and test coverage across the stack:

### Type Checking & Linting
Ensure code style adherence and strict TypeScript checking:
```bash
npm run check
```

### Unit & Integration Tests
Run tests using Vitest:
```bash
# Run tests
npm run test

# Run tests with the Vitest Graphical UI
npm run test:ui
```

### E2E Integration Tests
Run automated browser tests with Playwright. A dockerized DB helper is available to spin up a clean test database:
```bash
# Spin up test database container
npm run test:db:up

# Run Playwright E2E tests
npm run e2e

# Run Playwright in interactive UI mode
npm run e2e:ui

# Tear down test database container
npm run test:db:down
```

---

## Project Documentation Index

The complete documentation log is indexed in the [Documentation Entrypoint](file:///d:/VS%20code/it-asset-management-system/docs/README.md).

### Key Project Documentation
- [Project Scope Statement](file:///d:/VS%20code/it-asset-management-system/docs/0_project-overview/project-scope.md): Scope bounds, constraints, and release milestones.
- [Software Requirements Specification (SRS)](file:///d:/VS%20code/it-asset-management-system/docs/1_requirements/SRS.md): Comprehensive functional requirements and technical definitions.
- [Design Directory Root](file:///d:/VS%20code/it-asset-management-system/docs/2_design/README.md): High-level system architecture and design hub.
- [Core ER Diagram](file:///d:/VS%20code/it-asset-management-system/docs/2_design/02_data_model/erd-diagram.md): Schema relations (Users, Assets, Audits, Settings, Contracts).
- [Asset Lifecycle State Machine](file:///d:/VS%20code/it-asset-management-system/docs/2_design/05_business_logic/asset-lifecycle.md): Details transitions, trigger events, and role validation.
- [Tethered Scanner Design](file:///d:/VS%20code/it-asset-management-system/docs/2_design/05_business_logic/tethered-scanner.md): WebSocket architecture and auto-pairing setup.

---

Developed for **TIQRI Corporation**. All rights reserved.
