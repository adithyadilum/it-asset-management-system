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

| Column         | Type          | Constraints                            | Description                                                                                                                                         |
| :------------- | :------------ | :------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------- |
| `log_id`       | `BIGINT`      | `PK`, `GENERATED ALWAYS AS IDENTITY`   | Auto-incrementing primary key. Uses `BIGINT` to accommodate high-volume, long-term data accumulation.                                               |
| `entity_type`  | `VARCHAR(50)` | `NOT NULL`, `INDEXED`                  | The type of entity affected (e.g., `ASSET`, `CATEGORY`, `LOCATION`, `VENDOR`, `USER_ROLE`, `ASSIGNMENT`, `MAINTENANCE`, `DISPOSAL`, `API_KEY`).     |
| `entity_id`    | `UUID`        | `NOT NULL`, `INDEXED`                  | The primary key of the affected entity record. For non-UUID PKs (e.g., integer-based master data), the value is cast to UUID format for uniformity. |
| `action_type`  | `VARCHAR(20)` | `NOT NULL`, `INDEXED`                  | The CRUD operation performed. Enumerated values: `CREATE`, `UPDATE`, `DELETE`, `ARCHIVE`, `ASSIGN`, `RETURN`, `DISPOSE`, `STATUS_CHANGE`, `IMPORT`. |
| `old_value`    | `JSONB`       | `NULLABLE`                             | The complete entity state **before** the mutation, serialized as a JSON object. `NULL` for `CREATE` actions (no prior state).                       |
| `new_value`    | `JSONB`       | `NULLABLE`                             | The complete entity state **after** the mutation, serialized as a JSON object. `NULL` for `DELETE` actions (entity removed).                        |
| `performed_by` | `UUID`        | `NOT NULL`, `FK → users.user_id`       | The `user_id` of the authenticated actor who triggered the event. For CRON/system-initiated events, a reserved system service account UUID is used. |
| `ip_address`   | `VARCHAR(45)` | `NOT NULL`                             | The true client IP address, extracted from the `X-Forwarded-For` header. Supports both IPv4 (max 15 chars) and IPv6 (max 45 chars).                 |
| `performed_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT NOW()`, `INDEXED` | The server-side UTC timestamp of when the event was recorded.                                                                                       |

## 3. Indexes

| Index Name               | Columns                  | Type               | Purpose                                                                                                     |
| :----------------------- | :----------------------- | :----------------- | :---------------------------------------------------------------------------------------------------------- |
| `idx_audit_performed_at` | `performed_at DESC`      | B-Tree             | Optimizes the default chronological sort for the Audit Log Viewer (REQ-FND-1.14).                           |
| `idx_audit_entity`       | `entity_type, entity_id` | B-Tree (Composite) | Enables fast lookup of the full audit trail for a specific entity (e.g., "show all changes for Asset `X`"). |
| `idx_audit_actor`        | `performed_by`           | B-Tree             | Supports filtering by Actor in the Audit Log Viewer.                                                        |
| `idx_audit_action_type`  | `action_type`            | B-Tree             | Supports filtering by Action Type (e.g., show only `DELETE` or `DISPOSE` events).                           |

## 4. Action Type Enumeration

The `action_type` column uses a controlled vocabulary to ensure consistency and enable UI badge rendering:

| Action Type     | Description                                                                                 | Example Trigger                                                        |
| :-------------- | :------------------------------------------------------------------------------------------ | :--------------------------------------------------------------------- |
| `CREATE`        | A new entity record is inserted.                                                            | Registering a new asset (REQ-REG-2.1).                                 |
| `UPDATE`        | One or more fields on an existing entity are modified.                                      | Editing a Vendor's contact info (REQ-FND-1.9).                         |
| `DELETE`        | A master data entity is permanently removed (if no relational safeguard blocks it).         | Deleting an unused Brand (REQ-FND-1.10).                               |
| `ARCHIVE`       | An entity is soft-archived or soft-deleted via `is_active = false` or `is_archived = true`. | Archiving a Location (REQ-FND-1.17), disposing an asset (REQ-DSP-4.8). |
| `ASSIGN`        | An asset is assigned to a user or location.                                                 | Check-out assignment (REQ-OPS-3.3).                                    |
| `RETURN`        | An asset assignment is closed (returned).                                                   | Asset returned with condition check (REQ-OPS-3.4).                     |
| `DISPOSE`       | An asset completes the compliance disposal workflow.                                        | Final disposal execution (REQ-DSP-4.4).                                |
| `STATUS_CHANGE` | An asset's lifecycle status is manually overridden.                                         | Marking an asset as Lost/Found (REQ-OPS-3.13).                         |
| `IMPORT`        | Records created via bulk CSV/Excel import.                                                  | Bulk asset import (REQ-REG-2.9).                                       |

## 5. Entity Type Enumeration

The `entity_type` column identifies which domain entity was affected:

| Entity Type   | Table(s) Tracked                               | Key Epics |
| :------------ | :--------------------------------------------- | :-------- |
| `ASSET`       | `assets`, `asset_costs`, `asset_custom_values` | Epic 2    |
| `CATEGORY`    | `categories`, `category_custom_fields`         | Epic 1    |
| `LOCATION`    | `locations`                                    | Epic 1    |
| `VENDOR`      | `vendors`                                      | Epic 1    |
| `BRAND`       | `brands`                                       | Epic 1    |
| `MODEL`       | `models`                                       | Epic 1    |
| `DEPARTMENT`  | `departments`                                  | Epic 1    |
| `USER_ROLE`   | `user_roles`, `ad_group_role_mappings`         | Epic 1    |
| `ASSIGNMENT`  | `asset_assignments`                            | Epic 3    |
| `MAINTENANCE` | `maintenance_records`, `issue_reports`         | Epic 3    |
| `DISPOSAL`    | `asset_disposals`                              | Epic 4    |
| `API_KEY`     | `api_keys`                                     | Epic 1    |
| `WEBHOOK`     | `webhooks`                                     | Epic 1    |

