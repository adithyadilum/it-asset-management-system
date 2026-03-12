# Requirements

## Overview

This section contains all requirements documentation for the **IDAMS (IT Asset Management System)**. Documents progress from initial stakeholder elicitation through to formal specifications and detailed user story breakdowns across 5 functional modules containing 23 individual Epics.

## Documents

| Document                                                           | Description                                                                                          | Status     |
| :----------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------- | :--------- |
| [Elicitation Questions & Answers](./elicitation-questions.md)      | Initial stakeholder questions and answers that defined the project scope and constraints.            | **Done**   |
| [Functional Requirements](./functional-requirements.md)            | Formal requirement statements across 5 modules (REQ-FND, REQ-REG, REQ-OPS, REQ-DSP, REQ-FIN).       | **Done**   |
| [Non-Functional Requirements](./non-functional-requirements.md)    | Performance, Security, Reliability, and Usability constraints (NFR-PERF, NFR-SEC, NFR-REL, NFR-USE). | **Done**   |
| [User Journeys](./user-journeys.md)                                | 23 end-to-end workflows mapped by persona with cross-handoff matrix and error catalogue.             | **Done**   |
| [Software Requirements Specification (SRS)](./SRS.md)              | IEEE 830-style SRS consolidating scope, interfaces, functional/NFR specs, and data dictionary.       | **Review** |
| [Product Backlog](./product-backlog.md)                            | Consolidated task-level backlog (540 tasks) from all 5 module user story specifications.             | **Done**   |
| [Detailed User Story Specifications](./user-story-specs/README.md) | Expanded User Stories with Acceptance Criteria, wireframe references, and diagrams per Epic.         | **Done**   |

## Module & Epic Structure

| Module | Name                                   | Epics       | Requirement Prefix |
| :----- | :------------------------------------- | :---------- | :----------------- |
| 1      | Core Platform & API Gateway            | 1 → 6       | `REQ-FND-1.x`     |
| 2      | Asset Registry & Onboarding            | 7 → 12      | `REQ-REG-2.x`     |
| 3      | Operations & Lifecycle Management      | 13 → 16     | `REQ-OPS-3.x`     |
| 4      | Secure Disposal & Compliance           | 17 → 19     | `REQ-DSP-4.x`     |
| 5      | Financial Analytics & Automation       | 20 → 23     | `REQ-FIN-5.x`     |

> See [User Story Specifications](./user-story-specs/README.md) for the full breakdown of all 23 Epics with direct links to each file.

---

[< Back to Docs](../README.md) · [< Back to Root](../../README.md)
