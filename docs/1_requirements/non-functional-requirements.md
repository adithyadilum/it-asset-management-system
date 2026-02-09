# Non-Functional Requirements

## 1. Performance & Scalability

| ID              | Requirement              | Metric / Constraint                                                                                                                               | Linked Story                  |
| :-------------- | :----------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------ | :---------------------------- |
| **NFR-PERF-01** | **Scan Response Time**   | The system must retrieve and display asset details within **1 second** of a barcode scan to ensure efficient physical auditing.                   | [REQ-REG-1.5]                 |
| **NFR-PERF-02** | **Search Latency**       | General search results (filtering by Status, Department, or Type) must load within **2 seconds** for a database of up to 100,000 assets.          | [REQ-REG-1.5]                 |
| **NFR-PERF-03** | **Report Generation**    | Complex export reports (e.g., full compliance audit lists) must generate and start downloading within **10 seconds**.                             | [REQ-REP-4.2]                 |
| **NFR-PERF-04** | **Notification Latency** | Automated Email/Teams notifications (for assignment returns or warranty alerts) must be dispatched within **60 seconds** of the triggering event. | [REQ-OPS-3.2], [REQ-AUTO-5.2] |
| **NFR-PERF-05** | **Concurrent Users**     | The system must support at least **50 concurrent users** (e.g., multiple auditors and managers) without performance degradation.                  | General                       |

## 2. Security & Access Control

| ID             | Requirement                      | Metric / Constraint                                                                                                                                                                  | Linked Story                 |
| :------------- | :------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------- |
| **NFR-SEC-01** | **Session Management**           | User sessions must rely **exclusively on Azure AD** tokens; local session timeouts must align with Azure AD policies (typically 1 hour).                                             | [REQ-SEC-2.1]                |
| **NFR-SEC-02** | **Role-Based Access (RBAC)**     | Enforce strict role separation: **Department Admins** (e.g., Facilities) must be strictly prevented from modifying assets outside their scope (e.g., IT Hardware) via backend logic. | [REQ-SEC-2.2]                |
| **NFR-SEC-03** | **Data Encryption (At Rest)**    | Encrypt **Financial Fields** (Purchase Cost), **Software License Keys**, and PII (Employee Data) in the database using AES-256.                                                      | [REQ-REG-1.6], [REQ-SEC-2.3] |
| **NFR-SEC-04** | **Data Encryption (In Transit)** | Secure all system traffic, especially login and external API calls, via HTTPS/TLS 1.2+.                                                                                              | [REQ-SEC-2.3]                |
| **NFR-SEC-05** | **Audit Log Immutability**       | Custody History logs must be WORM (Write Once, Read Many): no user (including Global Admins) can delete or alter past entries.                                                       | [REQ-OPS-3.3]                |

## 3. Reliability & Data Integrity

| ID             | Requirement                | Metric / Constraint                                                                                                                                                                                                                         | Linked Story  |
| :------------- | :------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :------------ |
| **NFR-REL-01** | **Availability**           | Provide **99.9% availability** during business hours (8 AM – 6 PM local time) to support check-in/out operations.                                                                                                                           | General       |
| **NFR-REL-02** | **Backup & Recovery**      | Run full database backups daily with **RPO (Recovery Point Objective) of 24 hours** and **RTO (Recovery Time Objective) of 4 hours**.                                                                                                       | General       |
| **NFR-REL-03** | **Bulk Import Resilience** | The system must validate and process a bulk import file within 3 minutes. **Crucially, it must support "Partial Success":** valid rows must be imported while invalid rows are skipped and reported, rather than rejecting the entire file. | [REQ-REG-1.7] |
| **NFR-REL-04** | **Currency Precision**     | Financial calculations must store original currency values (NOK, USD, LKR) and conversion rates to prevent rounding errors in financial reporting.                                                                                          | [REQ-REG-1.6] |

## 4. Usability & User Experience

| ID             | Requirement               | Metric / Constraint                                                                                                                                        | Linked Story   |
| :------------- | :------------------------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------- |
| **NFR-USE-01** | **Mobile Responsiveness** | _(Low Priority)_ Ensure "Employee View" and "Search" UIs are responsive on standard mobile viewports, though offline mode is not required.                 | [REQ-USR-4.3]  |
| **NFR-USE-02** | **Scan Interaction**      | _(Low Priority)_ Mobile scanning interface provides haptic feedback or an audio cue upon successful scans.                                                 | [REQ-AUTO-5.4] |
| **NFR-USE-03** | **Error Clarity**         | Error messages (e.g., Duplicate Serial Number) must clearly state the cause and actionable next step (e.g., "Serial 123 already exists for Asset ID 456"). | [REQ-REG-1.1]  |
| **NFR-USE-04** | **Keyboard Navigation**   | High-volume data entry screens (e.g., New Asset Registration) must support full keyboard navigation (Tab-to-next-field).                                   | [REQ-REG-1.1]  |

---
[< Back to Requirements](./README.md)
