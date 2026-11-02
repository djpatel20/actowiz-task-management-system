---
trigger: always_on
description: Exact Admin, Manager, and Employee permissions and team/resource authorization rules.
---

# Role-Based Access Control

## Roles

### Admin

- Create, view, update, and deactivate users.
- Create and manage teams.
- Assign Managers and Employees to teams.
- View and manage all projects and tasks across teams.
- Review and mark any valid task Done.
- View system-wide activity and dashboard information.

### Manager

- View and manage only their own team's projects and tasks.
- Create projects for their own team.
- Create tasks within their team's projects.
- Assign or reassign tasks only to active Employees in their own team.
- Edit task details for their own team's tasks.
- Review tasks in IN_REVIEW.
- Approve tasks to DONE.
- Reject tasks to IN_PROGRESS with a reason.
- Cannot manage users or teams globally.
- Cannot view or modify another team's resources.

### Employee

- View only tasks assigned to the authenticated Employee.
- View permitted project context for those assigned tasks.
- Move an assigned task from TODO to IN_PROGRESS.
- Move an assigned task from IN_PROGRESS to IN_REVIEW.
- Add comments to assigned tasks.
- Cannot create projects.
- Cannot assign or reassign tasks.
- Cannot edit protected task details.
- Cannot mark tasks Done.
- Cannot view another employee's unassigned tasks or another team's data.

## Authorization Matrix

| Operation | Admin | Manager | Employee |
|---|---|---|---|
| Manage users/teams | All | No | No |
| View projects | All | Own team | Assigned-task context |
| Create project | All teams | Own team | No |
| Create task | All teams | Own team | No |
| View tasks | All | Own team | Assigned only |
| Edit task details | All | Own team | No |
| Assign/reassign | All | Own team members | No |
| Start task | Yes | Yes | Assigned task only |
| Submit for review | Yes | Yes | Assigned task only |
| Approve to Done | Yes | Own team | No |
| Reject review | Yes | Own team | No |
| Comment | Yes | Own team | Assigned task only |
| View activity | All | Own team | Assigned task only |

## Mandatory Authorization Checks

1. Derive user identity and role from the authenticated server-side session/token, never from request body.
2. For Manager operations, compare the manager's team assignment with the resource's team.
3. For Employee operations, compare the authenticated user ID with task.assigneeId.
4. Confirm task.teamId equals project.teamId.
5. Confirm the assignee is an active Employee in the same team.
6. Check authorization separately for each operation.
7. A user allowed to view a task is not automatically allowed to edit or transition it.
8. Apply the same checks to list, detail, update, status, comment, activity, and attachment endpoints.
9. Do not leak whether a cross-team resource exists. Return a consistent not-found or forbidden response according to the API's chosen policy.

Implement reusable middleware/helpers, but keep resource-specific checks in services where the resource must first be loaded.

Test all three roles and cross-team attempts.
