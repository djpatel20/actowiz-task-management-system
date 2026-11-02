# Role-Based Access Control (RBAC) Specification

## 1. Roles & Scope

The system implements three mutually exclusive user roles with strict server-enforced boundaries:

1. **Admin (`ADMIN`)**:
   - Organization-wide visibility and administrative authority.
   - Manages all users (create, update, activate, deactivate).
   - Manages all teams (create, update, assign 1:1 Manager).
   - Manages all projects and tasks across all teams.
   - Holds global review authority over tasks in `IN_REVIEW` (approve to `DONE` or reject to `IN_PROGRESS`).
   - Retains administrative progression override capability (`TODO -> IN_PROGRESS`, `IN_PROGRESS -> IN_REVIEW`) on behalf of employees, which is explicitly audited with `isOverride: true`.
   - Has global CSV export and attachment access across all teams.
   - Accesses system-wide audit logs and dashboard analytics.

2. **Manager (`MANAGER`)**:
   - Scoped strictly to their single assigned team (`user.teamId`).
   - Manages projects within their own team.
   - Manages tasks within their team's projects.
   - Assigns or reassigns tasks **only** to active Employees belonging to their team.
   - Holds team review authority over tasks in `IN_REVIEW`: approves to `DONE` or rejects back to `IN_PROGRESS` with a mandatory trimmed reason (min 5 chars).
   - Retains managerial progression override capability (`TODO -> IN_PROGRESS`, `IN_PROGRESS -> IN_REVIEW`) for tasks within their team, explicitly audited with `isOverride: true`.
   - Can export CSV and manage attachments strictly for tasks belonging to their team.
   - Cannot view, modify, or assign work across other teams.
   - Cannot manage system users or global teams.

3. **Employee (`EMPLOYEE`)**:
   - Scoped strictly to tasks assigned directly to them (`task.assigneeId === user._id`).
   - Performs normal day-to-day progression of assigned tasks:
     - `TODO -> IN_PROGRESS` (Start task)
     - `IN_PROGRESS -> IN_REVIEW` (Submit for review)
   - Can view the project context of their assigned tasks.
   - Can add comments and upload attachments to assigned tasks.
   - Can delete **only** attachments they personally uploaded.
   - Can export CSV strictly containing their own assigned tasks.
   - **Prohibitions**: Cannot mark a task `DONE`, cannot reject a task, cannot create projects/tasks, cannot reassign tasks, and cannot view or export other employees' tasks.

---

## 2. Granular Permissions Matrix

| Operation | Admin | Manager (Own Team) | Manager (Other Team) | Employee (Assigned Task) | Employee (Other Task) |
|:---|:---:|:---:|:---:|:---:|:---:|
| **Users: Create / Update / Deactivate** | ✅ Yes | ❌ No | ❌ No | ❌ No | ❌ No |
| **Users: List / View Details** | ✅ All | ❌ No (`/api/users` is Admin only) | ❌ No | ❌ No | ❌ No |
| **Current User Profile (`/api/auth/me`)** | ✅ Self | ✅ Self | ✅ Self | ✅ Self | ✅ Self |
| **Teams: Create / Update** | ✅ Yes | ❌ No | ❌ No | ❌ No | ❌ No |
| **Teams: View Details / Members** | ✅ All | ✅ Own Team | ❌ No | ✅ Own Team | ❌ No |
| **Projects: Create** | ✅ All | ✅ Own Team | ❌ No | ❌ No | ❌ No |
| **Projects: View** | ✅ All | ✅ Own Team | ❌ No | ✅ Context of Assigned Tasks | ❌ No |
| **Projects: Update / Archive** | ✅ All | ✅ Own Team | ❌ No | ❌ No | ❌ No |
| **Tasks: Create** | ✅ All | ✅ Own Team | ❌ No | ❌ No | ❌ No |
| **Tasks: View List / Kanban Board** | ✅ All | ✅ Own Team | ❌ No | ✅ Assigned Only | ❌ No |
| **Tasks: View Details** | ✅ All | ✅ Own Team | ❌ No | ✅ Assigned Only | ❌ No |
| **Tasks: Edit Details** | ✅ All | ✅ Own Team | ❌ No | ❌ No | ❌ No |
| **Tasks: Assign / Reassign** | ✅ All | ✅ Team Employees Only | ❌ No | ❌ No | ❌ No |
| **Workflow: TODO → IN_PROGRESS** | ✅ Override (Audited) | ✅ Override (Audited) | ❌ No | ✅ Normal Progression | ❌ No |
| **Workflow: IN_PROGRESS → IN_REVIEW**| ✅ Override (Audited) | ✅ Override (Audited) | ❌ No | ✅ Normal Progression | ❌ No |
| **Workflow: IN_REVIEW → DONE** | ✅ Review Approval | ✅ Review Approval | ❌ No | ❌ No (Cannot approve) | ❌ No |
| **Workflow: IN_REVIEW → IN_PROGRESS (Reject)** | ✅ Review Rejection (With Reason) | ✅ Review Rejection (With Reason) | ❌ No | ❌ No (Cannot reject) | ❌ No |
| **Workflow: Reopen completed task** | ❌ Terminal | ❌ Terminal | ❌ Terminal | ❌ Terminal | ❌ Terminal |
| **CSV Export (`/api/tasks/export/csv`)** | ✅ All / Filtered | ✅ Own Team Only | ❌ No | ✅ Assigned Tasks Only | ❌ No |
| **Attachments: Upload & View** | ✅ All | ✅ Own Team | ❌ No | ✅ Assigned Only | ❌ No |
| **Attachments: Delete** | ✅ All | ✅ Own Team | ❌ No | ✅ Uploaded by Self Only | ❌ No |
| **Comments: Add / View** | ✅ All | ✅ Own Team | ❌ No | ✅ Assigned Only | ❌ No |
| **Activity History: View** | ✅ All | ✅ Own Team | ❌ No | ✅ Assigned Only | ❌ No |
| **Socket.IO Private Room** | `user:${adminId}` | `user:${mgrId}` | ❌ No cross-talk | `user:${empId}` | ❌ No cross-talk |
| **Dashboard Metrics** | ✅ System-wide | ✅ Team-level | ❌ No | ✅ Personal-level | ❌ No |

---

## 3. Enforcement Strategy & Security Principles

### 3.1 Two-Tier Enforcement Architecture
1. **Tier 1: Role-Level Guard (`requireRole`)**
   - Immediate rejection of unauthorized roles at the route handler level before reaching controllers or database queries.
2. **Tier 2: Service-Level Resource Scoping (IDOR Prevention)**
   - Resources loaded inside service methods are validated against the fresh database record:
     - `MANAGER`: Verified against `resource.teamId.equals(req.user.teamId)`.
     - `EMPLOYEE`: Verified against `task.assigneeId.equals(req.user._id)`.
     - Disallowed access responds with `404 Not Found` (anti-enumeration policy).

### 3.2 CSV Export Authorization Scoping
- The CSV export service executes the exact same scoping pipeline as `GET /api/tasks`.
- Manager requests are forcefully scoped to `query.teamId = req.user.teamId`.
- Employee requests are forcefully scoped to `query.assigneeId = req.user._id`.
- Attempts by non-Admins to query other teams are stripped or rejected.

### 3.3 Real-Time WebSocket Isolation
- During the Socket.IO handshake, authenticated sockets join exclusively `user:${user._id}`.
- Cross-user event broadcasts are strictly prohibited.
- When task changes occur, the server emits targeted events strictly to the specific assignee and team manager rooms.
