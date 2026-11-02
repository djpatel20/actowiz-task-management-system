---
trigger: always_on
description: Functional four-column Kanban board, drag-and-drop behavior, role restrictions, and error recovery.
---

# Functional Kanban Board

## Required Columns

The board has exactly four workflow columns:

1. To Do (TODO)
2. In Progress (IN_PROGRESS)
3. In Review (IN_REVIEW)
4. Done (DONE)

Tasks and column counts must come from the backend, not hardcoded sample data.

## Drag and Drop

- Use @dnd-kit/core and related packages unless an existing suitable library is already installed.
- Implement real drag-and-drop between columns.
- Persist each valid move through the backend status API.
- Do not update the database directly from the frontend.
- Show a pending state while a move is being saved.
- If the API rejects a move, restore the card to its previous column and show a useful error.
- Prevent duplicate submissions while a card update is pending.
- Support keyboard interaction and a non-drag status-change control for accessibility.
- Do not add elaborate drag animations that make the board feel slow.

## Role-Aware Board Data and Actions

### Employee
- Board contains only tasks assigned to the logged-in employee.
- Employee can move TODO to IN_PROGRESS.
- Employee can move IN_PROGRESS to IN_REVIEW.
- Employee cannot move tasks into DONE.
- Employee cannot move tasks backwards.

### Manager
- Board contains only tasks belonging to the manager's own team.
- Manager can approve tasks in IN_REVIEW.
- Manager can reject tasks in IN_REVIEW to IN_PROGRESS.
- Rejection must require a reason.
- Manager can manage task assignments within their team.

### Admin
- Board can contain tasks across teams.
- Admin can filter by team.
- Admin can manage all valid workflow transitions.

Show only actions the current role can perform, but always rely on backend authorization.

## Task Cards

Show:

- Task title.
- Project name.
- Priority.
- Assignee initials/avatar.
- Due date.
- Overdue indicator.
- Optional small comment/activity indicator if useful.

Keep cards compact and readable. Do not overload cards with every task field.

Clicking a card should open a task details drawer or page.

## Filters and Search

Provide:

- Search by title.
- Filter by project.
- Filter by priority.
- Filter by assignee where permitted.
- Filter by overdue status.

Filters must not widen the user's server-side access scope.

Use URL query parameters where practical so views can be refreshed/shared.

## Board UX

- Display task counts in each column.
- Provide useful empty states.
- Provide loading skeletons.
- Provide an error/retry state.
- Highlight overdue tasks without relying on color alone.
- Keep the board usable on tablet/mobile.
- Horizontal column scrolling is acceptable on small screens.
- Ensure focus states and accessible labels.

## State Management

Use TanStack Query for server state.

Invalidate or update relevant task and dashboard queries after mutations.

If optimistic updates are used, implement rollback on failure.

Never let optimistic UI make an unauthorized transition appear permanently successful.

## Testing

Test:

- Successful transitions.
- Rejected transitions for each role.
- Cross-team isolation.
- Rollback on API failure.
- Board filtering.

A visually draggable board without persisted status updates is not complete.
