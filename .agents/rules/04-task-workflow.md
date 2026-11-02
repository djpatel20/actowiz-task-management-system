---
trigger: always_on
description: Task status state machine, manager review/rejection, activity logging, and project progress rules.
---

# Task Workflow Rules

## Status Values

Use stable enum values in the API/database:

- TODO
- IN_PROGRESS
- IN_REVIEW
- DONE

Display labels may be:

- To Do
- In Progress
- In Review
- Done

## Allowed Transitions

- TODO -> IN_PROGRESS
- IN_PROGRESS -> IN_REVIEW
- IN_REVIEW -> DONE (Manager for own team or Admin)
- IN_REVIEW -> IN_PROGRESS (Manager for own team or Admin, with mandatory rejection reason)

Employees may only perform the first two transitions on tasks assigned to them.

Employees cannot skip stages, move backwards, or mark a task Done.

Managers/Admins may perform the valid transitions above. Do not silently permit arbitrary status values or transitions.

## Centralized Transition Service

Implement one backend service method for status changes.

It must:

1. Load the task and related project/team context.
2. Authenticate and authorize the actor for this task and requested operation.
3. Validate the current status and requested next status.
4. Require a non-empty rejection reason for review rejection.
5. Update status and relevant timestamps.
6. Set completedAt when marked Done.
7. Clear completedAt if a completed task is reopened, if reopening is supported.
8. Create a server-generated Activity record with actor, action, task, timestamp, and old/new values.
9. Create relevant notifications.
10. Return the updated task.

Do not duplicate transition logic across route handlers or frontend components.

## Activity Log

Record at least:

- Task created.
- Task details edited.
- Task assigned or reassigned.
- Status changed.
- Review rejected, including reason.
- Comment added.

Activity records are append-only from the application UI.

The client must not be allowed to forge actor IDs or timestamps.

## Project Progress

Calculate progress from tasks:

completed task count / total task count * 100

If a project has zero tasks, progress is 0%.

Define whether archived/deleted tasks count and apply the same rule consistently.

Prefer calculating from current task data rather than maintaining a stale counter.

## Task Validation

- A task must reference an existing project.
- Task teamId must match the project's teamId.
- Assignee must be an active Employee belonging to that team.
- Due date and priority must be validated.
- Priority values: LOW, MEDIUM, HIGH, URGENT.
- Do not let client-supplied fields overwrite createdBy, teamId, or audit fields.

## Review Rejection

When rejecting:

- Require a reason in the API request.
- Store the reason in the activity record.
- Notify the assigned Employee.
- Show the reason in task history/details.
- Move the task back to IN_PROGRESS.

## Error Behavior

Return a clear validation/conflict error for invalid transitions.

The frontend should retain the original status if the server rejects the update.
