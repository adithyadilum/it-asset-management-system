# Design Docs

This folder contains the technical design specifications for the **IT Asset Management System**. All implementation details—including database schemas, API contracts, and security protocols—must be defined here before code is written.

## Design Artifacts Status

| Domain              | Document                                                                      | Description                                             | Status                            |
| :------------------ | :---------------------------------------------------------------------------- | :------------------------------------------------------ | :-------------------------------- |
| **01 Architecture** | [System Context (C4-L1)](01_architecture/c4-01-system-context.md)             | High-level system boundaries and external integrations. | To Do / Draft / Review / Approved |
|                     | [Container Diagram (C4-L2)](01_architecture/c4-02-container-diagram.md)       | Web, API, and Database interaction model.               | To Do                             |
|                     | [Deployment Strategy](01_architecture/deployment-strategy.md)                 | Docker Compose setup for local/internal hosting.        | To Do                             |
|                     | [Backup & DR Plan](01_architecture/backup-dr-plan.md)                         | Database dump and restore procedures (RPO 24h).         | To Do                             |
| **02 Data Model**   | [ER Diagram](02_data_model/erd-diagram.md)                                    | Entity relationships (Assets, Categories, Users).       | To Do                             |
|                     | [Seed Data Strategy](02_data_model/seed-data-strategy.md)                     | Default Categories, Brands, and Mock Users.             | To Do                             |
|                     | [Audit Log Schema](02_data_model/audit-log-schema.md)                         | Immutable history table design.                         | To Do                             |
| **03 API Spec**     | [OpenAPI Definition](03_api_spec/openapi-definition.yaml)                     | Swagger specification for all REST endpoints.           | To Do                             |
|                     | [Error Standards](03_api_spec/error-handling-standards.md)                    | Standard JSON error response formats.                   | To Do                             |
| **04 Security**     | [Auth Strategy (Dev)](04_security_infra/auth-flow-dev-mode.md)                | "Mock Auth" implementation for Phase 1.                 | To Do                             |
|                     | [SSO Requirements](04_security_infra/sso-requirements-specification.md)       | Requirements for future Azure AD integration.           | To Do                             |
|                     | [RBAC Matrix](04_security_infra/rbac-matrix.csv)                              | Permission mapping (Roles vs. Actions).                 | To Do                             |
| **05 Logic**        | [Import Flowchart](05_business_logic/bulk-import-logic.md)                    | Logic for "Partial Success" CSV imports.                | To Do                             |
|                     | [Lifecycle State Machine](05_business_logic/asset-lifecycle-state-machine.md) | Valid status transitions (e.g., New -> Assigned).       | To Do                             |
|                     | [Asset Return Seq](05_business_logic/sequence-diagrams/seq-asset-return.md)   | Sequence diagram for the return workflow.               | To Do                             |

## Design Principles

- **Interface First:** API contracts must be approved before backend coding begins.
- **Security by Design:** All financial data designs must include encryption markers.
- **Traceability:** Every design decision must link back to a requirement in `docs/1_requirements`.
