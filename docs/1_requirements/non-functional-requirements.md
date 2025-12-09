## Non-Functional Requirements

| ID     | Requirement                      | Metric / Constraint                                                                                                              | Linked Story     |
| ------ | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| NFR-1  | Scan Response Time               | The system must retrieve and display asset details within 1 second of a barcode scan to ensure efficient physical auditing.      | [AR-14], [AR-21] |
| NFR-2  | Search Latency                   | General search results (filtering by ID, Name, or Serial) must load within 2 seconds for a database of up to 100,000 assets.     | [AR-11], [AR-24] |
| NFR-3  | Bulk Import Processing           | The system must validate and process a bulk import file (CSV/Excel) within 3 minutes.                                            | [AR-4]           |
| NFR-4  | Concurrent Users                 | The system must support at least 50 concurrent users (e.g., multiple auditors and managers) without performance degradation.     | General          |
| NFR-5  | Report Generation                | Complex export reports (e.g., full compliance audit lists) must generate and start downloading within 10 seconds.                | [AR-12]          |
| NFR-6  | Role-Based Access Control (RBAC) | Enforce strict role separation: only "Finance" roles can view Cost/Depreciation fields; only "Admins" can edit Categories.       | [AR-6], [AR-10]  |
| NFR-7  | Data Encryption (At Rest)        | Encrypt all sensitive financial data (Purchase Cost, License Keys) and PII (Employee Data) in the database using AES-256.        | [AR-2], [AR-3]   |
| NFR-8  | Data Encryption (In Transit)     | Secure all system traffic, especially login and mobile scanner APIs, via HTTPS/TLS 1.2+.                                         | [AR-21]          |
| NFR-9  | Audit Log Immutability           | Custody History logs must be WORM: no user (including Admins) can delete or alter past entries.                                  | [AR-20]          |
| NFR-10 | Session Management               | User sessions, especially for mobile auditors, time out after 30 minutes of inactivity to prevent unauthorized access.           | [AR-21]          |
| NFR-11 | Availability                     | Provide 99.9% availability during business hours (8 AM – 6 PM local time) to support check-in/out operations.                    | [AR-9]           |
| NFR-12 | Backup & Recovery                | Run full database backups daily with RPO of 24 hours and RTO of 4 hours.                                                         | General          |
| NFR-13 | Mobile Responsiveness            | Ensure "Audit Mode" and "Barcode Search" UIs are fully responsive on standard mobile viewports (iOS/Android tablets and phones). | [AR-21], [AR-14] |
| NFR-14 | Scan Interaction                 | Mobile scanning interface provides haptic feedback or an audio cue upon successful scans so users need not view the screen.      | [AR-21]          |
| NFR-15 | Error Clarity                    | Error messages (e.g., Duplicate Serial Number) must clearly state the cause and actionable next step, not generic system errors. | [AR-16]          |
| NFR-16 | Keyboard Navigation              | High-volume data entry screens (e.g., New Asset Registration) must support full keyboard navigation (Tab-to-next-field).         | [AR-1]           |
