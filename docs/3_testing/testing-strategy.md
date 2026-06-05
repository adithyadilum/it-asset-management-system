# EITAMS Testing Strategy & Standards

This document outlines the testing philosophy, tools, and standards for the Enterprise IT Asset Management System (EITAMS). We use a hybrid testing approach to balance execution speed with high-confidence browser testing, and we treat our test suites as living, executable documentation.

## 1. The Testing Stack

* **Unit & Component Tests:** [Vitest](https://vitest.dev/) + React Testing Library
* **End-to-End (E2E) Tests:** [Playwright](https://playwright.dev/)

---

## 2. File Naming & Organization (CRITICAL)

Our CI/CD pipeline relies on strict naming conventions to route tests to the correct runner. **Do not mix these up.**

| Test Type | Tool | Extension | Location Strategy |
| :--- | :--- | :--- | :--- |
| **Unit/Component** | Vitest | `.test.ts` / `.tsx` | **Colocated** (Next to the file it tests in `src/`) |
| **End-to-End** | Playwright | `.spec.ts` | **Isolated** (Inside the root `/e2e` folder) |

---

## 3. Rules of Engagement

### A. UI Components
* **Tool:** Vitest
* **Rule:** Test for rendering, accessibility (ARIA roles), and user interactions (clicks, typing). Do not test actual network requests or database connections here.

### B. Server Actions
Server Actions blur the line between frontend and backend. Follow these guidelines:
1.  **Complex Logic / Calculations:** Use **Vitest**. Mock the Drizzle `db` and the NextAuth session.
2.  **Standard CRUD (Create/Update/Delete):** Use **Playwright**. Do not write unit tests for basic database inserts. Instead, write an E2E test that clicks the "Save" button on the UI and verifies the success toast and database update.

### C. End-to-End User Journeys
* **Tool:** Playwright
* **Rule:** Do not log in manually in every test. Playwright is configured with a Global Setup that authenticates with Keycloak once and injects the session cookie into all subsequent tests.

---

## 4. Documentation Standards

In EITAMS, **the code is the documentation.** We actively avoid maintaining external spreadsheets or word documents for individual test cases, as they rapidly become obsolete.

### A. Self-Documenting Tests (Executable Specifications)
Write test descriptions using a behavior-driven pattern. A non-technical product manager should be able to read the test runner output and understand the system's capabilities.

**Bad:**
`it('tests asset assignment', () => { ... })`

**Good:**
`it('prevents a standard Employee from assigning an asset to another user', () => { ... })`

### B. Feature Test Plans
For major new features (e.g., a new "Reporting Dashboard"), developers must outline a high-level Test Plan checklist inside the Jira/Linear ticket or GitHub Pull Request prior to coding. Once the corresponding Playwright tests are merged, the tests become the permanent source of truth.

### C. Exceptions for Manual Documentation
External test documentation is only required for:
1.  **Regulatory Compliance:** Execution logs required by third-party auditors (e.g., SOC2).
2.  **User Acceptance Testing (UAT):** Step-by-step manual scripts handed to non-technical stakeholders or clients for final sign-off before a major release.

---

## 5. Shared Utilities

Do not clutter the `src` directory with fake data. All database mocks, Keycloak session overrides, and dummy JSON payloads must live in the `/test-utils` directory. 

---

## 6. Helpful Commands

* `npm run test` - Runs all Vitest unit/component tests in watch mode.
* `npm run test:ui` - Opens the Vitest visual UI for debugging component tests.
* `npm run e2e` - Runs all Playwright tests in headless mode.
* `npm run e2e:ui` - Opens the Playwright visual debugger and trace viewer.