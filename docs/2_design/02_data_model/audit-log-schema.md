# Audit Log Schema

This document defines the detailed schema design for the **Immutable System Audit Log** — the append-only compliance ledger at the core of the IDAMS platform. The audit log captures a forensic record of every CRUD event across all system entities, satisfying REQ-FND-1.11, REQ-FND-1.14, NFR-SEC-05, and NFR-SEC-06.

## Table of Contents

- [1. Design Principles](#1-design-principles)
- [2. Table Schema](#2-table-schema)
- [3. Indexes](#3-indexes)
- [4. Action Type Enumeration](#4-action-type-enumeration)
- [5. Entity Type Enumeration](#5-entity-type-enumeration)
- [6. JSONB Payload Examples](#6-jsonb-payload-examples)
  - [6.1 Asset Status Change](#61-asset-status-change-update)
  - [6.2 Category Creation](#62-category-creation-create)
  - [6.3 Asset Disposal](#63-asset-disposal-dispose)
- [7. Security & Integrity Constraints](#7-security--integrity-constraints)
  - [7.1 Database Permissions (WORM Enforcement)](#71-database-permissions-worm-enforcement)
  - [7.2 Additional Constraints](#72-additional-constraints)
- [8. Filterable Audit Log Viewer](#8-filterable-audit-log-viewer-req-fnd-114)
- [9. Traceability Matrix](#9-traceability-matrix)

## 1. Design Principles

| Principle                        | Implementation                                                                                                                                                                            | Requirement  |
| :------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------- |
| **WORM (Write Once, Read Many)** | The application database user is granted only `INSERT` and `SELECT` privileges on the `system_audit_logs` table. `UPDATE` and `DELETE` are revoked at the PostgreSQL role level.          | NFR-SEC-05   |
| **Automatic Capture**            | A backend middleware interceptor automatically constructs and writes the audit entry for every state-changing API request — no manual developer calls required.                           | REQ-FND-1.11 |
| **Before/After State Diff**      | The system serializes the entity state before and after the mutation into JSONB columns, enabling field-level forensic comparison.                                                        | REQ-FND-1.11 |
| **True Client IP**               | The backend evaluates the `X-Forwarded-For` HTTP header to resolve the user's true origin IP, even when requests pass through load balancers or proxies.                                  | NFR-SEC-06   |
| **System-Wide Scope**            | The log is entity-agnostic — it tracks changes across Assets, Master Data (Categories, Locations, Vendors, Brands, Models), Users/Roles, Disposals, Assignments, and Maintenance Records. | REQ-FND-1.11 |

## 2. Table Schema

### `system_audit_logs`

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PK` | Auto-incrementing primary key. |
| `entity_type` | `VARCHAR(100)` | `NOT NULL` | The type of entity affected (case-sensitive string, e.g., `'Asset'`, `'brands'`, `'asset-categories'`, `'locations'`, `'vendors'`, `'owners'`, `'departments'`, `'statuses'`, `'report-template'`, `'users'`, `'sessions'`, `'URL'`). |
| `entity_id` | `VARCHAR(255)` | `NOT NULL` | The primary key of the affected entity record. Defined as `VARCHAR` to support both UUIDs (e.g., assets, users) and standard integer IDs (e.g., master data brands/locations). |
| `action_type` | `VARCHAR(100)` | `NOT NULL` | The operation performed. Controlled by the `AuditActionType` TypeScript enum. |
| `old_value` | `JSONB` | `NULLABLE` | The entity state **before** the mutation. On `UPDATE` actions, a smart delta-diff calculates and stores only modified fields to optimize database space. `NULL` for `CREATE` actions. |
| `new_value` | `JSONB` | `NULLABLE` | The entity state **after** the mutation. On `UPDATE` actions, it contains only the modified fields. `NULL` for `DELETE` actions. |
| `performed_by_id` | `UUID` | `NOT NULL`, `FK → users.id` | The `id` of the authenticated user who triggered the event. |
| `ip_address` | `VARCHAR(45)` | `NULLABLE` | The true client IP address, extracted from the `X-Forwarded-For` header. Supports both IPv4 and IPv6. Nullable to handle background processes and system tasks. |
| `performed_at` | `TIMESTAMP` | `NOT NULL`, `DEFAULT NOW()` | The server-side UTC timestamp of when the event was recorded. |

## 3. Indexes

The system utilizes standard Drizzle relational mapping, but for high-volume production databases, database-level indexes are highly recommended to optimize query times in the Audit Log Viewer. 

*Note: While not explicitly declared in `schema.ts`, these indexes should be provisioned at the PostgreSQL database level for scalability:*

| Recommended Index | Columns | Type | Purpose |
| :--- | :--- | :--- | :--- |
| `idx_audit_performed_at` | `performed_at DESC` | B-Tree | Optimizes the default chronological sort for the Audit Log Viewer (REQ-FND-1.14). |
| `idx_audit_entity` | `entity_type, entity_id` | B-Tree (Composite) | Enables fast lookup of the full audit trail for a specific entity (e.g., "show all changes for Asset `X`"). |
| `idx_audit_actor` | `performed_by_id` | B-Tree | Supports filtering by Actor in the Audit Log Viewer. |
| `idx_audit_action_type` | `action_type` | B-Tree | Supports filtering by Action Type (e.g., show only `DELETE` or `ACCESS_DENIED` events). |

## 4. Action Type Enumeration

The `action_type` column uses a controlled set of values defined in `src/lib/audit.ts` under the `AuditActionType` type to ensure consistency:

| Action Type | Description | Example Trigger |
| :--- | :--- | :--- |
| `CREATE` | A new entity record is inserted. | Registering a new asset (REQ-REG-2.1). |
| `UPDATE` | Fields on an existing entity are modified (delta logged). | Editing a Vendor's contact info (REQ-FND-1.9). |
| `DELETE` | An entity is permanently removed from the system. | Deleting an unused Brand (REQ-FND-1.10). |
| `ASSIGN` | An asset is assigned to a user or location. | Check-out assignment (REQ-OPS-3.3). |
| `RETURN` | An asset assignment is closed (returned). | Asset returned with condition check (REQ-OPS-3.4). |
| `STATUS_CHANGE` | An asset's lifecycle status is manually overridden. | Marking an asset as Lost/Found (REQ-OPS-3.13). |
| `REPAIR_INITIATED` | A maintenance ticket is created and set to ACTIVE. | Asset dispatched for vendor/internal repair (REQ-OPS-3.7). |
| `REPAIR_COMPLETED` | An active maintenance ticket is closed (COMPLETED). | Asset successfully returned from repair. |
| `RESOLVED_INTERNALLY`| Internal maintenance issues marked resolved. | Minor repairs completed by in-house IT team. |
| `LOGIN` | A successful user session is authenticated. | Admin or user successfully logging into the dashboard. |
| `LOGOUT` | An active user session is terminated. | User explicitly logging out or session expiring. |
| `ACCESS_DENIED` | A blocked security or compliance boundary violation. | A non-admin trying to approve a disposal request. |
| `IMPORT` | Records created via bulk CSV/Excel import. | Bulk asset import (REQ-REG-2.9). |

## 5. Entity Type Enumeration

The `entity_type` column stores the case-sensitive string representation of the affected domain model:

| Entity Type | Table(s) Tracked | Description / Key Epics |
| :--- | :--- | :--- |
| `'Asset'` | `assets`, `asset_purchases`, `asset_documents` | Core hardware assets lifecycle (Epic 2, 3, 4) |
| `'users'` | `users` | User accounts and permissions changes (Epic 1) |
| `'sessions'` | `sessions` | Auth tokens and session lifetimes (Epic 1) |
| `'brands'` | `brands` | Brand master data (Epic 1) |
| `'asset-categories'`| `categories` | Custom-schema categorizations (Epic 1) |
| `'device-models'` | `models` | Brand and category-specific product models (Epic 1) |
| `'locations'` | `locations` | Geographical master locations (Epic 1) |
| `'vendors'` | `vendors` | Procurement and supplier registry (Epic 1) |
| `'owners'` | `owners` | Financial asset owners (Epic 1) |
| `'departments'` | `departments` | Corporate cost centers and user departments (Epic 1) |
| `'statuses'` | `custom_statuses` | Visual metadata configurations for custom status options (Epic 1) |
| `'report-template'` | `report_templates` | Custom report templates for financial analytics (Epic 22) |
| `'URL'` | *None (Middleware level)* | Endpoint access logged by routing or security middleware |

## 6. JSONB Payload Examples

### 6.1 Asset Status Change (`UPDATE`)

*Notice the delta diff mechanism: only the modified properties are stored in `oldValue` and `newValue`.*

```json
{
  "id": 48291,
  "entityType": "Asset",
  "entityId": "a3f1c2d4-5678-9abc-def0-1234567890ab",
  "actionType": "STATUS_CHANGE",
  "oldValue": {
    "status": "Available"
  },
  "newValue": {
    "status": "Lost"
  },
  "performedById": "b2e1d3c4-1234-5678-9abc-def012345678",
  "ipAddress": "192.168.1.42",
  "performedAt": "2026-02-26T14:32:00.000Z"
}
```

### 6.2 Category Creation (`CREATE`)

*On creation, `oldValue` is `null` and the complete state is stored in `newValue`.*

```json
{
  "id": 48292,
  "entityType": "asset-categories",
  "entityId": "12",
  "actionType": "CREATE",
  "oldValue": null,
  "newValue": {
    "id": 12,
    "name": "Standing Desks",
    "prefix": "STD",
    "pillar": "Office Furniture",
    "requiresSerial": true,
    "isConsumable": false
  },
  "performedById": "b2e1d3c4-1234-5678-9abc-def012345678",
  "ipAddress": "10.0.0.5",
  "performedAt": "2026-02-26T09:15:00.000Z"
}
```

### 6.3 Security Access Denied (`ACCESS_DENIED`)

*Captures blocked actions, logging the target resource and actor information for immediate forensic traceability.*

```json
{
  "id": 48293,
  "entityType": "Asset",
  "entityId": "a3f1c2d4-5678-9abc-def0-1234567890ab",
  "actionType": "ACCESS_DENIED",
  "oldValue": null,
  "newValue": {
    "path": "/api/disposal/approve",
    "reason": "Required role GlobalAdmin, got ITOperator"
  },
  "performedById": "c3d2e1f0-9876-5432-1abc-def098765432",
  "ipAddress": "172.16.0.22",
  "performedAt": "2026-02-26T16:45:00.000Z"
}
```

## 7. Security & Integrity Constraints

### 7.1 Database Permissions (WORM Enforcement)

```sql
-- Application role: INSERT + SELECT only
GRANT INSERT, SELECT ON system_audit_logs TO idams_app_role;

-- Explicitly revoke mutation privileges
REVOKE UPDATE, DELETE ON system_audit_logs FROM idams_app_role;

-- Only the DBA superuser retains full access for emergency recovery
```

### 7.2 Additional Constraints

| Constraint | Implementation | Requirement |
| :--- | :--- | :--- |
| **No Cascading Deletes** | No `ON DELETE CASCADE` foreign keys reference this table. If the performing user is deleted, audit entries remain intact with the original `performed_by_id` UUID. | NFR-SEC-05 |
| **No Triggers** | No `BEFORE UPDATE` or `BEFORE DELETE` triggers are permitted on this table to prevent circumventing WORM protections. | NFR-SEC-05 |
| **Retention Policy** | Audit data must be retained for a minimum of **7 years** to satisfy tax and compliance audit obligations. Partitioning by year is recommended for long-term performance. | REQ-DSP-4.8, NFR-REL-06 |
| **Partition Strategy** | Table is partitioned by `performed_at` (range, yearly) to maintain query performance as volume grows while keeping older partitions on cheaper storage tiers. | NFR-PERF-04 |

## 8. Filterable Audit Log Viewer (REQ-FND-1.14)

The Audit Log Viewer is a high-density, real-time UI table that queries `system_audit_logs` using Next.js Server Actions. It supports highly optimized full-text search and precise filtering:

### 8.1 Global Search
The global search parameter performs a case-insensitive `ILIKE` search across:
- `action_type`, `entity_type`, `entity_id`, and `ip_address`.
- JSON stringified representations of `old_value` and `new_value`.
- Performed-by user's `name` or `email`.
- **Target Entity Metadata**: Dynamically joins and searches resolved fields (e.g., Asset Tags, Brand names, Location codes, Vendor names, Department names) rather than searching just raw database primary keys.

### 8.2 High-Density Filter Dimensions
The following structured filters are mapped in `src/actions/audit-log.ts` to allow complex queries with operators like `is` or `is not`:

| Filter Name | Column Mapped / Resolution | Operator | UI Control |
| :--- | :--- | :--- | :--- |
| **Action Taken** | `actionType` | `is` \| `is not` | Controlled dropdown |
| **User** | `users.name` \| `users.email` (performed by) | `is` \| `is not` | Searchable select input |
| **Target Entity** | `entityType` \| `entityId` \| metadata search | `is` \| `is not` | Category/Entity dropdown |
| **IP Address** | `ipAddress` | `is` \| `is not` | Text search input |
| **Event Details** | `oldValue` \| `newValue` | `is` \| `is not` | Custom text keyword filter |

**Export:** The filtered result set is exportable to CSV format, preserving columns: `Timestamp`, `Actor`, `Action`, `Entity Type`, `Entity ID`, `IP Address`, and `Changes Summary`.

## 9. Traceability Matrix

| Requirement | Schema Element |
| :--- | :--- |
| REQ-FND-1.11 (Immutable Audit Log) | Table design, WORM permissions, `oldValue`/`newValue` JSONB columns, `ipAddress`, `performedById`, `performedAt` |
| REQ-FND-1.14 (Audit Log Viewer) | Full-text search on details and users; dynamic target metadata lookups; pagination and structured query filtering. |
| NFR-SEC-05 (Audit Log Immutability) | `REVOKE UPDATE, DELETE`; no cascading deletes; no mutation triggers; WORM enforcement |
| NFR-SEC-06 (Client IP Tracking) | `ipAddress` column populated from `X-Forwarded-For` header with silent try-catch fallback. |
| NFR-PERF-04 (Report Generation) | Dynamic bulk label resolution after query slicing to prevent expensive joins on entire tables. |
| REQ-DSP-4.8 (7-Year Retention) | Partition-based retention policy; minimum 7-year data preservation |

---

[< Back to Requirements](../README.md)
