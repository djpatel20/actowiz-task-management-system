# REST API & WebSocket Contract Specification

## 1. Global Standards & Protocols

### Base URL: `/api`

### Security & Headers
- **Authentication**: JWT access token stored in `HttpOnly`, `SameSite: 'lax'` (or `'none'` with `Secure: true` in cross-origin production), `Secure` (production) cookie.
- **CSRF Defense**: All mutating requests (`POST`, `PATCH`, `PUT`, `DELETE`) require the custom header:
  `X-Requested-With: XMLHttpRequest` and undergo strict `Origin` / `Referer` validation.
- **Rate Limiting**:
  - `/api/auth/login`: Max 5 attempts per 15-minute window per IP.
  - `/api/tasks/export/csv`: Max 10 export requests per 10-minute window per user.
  - General API: Max 100 requests per minute per IP.

### Standard Response Envelope
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

### Standard Error Envelope
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request payload",
    "details": [
      {
        "field": "rejectionReason",
        "message": "Rejection reason must be at least 5 characters"
      }
    ]
  }
}
```

---

## 2. Authentication & Session Endpoints

| Method | Path | Access | Description | Error Codes |
|---|---|---|---|---|
| `POST` | `/api/auth/login` | Public | Validates credentials, creates server session, and sets `access_token` and `refresh_token` in HttpOnly cookies. | 400, 401, 429 |
| `POST` | `/api/auth/refresh` | Public (Cookie) | Validates refresh token against MongoDB session, rotates token, sets new cookies. | 401 |
| `POST` | `/api/auth/logout` | Authenticated | Revokes current session in MongoDB, clears auth cookies. | 401 |
| `GET` | `/api/auth/me` | Authenticated | **Canonical profile endpoint**. Returns current user, role, team details, and permissions. | 401 |

---

## 3. Users Management Endpoints (Admin Only)

| Method | Path | Access | Query / Body Params | Description |
|---|---|---|---|---|
| `GET` | `/api/users` | Admin | `page`, `limit`, `role`, `teamId`, `isActive`, `search` | Lists users with pagination and search. |
| `POST` | `/api/users` | Admin | Body: `{ name, email, password, role, teamId? }` | Creates user. If role is MANAGER or EMPLOYEE, teamId is required. |
| `GET` | `/api/users/:id` | Admin | None | Retrieves user profile by ID. |
| `PATCH` | `/api/users/:id` | Admin | Body: `{ name?, email?, role?, teamId? }` | Updates user details or team assignment. |
| `PATCH` | `/api/users/:id/status`| Admin | Body: `{ isActive: boolean }` | Activates/deactivates user. Deactivating revokes all sessions. |

---

## 4. Teams Management Endpoints

| Method | Path | Access | Query / Body Params | Description |
|---|---|---|---|---|
| `GET` | `/api/teams` | Admin, Manager | `page`, `limit`, `search` | Lists teams (Admin sees all; Manager sees own team). |
| `POST` | `/api/teams` | Admin | Body: `{ name, description?, managerId? }` | Creates a team. Enforces 1:1 manager-to-team assignment. |
| `GET` | `/api/teams/:id` | Admin, Team Members | None | Retrieves team details, manager info, and project counts. |
| `PATCH` | `/api/teams/:id` | Admin | Body: `{ name?, description?, managerId? }` | Updates team details or changes assigned manager. |
| `GET` | `/api/teams/:id/members`| Admin, Team Members | `role=EMPLOYEE`, `isActive=true` | Lists active employees available for task assignments. |

---

## 5. Projects Management Endpoints

| Method | Path | Access | Query / Body Params | Description |
|---|---|---|---|---|
| `GET` | `/api/projects` | Admin, Manager, Employee | `page`, `limit`, `teamId`, `status`, `search`, `sortBy`, `sortOrder` | Lists projects (Admin: all; Manager: own team; Employee: assigned task projects). |
| `POST` | `/api/projects` | Admin, Manager | Body: `{ name, description?, client, startDate, endDate, teamId }` | Creates project. Manager teamId must match own team. |
| `GET` | `/api/projects/:id`| Admin, Manager, Employee | None | Returns project details with dynamically aggregated progress %. |
| `PATCH` | `/api/projects/:id`| Admin, Manager | Body: `{ name?, description?, client?, startDate?, endDate?, status? }` | Updates project metadata or marks `status: 'ARCHIVED'`. (Locks child tasks). |

---

## 6. Tasks, Workflow, & CSV Export Endpoints

### 6.1 Task Listing & Filters (`GET /api/tasks`)
Supports Kanban board and filtered list views:
- `page`, `limit` (default: 50 for Kanban)
- `projectId`: Filter by specific project
- `status`: `TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`
- `priority`: `LOW`, `MEDIUM`, `HIGH`, `URGENT`
- `assigneeId`: Filter by employee (Admin / Manager only)
- `overdue`: `true` (filters `dueDate < now` and `status != DONE`)
- `search`: Searches task title and description
- `sortBy`: `dueDate`, `priority`, `createdAt` (default: `createdAt`)
- `sortOrder`: `asc`, `desc`

### 6.2 Task CRUD & Workflow Endpoints
| Method | Path | Access | Description |
|---|---|---|---|
| `GET` | `/api/tasks` | Permitted Roles | Retrieves tasks scoped to role (Admin: all; Manager: own team; Employee: assigned only). |
| `POST` | `/api/tasks` | Admin, Manager | Creates task. Validates `task.teamId === project.teamId`, `assigneeId` is active Employee in team, and project is not archived. |
| `GET` | `/api/tasks/:id` | Permitted Roles | Retrieves task detail with assignee, project, attachments, and `__v`. |
| `PATCH` | `/api/tasks/:id` | Admin, Manager | Edits details (`title`, `description`, `priority`, `dueDate`, `assigneeId`). Validates project is not archived. |
| `PATCH` | `/api/tasks/:id/status` | Permitted Roles | **Centralized status transition**. Body: `{ status, version, rejectionReason? }`. Enforces OCC and state machine inside a MongoDB transaction. |

### 6.3 CSV Export Endpoint (`GET /api/tasks/export/csv`)
- **Access**: Admin (all/team filtered), Manager (own team), Employee (assigned tasks only).
- **Query Params**: `projectId`, `status`, `priority`, `assigneeId`, `overdue`, `startDate`, `endDate`.
- **Response**: `Content-Type: text/csv; charset=utf-8` stream with header `Content-Disposition: attachment; filename="tasks-export-<timestamp>.csv"`.
- **Fields Included**: `Title`, `Project`, `Client`, `Team`, `Assignee`, `Priority`, `Status`, `Due Date`, `Created At`, `Completed At`.
- **Anti-Formula Injection Sanitization**: Prepends `'` to any cell starting with `=`, `+`, `-`, `@`, `\t`, or `\r`.

