````mermaid
erDiagram

    USERS {
        UUID user_id PK
        STRING azure_ad_object_id UK
        STRING email
        STRING display_name
        STRING department
        BOOLEAN is_active
        TIMESTAMP created_at
    }

    ROLES {
        INT role_id PK
        STRING role_name UK
        STRING description
    }

    USER_ROLES {
        UUID user_id FK
        INT role_id FK
    }

    BRANDS {
        INT brand_id PK
        STRING brand_name UK
        BOOLEAN is_active
    }

    MODELS {
        INT model_id PK
        INT brand_id FK
        STRING model_name
    }

    CATEGORIES {
        INT category_id PK
        STRING category_name UK
        STRING asset_type
        BOOLEAN requires_serial
    }

    VENDORS {
        INT vendor_id PK
        STRING vendor_name UK
        STRING contact_info
    }

    LOCATIONS {
        INT location_id PK
        INT parent_location_id FK
        STRING location_type
        STRING location_name
    }

    ASSET_STATUSES {
        INT status_id PK
        STRING status_name UK
        BOOLEAN is_terminal
    }

    ASSETS {
        UUID asset_id PK
        STRING asset_tag UK
        INT category_id FK
        INT brand_id FK
        INT model_id FK
        STRING serial_number UK
        STRING asset_name
        DATE purchase_date
        INT vendor_id FK
        INT status_id FK
        BOOLEAN is_quantity_only
        INT quantity
        BOOLEAN is_archived
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    CURRENCIES {
        STRING currency_code PK
        STRING currency_name
    }

    ASSET_COSTS {
        INT asset_cost_id PK
        UUID asset_id FK
        DECIMAL base_price
        DECIMAL tax_amount
        DECIMAL shipping_cost
        DECIMAL total_cost
        STRING currency_code FK
        DECIMAL conversion_rate_to_base
        TIMESTAMP recorded_at
    }

    ASSET_ASSIGNMENTS {
        INT assignment_id PK
        UUID asset_id FK
        UUID assigned_to_user_id FK
        INT assigned_to_location_id FK
        DATE assigned_date
        DATE expected_return_date
        DATE returned_date
    }

    ASSET_AUDIT_LOGS {
        INT log_id PK
        UUID asset_id FK
        STRING action_type
        STRING old_value
        STRING new_value
        UUID performed_by FK
        TIMESTAMP performed_at
    }

    MAINTENANCE_RECORDS {
        INT maintenance_id PK
        UUID asset_id FK
        DATE service_date
        INT vendor_id FK
        STRING description
        DECIMAL repair_cost
        STRING currency_code FK
    }

    ASSET_DISPOSALS {
        INT disposal_id PK
        UUID asset_id FK
        STRING disposal_reason
        UUID approved_by FK
        TIMESTAMP approved_at
        STRING notes
    }

    ASSET_DOCUMENTS {
        INT document_id PK
        UUID asset_id FK
        STRING document_type
        STRING file_path
        TIMESTAMP uploaded_at
    }

    %% Relationships
    USERS ||--o{ USER_ROLES : has
    ROLES ||--o{ USER_ROLES : assigned
    USERS ||--o{ ASSET_ASSIGNMENTS : assigned
    ASSETS ||--o{ ASSET_ASSIGNMENTS : gets
    LOCATIONS ||--o{ ASSET_ASSIGNMENTS : contains
    BRANDS ||--o{ MODELS : produces
    BRANDS ||--o{ ASSETS : categorizes
    MODELS ||--o{ ASSETS : specifies
    CATEGORIES ||--o{ ASSETS : classifies
    VENDORS ||--o{ ASSETS : supplies
    VENDORS ||--o{ MAINTENANCE_RECORDS : performs
    ASSET_STATUSES ||--o{ ASSETS : determines
    ASSETS ||--o{ ASSET_COSTS : has
    CURRENCIES ||--o{ ASSET_COSTS : prices
    CURRENCIES ||--o{ MAINTENANCE_RECORDS : charges
    ASSETS ||--o{ ASSET_AUDIT_LOGS : logs
    USERS ||--o{ ASSET_AUDIT_LOGS : performs
    ASSETS ||--o{ ASSET_DISPOSALS : disposes
    USERS ||--o{ ASSET_DISPOSALS : approves
    ASSETS ||--o{ ASSET_DOCUMENTS : has
    ```
````
