# Level 2: Container Diagram

The Container Diagram zooms into the system boundary to illustrate the high-level technical building blocks and their communication protocols.

```mermaid
C4Container
    title Container Diagram for IT Asset Management System

    Person(admin, "Global Admin", "Manages assets and system settings.")
    Person(employee, "Employee", "Views assigned assets.")

    System_Boundary(itam_boundary, "IT Asset Management System") {
        Container(web_app, "Single Page Application", "React.js / Next.js", "Provides the responsive UI for admins and employees to manage/view assets.")
        Container(api_app, "API Application", "Node.js (Express)", "Handles business logic, asset registration, and RBAC security.")
        ContainerDb(database, "Database", "PostgreSQL", "Stores asset records, audit logs, and master data.")
        Container(storage, "File Storage", "Azure Blob Storage", "Stores uploaded PDF invoices and disposal certificates.")
        Container(worker, "Background Worker", "Azure Functions / Cron", "Handles scheduled tasks like warranty alerts and email reminders.")
    }

    System_Ext(azure, "Azure AD", "External SSO and Role-Based Access Control.")
    System_Ext(notifications, "Notification Service", "Sends emails.")

    Rel(admin, web_app, "Uses", "HTTPS")
    Rel(employee, web_app, "Uses", "HTTPS")

    Rel(web_app, api_app, "Makes API calls", "JSON/HTTPS")
    Rel(api_app, database, "Reads/Writes", "Drizzle ORM")
    Rel(api_app, storage, "Uploads/Downloads", "HTTPS")
    Rel(worker, database, "Queries expiring items", "SQL")
    Rel(worker, notifications, "Triggers alerts", "SMTP")
    Rel(api_app, azure, "Validates Tokens", "OIDC")
```

The architecture follows a modular, cloud-ready design:

- Single Page Application (SPA): Built with React.js, this container provides a responsive user interface that runs in the user's browser, communicating with the backend via JSON/HTTPS.

- API Application: The backend, developed using Node.js and Express, acts as the central logic engine. It handles authentication, data validation, and business rules.

- Database: A PostgreSQL database serves as the persistent storage for asset records and immutable audit logs.

- Background Worker: To handle resource-intensive tasks without blocking the UI, a separate Azure Function worker is employed to process daily warranty checks and email triggers.