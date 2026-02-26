# Requirements

## Overview

This section contains all requirements documentation for the **IDAMS (IT Asset Management System)**. Documents progress from initial stakeholder elicitation through to formal specifications and detailed user story breakdowns across 5 architectural Epics.

## Documents

| Document                                                           | Description                                                                                          | Status     |
| :----------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------- | :--------- |
| [Elicitation Questions & Answers](./elicitation-questions.md)      | Initial stakeholder questions and answers that defined the project scope and constraints.            | **Done**   |
| [Functional Requirements](./functional-requirements.md)            | Formal requirement statements across 5 Epics (REQ-FND, REQ-REG, REQ-OPS, REQ-DSP, REQ-FIN).          | **Done**   |
| [Non-Functional Requirements](./non-functional-requirements.md)    | Performance, Security, Reliability, and Usability constraints (NFR-PERF, NFR-SEC, NFR-REL, NFR-USE). | **Done**   |
| [User Journeys](./user-journeys.md)                                | 23 end-to-end workflows mapped by persona with cross-handoff matrix and error catalogue.             | **Done**   |
| [Software Requirements Specification (SRS)](./SRS.md)              | IEEE 830-style SRS consolidating scope, interfaces, functional/NFR specs, and data dictionary.       | **Review** |
| [Detailed User Story Specifications](./user-story-specs/README.md) | Expanded User Stories with Acceptance Criteria, wireframe references, and diagrams per Epic.         | **Done**   |

## Epic Structure

| Epic | Name                                           | Requirement Prefix | Stories         |
| :--- | :--------------------------------------------- | :----------------- | :-------------- |
| 1    | Platform Foundation, Master Data & API Gateway | `REQ-FND-1.x`      | US-1.1 → US-1.5 |
| 2    | Asset Registry & Tethered Scanning             | `REQ-REG-2.x`      | US-2.1 → US-2.4 |
| 3    | IT Operations & Hardware Maintenance           | `REQ-OPS-3.x`      | US-3.1 → US-3.4 |
| 4    | Compliance-Driven Disposals                    | `REQ-DSP-4.x`      | US-4.1 → US-4.3 |
| 5    | Financial Intelligence & Automated Alerts      | `REQ-FIN-5.x`      | US-5.1 → US-5.3 |

---

[< Back to Docs](../README.md) · [< Back to Root](../../README.md)
