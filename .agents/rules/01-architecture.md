---
trigger: always_on
description: Project architecture, technology choices, module boundaries, and implementation discipline.
---

# Architecture Rules

## Architecture Style

Use a modular monolith.

Keep one frontend and one backend.

Do not introduce microservices for this assignment.

## Suggested Repository Structure

client/
  src/
    app/
    components/
    features/
      auth/
      dashboard/
      users/
      teams/
      projects/
      tasks/
      kanban/
      comments/
      notifications/
    hooks/
    lib/
    routes/
    types/

server/
  src/
    config/
    middleware/
    modules/
      auth/
      users/
      teams/
      projects/
      tasks/
      comments/
      activity/
      notifications/
      dashboard/
    shared/
    utils/
    app.ts
    server.ts

docs/

Adapt this to the existing repository rather than moving files unnecessarily.

## Backend Module Boundaries

Each feature module should own its:

- Routes
- Controller
- Service
- Validation schema
- Model where appropriate

Controllers handle HTTP concerns.

Services contain business logic.

Models define persistence.

Middleware handles authentication and reusable authorization checks.

## Frontend Boundaries

Organize by feature.

Keep:

- API calls in feature API/service files.
- Server state in TanStack Query.
- Reusable UI in shared components.
- Route protection in route/layout components.

Do not put all application state in one global store.

## Data Model Baseline

Use these entities:

- User
- Team
- Project
- Task
- Comment
- Activity
- Notification

A Team has a Manager and Employees.

A Project belongs to one Team.

A Task belongs to one Project and Team and is assigned to one Employee.

Comments and Activity belong to a Task.

Notifications belong to a User.

Store teamId on Task for efficient authorization, but always validate it matches project.teamId.

Validate that assigneeId is an active Employee in that same team.

## Engineering Discipline

- Prefer simple, explicit code over clever abstractions.
- Use TypeScript types for API contracts and domain entities.
- Keep shared enums/constants in one place.
- Avoid circular imports.
- Avoid any; if unavoidable, isolate it and explain why.
- Do not duplicate workflow or permission logic in controllers.
- Do not create fake API responses or hardcoded production data.
- Add database indexes for common filters and lookups.
- Use pagination for potentially large lists.
- Use transactions only where supported and necessary.

## Change Management

Before implementation, inspect the repository and report the plan.

After each feature, run typecheck, tests, and build where available.

Update docs when architecture or API changes.
