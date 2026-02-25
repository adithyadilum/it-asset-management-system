# Non-Functional Requirements

## 1. Performance & Scalability

| ID              | Requirement                | Metric / Constraint                                                                                                                                                 | Linked Epic Requirement |
| :-------------- | :------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :---------------------- |
| **NFR-PERF-01** | **Dashboard Load Time**    | The Global KPI Dashboard metrics and widget counts must aggregate and render in **under 2 seconds**.                                                                | [REQ-FIN-5.1]           |
| **NFR-PERF-02** | **Search & Grid Latency**  | General search results and complex column filtering must load within **2 seconds** for a database of up to 100,000 assets.                                          | [REQ-REG-2.6]           |
| **NFR-PERF-03** | **WebSocket Scan Latency** | Tethered mobile-to-desktop barcode injections via WebSockets must appear in the desktop input field within **500ms** of a successful scan.                          | [REQ-REG-2.14]          |
| **NFR-PERF-04** | **Report Generation**      | Complex CSV/PDF export reports (e.g., full compliance audit lists) must handle up to **50,000 rows** without crashing, and initiate download within **10 seconds**. | [REQ-FIN-5.7]           |
| **NFR-PERF-05** | **Notification Latency**   | Automated Email/Teams notifications and Webhook payloads must be dispatched within **60 seconds** of the triggering system event.                                   | [REQ-OPS-3.3]           |
| **NFR-PERF-06** | **API Rate Limiting**      | The Open API Gateway must enforce a rate limit of **100 requests per minute per API Key** to prevent external systems from degrading system performance.            | [REQ-FND-1.12]          |
| **NFR-PERF-07** | **Concurrent Users**       | The system must comfortably support at least **50 concurrent administrative users** without database locking or UI degradation.                                     | General                 |

## 2. Security & Access Control

| ID             | Requirement                      | Metric / Constraint                                                                                                                                                            | Linked Epic Requirement       |
| :------------- | :------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------- |
| **NFR-SEC-01** | **Session Management**           | User sessions must rely **exclusively on Azure AD** OAuth 2.0 tokens; local session timeouts must align strictly with Azure AD policies (typically 1 hour).                    | [REQ-FND-1.1]                 |
| **NFR-SEC-02** | **Role-Based Access (RBAC)**     | Enforce strict endpoint routing security. Users attempting to access an unauthorized API route via Postman/Browser must receive a `403 Forbidden` response.                    | [REQ-FND-1.4]                 |
| **NFR-SEC-03** | **Data Encryption (At Rest)**    | Encrypt **Financial Fields** (Purchase Cost), **Software License Keys**, and **API Auth Tokens** in the database using AES-256 via a secure Key Vault.                         | [REQ-FND-1.3], [REQ-FND-1.13] |
| **NFR-SEC-04** | **Data Encryption (In Transit)** | Secure all system traffic, especially login and external API calls, enforcing HTTPS/TLS 1.2+ minimum.                                                                          | [REQ-FND-1.2]                 |
| **NFR-SEC-05** | **Audit Log Immutability**       | History logs must be WORM (Write Once, Read Many). The database user executing application logic must strictly lack `UPDATE` or `DELETE` permissions on the `AuditLogs` table. | [REQ-FND-1.11]                |
| **NFR-SEC-06** | **Client IP Tracking**           | The backend must evaluate the `X-Forwarded-For` HTTP header to accurately capture the true origin IP address of the user for the immutable Audit Log.                          | [REQ-FND-1.11]                |
| **NFR-SEC-07** | **Soft-Delete Enforcement**      | Disposed/Deleted assets must be structurally blocked from being altered. `PUT/PATCH` API requests targeting an asset with `Status=Disposed` must be rejected.                  | [REQ-DSP-4.8]                 |

## 3. Reliability & Data Integrity

| ID             | Requirement                 | Metric / Constraint                                                                                                                                                                                          | Linked Epic Requirement |
| :------------- | :-------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------- |
| **NFR-REL-01** | **Availability**            | Provide **99.9% uptime** during business hours (8 AM – 6 PM local time) to support mission-critical check-in/out operations.                                                                                 | General                 |
| **NFR-REL-02** | **Backup & Recovery**       | Run full database backups daily with an **RPO (Recovery Point Objective) of 24 hours** and **RTO (Recovery Time Objective) of 4 hours**.                                                                     | General                 |
| **NFR-REL-03** | **Bulk Import Resilience**  | The system must support **"Partial Success" processing**. Valid CSV/Excel rows must be imported while invalid rows are skipped and reported; the entire transaction must not fail due to a single row error. | [REQ-REG-2.10]          |
| **NFR-REL-04** | **Currency Precision**      | Financial calculations must store original currency values and precise floating points/decimals to prevent rounding errors in the Straight-Line Depreciation math.                                           | [REQ-REG-2.2]           |
| **NFR-REL-05** | **Network Retry Logic**     | CRON jobs, Outbound Webhooks, and SMTP Email dispatchers must implement **Exponential Backoff** logic to automatically retry failed requests if the target server is temporarily unavailable.                | [REQ-FIN-5.9]           |
| **NFR-REL-06** | **Data Retention (7-Year)** | AWS S3/Azure Blob storage buckets hosting E-Waste Certificates of Destruction must be configured with retention policies to prevent file deletion for a minimum of **7 years** to satisfy tax compliance.    | [REQ-DSP-4.8]           |

## 4. Usability & User Experience

| ID             | Requirement               | Metric / Constraint                                                                                                                                                                                  | Linked Epic Requirement |
| :------------- | :------------------------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------- |
| **NFR-USE-01** | **Mobile PWA Standard**   | The "Employee View" and "HTML5 Mobile Scanner" must be fully responsive and accessible via standard mobile browsers (Safari/Chrome) without requiring native iOS/Android App Store installation.     | [REQ-REG-2.13]          |
| **NFR-USE-02** | **Graceful Mobile Gates** | If a mobile user attempts to navigate to a complex desktop-only view (like the High-Density Data Grid), they must be presented with a clean "Empty State" UI card instructing them to use a desktop. | [REQ-REG-2.15]          |
| **NFR-USE-03** | **Scan Interaction**      | The mobile scanning interface must utilize the `navigator.vibrate` API to provide **haptic feedback** (or an audio cue) upon a successful QR/Barcode read.                                           | [REQ-REG-2.13]          |
| **NFR-USE-04** | **Error Clarity**         | Error messages must clearly state the cause and the actionable next step (e.g., "Serial 123 already exists for Asset ID AST-456. Please review the existing asset.").                                | General                 |
| **NFR-USE-05** | **Keyboard Navigation**   | High-volume data entry screens (like the Dynamic Asset Registration Form) must support full keyboard navigation (Tab-to-next-field, Enter-to-Submit).                                                | [REQ-REG-2.1]           |
