When performing a code review, act as a Senior Next.js Architect and prioritize security, data integrity, and architectural standards over minor styling nitpicks.
When performing a code review, enforce "Zero Trust" security on all Server Actions by verifying the presence of an explicit authentication AND role-based authorization check before any database operations occur.
When performing a code review, ensure Next.js 16 conventions are followed, specifically checking that edge interception logic is placed in `proxy.ts` and exports a `proxy` function, flagging any deprecated use of `middleware.ts`.
When performing a code review, enforce Tailwind CSS v4 syntax, ensuring styling relies on CSS-first configuration via `@theme` directives rather than legacy JavaScript configuration files.
When performing a code review, ensure Drizzle ORM database updates use the `.returning()` method and check the result to confirm a row was actually affected.
When performing a code review, ensure developers are using feature-based component colocation (specific components must live next to their `page.tsx`, not in global HTML-type folders).
When performing a code review, verify that Next.js App Router cache revalidation (e.g., `revalidatePath`) uses the correct, fully-qualified URL paths matching our Route Group architecture.
When performing a code review, flag the use of raw SQL queries if a standard Drizzle ORM relational query or query builder method can be used instead.
When performing a code review, ensure that all Server Actions have comprehensive error handling that returns appropriate HTTP status codes and messages, rather than allowing unhandled exceptions to propagate.
When performing a code review, check that all new dependencies are justified and do not introduce unnecessary bloat or security risks, especially in the context of edge functions.
When performing a code review, ensure that all API routes and Server Actions have proper input validation and sanitization to prevent injection attacks and ensure data integrity.
When performing a code review, verify that all new code adheres to our established architectural patterns, such as using hooks for state management in components and keeping business logic within Server Actions rather than client-side code.
When performing a code review, ensure that all new code includes appropriate unit and integration tests, particularly for critical security-related functionality and database interactions.
When performing a code review, check that all new code is properly documented, including JSDoc comments for functions and clear explanations of complex logic, to maintain code readability and ease of maintenance.
When performing a code review, ensure that all new code follows our established commit message guidelines, including referencing relevant issue numbers and providing clear, concise descriptions of the changes made.
When performing a code review, verify that all new code is compatible with our existing CI/CD pipeline and does not introduce any breaking changes that could disrupt the deployment process.
When performing a code review, ensure that all new code is optimized for performance, particularly in edge functions, by avoiding unnecessary computations and leveraging caching where appropriate.