## 6. JSONB Payload Examples

### 6.1 Asset Status Change (`UPDATE`)

```json
{
  "log_id": 48291,
  "entity_type": "ASSET",
  "entity_id": "a3f1c2d4-5678-9abc-def0-1234567890ab",
  "action_type": "STATUS_CHANGE",
  "old_value": {
    "status_id": 1,
    "status_name": "Assigned"
  },
  "new_value": {
    "status_id": 5,
    "status_name": "Lost",
    "justification": "Asset reported missing during Q1 inventory audit."
  },
  "performed_by": "b2e1d3c4-1234-5678-9abc-def012345678",
  "ip_address": "192.168.1.42",
  "performed_at": "2026-02-26T14:32:00Z"
}
```

### 6.2 Category Creation (`CREATE`)

```json
{
  "log_id": 48292,
  "entity_type": "CATEGORY",
  "entity_id": "00000000-0000-0000-0000-000000000012",
  "action_type": "CREATE",
  "old_value": null,
  "new_value": {
    "category_name": "Standing Desks",
    "prefix_code": "STD",
    "asset_type": "Furniture",
    "is_consumable": false,
    "requires_serial": false
  },
  "performed_by": "b2e1d3c4-1234-5678-9abc-def012345678",
  "ip_address": "10.0.0.5",
  "performed_at": "2026-02-26T09:15:00Z"
}
```

### 6.3 Asset Disposal (`DISPOSE`)

```json
{
  "log_id": 48293,
  "entity_type": "DISPOSAL",
  "entity_id": "00000000-0000-0000-0000-000000000045",
  "action_type": "DISPOSE",
  "old_value": {
    "status": "Pending Approval",
    "asset_tag": "LAP-0142"
  },
  "new_value": {
    "status": "Disposed",
    "disposal_reason": "E-waste",
    "data_wiped": true,
    "tags_removed": true,
    "approved_by": "c3d2e1f0-9876-5432-1abc-def098765432"
  },
  "performed_by": "c3d2e1f0-9876-5432-1abc-def098765432",
  "ip_address": "172.16.0.22",
  "performed_at": "2026-02-26T16:45:00Z"
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

| Constraint               | Implementation                                                                                                                                                           | Requirement             |
| :----------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------- |
| **No Cascading Deletes** | No `ON DELETE CASCADE` foreign keys reference this table. If the performing user is deleted, audit entries remain intact with the original `performed_by` UUID.          | NFR-SEC-05              |
| **No Triggers**          | No `BEFORE UPDATE` or `BEFORE DELETE` triggers are permitted on this table to prevent circumventing WORM protections.                                                    | NFR-SEC-05              |
| **Retention Policy**     | Audit data must be retained for a minimum of **7 years** to satisfy tax and compliance audit obligations. Partitioning by year is recommended for long-term performance. | REQ-DSP-4.8, NFR-REL-06 |
| **Partition Strategy**   | Table is partitioned by `performed_at` (range, yearly) to maintain query performance as volume grows while keeping older partitions on cheaper storage tiers.            | NFR-PERF-04             |

## 8. Filterable Audit Log Viewer (REQ-FND-1.14)

The Audit Log Viewer is a high-density UI table that queries this schema. The following filter dimensions are supported:

| Filter                    | Column Mapped                         | UI Control               |
| :------------------------ | :------------------------------------ | :----------------------- |
| **Actor**                 | `performed_by` → `users.display_name` | Searchable dropdown      |
| **Action Type**           | `action_type`                         | Multi-select badge pills |
| **Entity Type**           | `entity_type`                         | Multi-select dropdown    |
| **Date Range**            | `performed_at`                        | Date range picker        |
| **Entity ID / Asset Tag** | `entity_id`                           | Free-text search         |

**Export:** The filtered result set is exportable to CSV (REQ-FND-1.14), with columns: `Timestamp`, `Actor`, `Action`, `Entity Type`, `Entity ID`, `IP Address`, `Changes Summary`.

## 9. Traceability Matrix

| Requirement                         | Schema Element                                                                                                      |
| :---------------------------------- | :------------------------------------------------------------------------------------------------------------------ |
| REQ-FND-1.11 (Immutable Audit Log)  | Table design, WORM permissions, `old_value`/`new_value` JSONB columns, `ip_address`, `performed_by`, `performed_at` |
| REQ-FND-1.14 (Audit Log Viewer)     | Indexes on `performed_at`, `performed_by`, `action_type`, `entity_type`; CSV export specification                   |
| NFR-SEC-05 (Audit Log Immutability) | `REVOKE UPDATE, DELETE`; no cascading deletes; no mutation triggers; WORM enforcement                               |
| NFR-SEC-06 (Client IP Tracking)     | `ip_address` column populated from `X-Forwarded-For` header                                                         |
| NFR-PERF-04 (Report Generation)     | Yearly partitioning; composite indexes for filtered queries up to 50,000 rows                                       |
| REQ-DSP-4.8 (7-Year Retention)      | Partition-based retention policy; minimum 7-year data preservation                                                  |

[< Back to Requirements](../README.md)
