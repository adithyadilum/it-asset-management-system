# Level 3: Component Diagram (API Application)

The Component Diagram details the internal modularity of the API Application container, demonstrating the "Separation of Concerns" principle.

```mermaid
C4Component
    title Component Diagram for API Application (Node.js/Express)

    Container(web_app, "Single Page Application", "React", "Provides the user interface.")
    ContainerDb(database, "Database", "PostgreSQL", "Stores asset records and logs.")
    System_Ext(azure, "Azure AD", "External SSO provider.")

    Container_Boundary(api_boundary, "API Application") {
        Component(auth_controller, "Auth Controller", "Express Middleware", "Validates JWT tokens and maps roles from Azure AD groups.")
        Component(registry_service, "Registry Service", "Service Layer", "Handles unique ID generation, dynamic form logic, and asset CRUD.")
        Component(tracking_service, "Operations Service", "Service Layer", "Manages check-in/out, status transitions, and bulk transfers.")
        Component(audit_service, "Audit Logger", "Utility", "Captures 'before and after' values for every change into the immutable history log.")
        Component(notification_service, "Notification Service", "Utility", "Formats and dispatches email templates.")
    }

    Rel(web_app, auth_controller, "Sends Request with Token", "JSON/HTTPS")
    Rel(auth_controller, azure, "Verifies Signature", "JWKS")

    Rel(auth_controller, registry_service, "Forwards Valid Request", "Function Call")
    Rel(auth_controller, tracking_service, "Forwards Valid Request", "Function Call")

    Rel(registry_service, database, "Persists Asset Data", "SQL")
    Rel(tracking_service, database, "Updates Status", "SQL")

    Rel(registry_service, audit_service, "Logs Creation", "Function Call")
    Rel(tracking_service, audit_service, "Logs Assignment", "Function Call")

    Rel(audit_service, database, "Writes Audit Entry", "SQL")
    Rel(tracking_service, notification_service, "Triggers Email", "Function Call")
```

The API is structured into distinct functional services:

- Auth Controller: Intercepts incoming requests to validate JWT tokens against Azure AD before granting access.

- Registry Service: Manages the core data logic, including unique ID generation and dynamic form rendering for different asset categories.

- Tracking & Operations Service: Handles the complex transactional logic for asset assignments, returns, and bulk location transfers.

- Audit Logger: A dedicated component that captures the state of an asset before and after any modification, writing to the history log to ensure compliance.