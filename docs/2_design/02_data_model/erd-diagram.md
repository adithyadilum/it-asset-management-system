# Entity Relationship Diagram

This diagram defines the complete data model for the Integrated Digital Asset Management System (IDAMS), covering all five functional modules: Core Platform & API Gateway (Module 1), Asset Registry & Onboarding (Module 2), IT Operations & Lifecycle (Module 3), Secure Disposal & Compliance (Module 4), and Financial Analytics & Automation (Module 5).

The data model is implemented on Neon Serverless Postgres using the Drizzle TypeScript ORM. All entities represent the exact table columns, keys, and relational cardinality established in the actual codebase (`src/db/schema.ts`).

```mermaid
erDiagram

    %% ═══════════════════════════════════════════
    %% MODULE 01: Core Platform & API Gateway
    %% ═══════════════════════════════════════════

    DEPARTMENTS {
        serial id PK
        uuid uuid UK
        varchar department_code UK
        varchar name UK
        varchar short_code UK
        varchar cost_center_id UK
        boolean is_active
    }

    USERS {
        uuid id PK
        varchar email UK
        text name
        text password
        integer department_id FK
        role_enum role
        boolean is_active
        timestamp created_at
    }

    SESSIONS {
        serial id PK
        uuid user_id FK
        text token_id UK
        timestamp expires_at
        timestamp created_at
        timestamp revoked_at
    }

    LOCATIONS {
        serial id PK
        uuid uuid UK
        varchar location_code UK
        varchar name
        location_type_enum type
        integer parent_id FK
        boolean is_active
    }

    VENDORS {
        serial id PK
        uuid uuid UK
        varchar vendor_code UK
        varchar company_name UK
        varchar email
        varchar phone
        varchar website
        boolean is_active
    }

    OWNERS {
        serial id PK
        uuid uuid UK
        varchar owner_code UK
        varchar company_name UK
        boolean is_active
    }

    CATEGORIES {
        serial id PK
        uuid uuid UK
        varchar category_code UK
        varchar name
        pillar_enum pillar
        varchar prefix UK
        boolean requires_serial
        boolean is_consumable
        jsonb custom_schema
        boolean is_active
    }

    BRANDS {
        serial id PK
        uuid uuid UK
        varchar brand_code UK
        varchar name UK
        boolean is_active
    }

    MODELS {
        serial id PK
        uuid uuid UK
        varchar model_code UK
        integer brand_id FK
        integer category_id FK
        varchar name
        varchar image_url
        jsonb technical_details
        boolean is_active
    }

    CUSTOM_STATUSES {
        serial id PK
        varchar name
        varchar icon_name
        varchar color_theme
        uuid created_by_id FK
        boolean is_active
        timestamp created_at
    }

    SYSTEM_AUDIT_LOGS {
        serial id PK
        varchar entity_type
        varchar entity_id
        varchar action_type
        uuid performed_by_id FK
        jsonb old_value
        jsonb new_value
        varchar ip_address
        timestamp performed_at
    }

    %% ═══════════════════════════════════════════
    %% MODULE 02: Asset Registry & Onboarding
    %% ═══════════════════════════════════════════

    ASSETS {
        uuid id PK
        varchar asset_tag UK
        varchar serial_number
        varchar name
        integer model_id FK
        integer location_id FK
        integer owner_id FK
        varchar status
        condition_enum condition
        jsonb instance_attributes
        boolean is_archived
        integer useful_life_months
        decimal salvage_value
        timestamp created_at
        timestamp updated_at
    }

    ASSET_PURCHASES {
        serial id PK
        uuid asset_id FK
        integer vendor_id FK
        date purchase_date
        decimal base_price
        decimal tax
        decimal shipping_cost
        decimal total_cost
        varchar currency_code
        date warranty_expiry
        varchar invoice_url
        timestamp created_at
        timestamp updated_at
    }

    ASSET_DOCUMENTS {
        serial id PK
        uuid asset_id FK
        varchar document_type
        varchar file_url
        uuid uploaded_by_id FK
        timestamp uploaded_at
    }

    %% ═══════════════════════════════════════════
    %% MODULE 03: IT Operations & Lifecycle
    %% ═══════════════════════════════════════════

    ASSET_ASSIGNMENTS {
        serial id PK
        uuid asset_id FK
        uuid assigned_to_user_id FK
        integer assigned_to_location_id FK
        uuid assigned_by_id FK
        timestamp assigned_date
        date expected_return_date
        timestamp returned_date
        condition_enum return_condition
        text notes
        varchar acceptance_status
        timestamp accepted_at
        timestamp return_requested_at
        assignment_state_enum state
    }

    MAINTENANCE_TICKETS {
        serial id PK
        uuid asset_id FK
        maintenance_ticket_type_enum ticket_type
        varchar vendor_name
        varchar rma_number
        text reported_issue
        text resolution_notes
        decimal estimated_cost
        decimal actual_cost
        date estimated_return_date
        timestamp actual_completion_date
        maintenance_ticket_status_enum status
        uuid dispatched_by_id FK
        timestamp created_at
        timestamp updated_at
    }

    %% ═══════════════════════════════════════════
    %% MODULE 04: Secure Disposal & Compliance
    %% ═══════════════════════════════════════════

    ASSET_DISPOSALS {
        serial id PK
        uuid asset_id FK
        uuid requested_by_id FK
        uuid approved_by_id FK
        disposal_status_enum status
        varchar reason
        text justification
        text rejection_reason
        varchar disposal_method
        varchar disposal_receipt_url
        boolean data_wiped
        boolean tags_removed
        decimal actual_salvage_value
        decimal book_value_at_disposal
        timestamp requested_at
        timestamp resolved_at
        text notes
    }

    %% ═══════════════════════════════════════════
    %% Cross-Cutting: Software Asset Management (SAM)
    %% ═══════════════════════════════════════════

    SOFTWARE_LICENSES {
        uuid id PK
        integer model_id FK
        uuid asset_id FK
        varchar license_key
        license_type_enum license_type
        integer total_seats
        date start_date
        date expiry_date
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    SOFTWARE_ALLOCATIONS {
        serial id PK
        uuid license_id FK
        uuid assigned_to_user_id FK
        timestamp allocated_at
        timestamp revoked_at
    }

    %% ═══════════════════════════════════════════
    %% MODULE 05: Notification & Alerts System (Epic 23)
    %% ═══════════════════════════════════════════

    APP_NOTIFICATIONS {
        uuid id PK
        uuid user_id FK
        varchar title
        text message
        varchar target_url
        boolean is_read
        notification_event_type_enum event_type
        timestamp created_at
    }

    NOTIFICATION_RULES {
        serial id PK
        varchar rule_key UK
        varchar display_name
        notification_category_enum category
        boolean is_enabled
        integer threshold_days
        boolean channel_in_app
        boolean channel_email
        boolean channel_teams
        uuid updated_by_id FK
        timestamp updated_at
    }

    NOTIFICATION_LOGS {
        serial id PK
        uuid notification_id FK
        notification_event_type_enum event_type
        notification_channel_enum channel
        notification_log_status_enum status
        text error_message
        timestamp sent_at
    }

    INTEGRATION_SETTINGS {
        integer id PK
        text resend_api_key
        text teams_webhook_url
        varchar smtp_host
        integer smtp_port
        text smtp_user
        timestamp updated_at
    }

    %% ═══════════════════════════════════════════
    %% MODULE 05: Custom Report Templates (Epic 22)
    %% ═══════════════════════════════════════════

    REPORT_TEMPLATES {
        serial id PK
        varchar name
        varchar report_code UK
        text description
        boolean is_active
        varchar data_source
        jsonb filters
        jsonb fields
        varchar sort_direction
        uuid created_by_id FK
        timestamp created_at
        timestamp updated_at
    }

    %% ═══════════════════════════════════════════
    %% RELATIONSHIPS
    %% ═══════════════════════════════════════════

    %% Module 01: Platform Foundation
    DEPARTMENTS ||--o{ USERS : employs
    USERS ||--o{ SESSIONS : establishes
    USERS ||--o{ SYSTEM_AUDIT_LOGS : performs
    USERS ||--o{ REPORT_TEMPLATES : configures

    %% Module 01: Master Data
    BRANDS ||--o{ MODELS : produces
    CATEGORIES ||--o{ MODELS : classifies
    LOCATIONS ||--o{ LOCATIONS : contains (self-referential)

    %% Module 02: Asset Registry
    MODELS ||--o{ ASSETS : specifies
    LOCATIONS ||--o{ ASSETS : houses
    OWNERS ||--o{ ASSETS : owns
    ASSETS ||--o{ ASSET_PURCHASES : has
    VENDORS ||--o{ ASSET_PURCHASES : supplies
    ASSETS ||--o{ ASSET_DOCUMENTS : stores
    USERS ||--o{ ASSET_DOCUMENTS : uploads
    USERS ||--o{ CUSTOM_STATUSES : configures

    %% Module 03: Operations & Maintenance
    ASSETS ||--o{ ASSET_ASSIGNMENTS : assigns
    USERS ||--o{ ASSET_ASSIGNMENTS : assigned-to
    LOCATIONS ||--o{ ASSET_ASSIGNMENTS : assigned-to
    USERS ||--o{ ASSET_ASSIGNMENTS : assigned-by
    ASSETS ||--o{ MAINTENANCE_TICKETS : services
    USERS ||--o{ MAINTENANCE_TICKETS : dispatches

    %% Module 04: Disposals
    ASSETS ||--o{ ASSET_DISPOSALS : requests-disposal
    USERS ||--o{ ASSET_DISPOSALS : requests
    USERS ||--o{ ASSET_DISPOSALS : approves

    %% Cross-Cutting: Software Asset Management (SAM)
    MODELS ||--o{ SOFTWARE_LICENSES : licenses
    ASSETS ||--o{ SOFTWARE_LICENSES : hosts (optional)
    SOFTWARE_LICENSES ||--o{ SOFTWARE_ALLOCATIONS : allocates
    USERS ||--o{ SOFTWARE_ALLOCATIONS : receives-seat

    %% Module 05: Notification & Alerts (Epic 23)
    USERS ||--o{ APP_NOTIFICATIONS : receives
    APP_NOTIFICATIONS ||--o{ NOTIFICATION_LOGS : triggers
    USERS ||--o{ NOTIFICATION_RULES : updates
```

---

[< Back to Design Docs](../README.md)
