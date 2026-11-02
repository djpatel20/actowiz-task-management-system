---
trigger: always_on
description: Express API, Mongoose models, validation, service/controller boundaries, error handling, and testing conventions.
---

# Backend Guidelines

## Express Structure

- Keep route definitions, controllers, services, validation schemas, and models separated by feature.
- Routes define HTTP paths and middleware.
- Controllers parse validated input and map service results to HTTP responses.
- Services contain business rules and database orchestration.
- Middleware handles authentication, request context, and reusable checks.
- Avoid putting business logic directly in route handlers.

## API Conventions

- Use RESTful resource paths under /api.
- Use consistent JSON response and error shapes.
- Use correct HTTP methods and status codes.
- Use pagination for list endpoints.
- Validate page and limit bounds.
- Never expose raw database errors or stack traces to clients.
- Do not accept arbitrary Mongo query objects from the client.

## Validation

- Validate request params, query, and body with Zod.
- Define allowed fields for create/update operations.
- Reject unknown or invalid enum values.
- Validate Mongo ObjectIds before querying.
- Normalize and validate email addresses.
- Limit user-controlled string lengths and payload sizes.

## Mongoose

- Define explicit schemas, enums, defaults, timestamps, and references.
- Add indexes for common access patterns after checking actual queries.
- Use select() or serialization transforms to exclude sensitive fields.
- Avoid returning password hashes.
- Avoid unbounded population.
- Populate only fields needed by the response.
- Use safe update allowlists rather than passing request bodies directly to model updates.

## Authentication and Authorization

Use the security and RBAC rules in:

- 02-security.md
- 03-rbac-permissions.md

Create reusable authenticate and role checks, plus resource-aware service checks.

Verify active status and resource ownership on every protected operation.

Do not rely on role names or IDs sent by the browser.

## Task Service

All task creation, assignment, editing, and status changes must validate:

- Project consistency.
- Team consistency.
- Assignee consistency.

All status changes must go through the centralized workflow service and create activity records.

Do not allow clients to write activity history.

## Error Handling and Logging

- Use centralized Express error handling.
- Distinguish validation, authentication, authorization, not-found, and conflict errors.
- Log useful server-side diagnostic details without logging passwords, tokens, or sensitive personal data.
- Do not swallow errors silently.

## Tests

Use unit tests for service rules and integration tests for endpoints.

Cover:

- Login and protected routes.
- Admin, Manager, and Employee permissions.
- Cross-team and unassigned-task access attempts.
- Invalid task transitions.
- Missing rejection reason.
- Task/project/team/assignee consistency.
- Activity creation on important changes.
- Pagination and filters.