---

## 7. Task Attachments Endpoints

| Method | Path | Access | Description |
|---|---|---|---|
| `POST` | `/api/tasks/:id/attachments` | Permitted Roles | Uploads file attachment (`multipart/form-data`, field `file`). Max 10MB; validated binary magic bytes (PDF, PNG, JPEG, ZIP, DOCX). Emits `ATTACHMENT_ADDED`. |
| `GET` | `/api/tasks/:id/attachments` | Permitted Roles | Lists attachments metadata for a task. |
| `GET` | `/api/tasks/:id/attachments/:attachmentId/download` | Permitted Roles | Streams file download with sanitized original filename. Validates task access. |
| `DELETE` | `/api/tasks/:id/attachments/:attachmentId` | Admin, Manager, Uploader | Deletes an attachment. Employees can only delete files they uploaded. Emits `ATTACHMENT_DELETED`. |

---

## 8. Comments, Activity, & Notifications Endpoints

| Method | Path | Access | Description |
|---|---|---|---|
| `GET` | `/api/tasks/:id/comments` | Permitted Roles | Retrieves chronologically ordered comment list for a task. |
| `POST` | `/api/tasks/:id/comments` | Permitted Roles | Body: `{ content }`. Adds comment; blocked if project is archived; emits `COMMENT_ADDED` activity and notification. |
| `GET` | `/api/tasks/:id/activity` | Permitted Roles | Retrieves append-only audit trail for a task. |
| `GET` | `/api/notifications` | Authenticated | Lists current user's notifications (`?isRead=false`, `page`, `limit`). |
| `PATCH` | `/api/notifications/:id/read` | Authenticated | Marks a single notification as read. |
| `PATCH` | `/api/notifications/read-all`| Authenticated | Marks all notifications of current user as read. |
| `GET` | `/api/dashboard/stats` | Authenticated | Returns role-tailored aggregated statistics (Open, Overdue, In Review, Done). |

---

## 9. Real-Time Socket.IO Event Contract

### 9.1 Handshake & Authentication
- Socket connects to the server with `withCredentials: true`.
- Authentication middleware reads the `access_token` cookie from the handshake headers.
- Joins private room: `user:${userId}`.

### 9.2 Server -> Client Events (Targeted to `user:${userId}`)
| Event Name | Payload Shape | Trigger / When Sent |
|---|---|---|
| `notification:new` | `{ notification: INotification }` | Emitted immediately post-commit when a new in-app alert is generated for this user. |
| `task:status_changed` | `{ taskId: string, oldStatus: string, newStatus: string, actorId: string, isOverride: boolean }` | Emitted to assignee and team manager when task changes state. |
| `task:assigned` | `{ taskId: string, assigneeId: string, assignedBy: string }` | Emitted to the assigned employee when a task is assigned or reassigned. |
