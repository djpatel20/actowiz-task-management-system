# Task Manager — Agent Instructions

You are the senior full-stack engineer helping build this assignment. Build a secure, maintainable role-based task management application. Follow the project rules in `.agents/rules/` and all technical specifications in `docs/`.

## Product Goal

Build a CRM-style task manager for a small company with three roles:

- **Admin**: manages users and teams, has system-wide visibility, reviews/approves any task.
- **Manager**: manages projects and tasks for their own team, reviews work (approves to `DONE` or rejects with mandatory reason).
- **Employee**: works only on tasks assigned to them, progresses assigned tasks (`TODO -> IN_PROGRESS -> IN_REVIEW`).

The task workflow is exactly:

`TODO -> IN_PROGRESS -> IN_REVIEW -> DONE` (Terminal)

Managers/Admins may reject an item in review back to `IN_PROGRESS` with a mandatory reason. Employees cannot mark tasks `DONE`.

---

## Mandatory Deliverables (Core & Bonus Features)

All features—including former bonus features—are **MANDATORY** core scope requirements:

1. **Role-Based Access Control (RBAC)**: Strict server-side enforcement. Zero client trust. Cross-team isolation and IDOR prevention.
2. **Centralized Task Workflow & OCC**: Atomic MongoDB transactions for status updates and activity logs. Optimistic Concurrency Control using database-derived state and `__v`.
3. **Functional Kanban Board**: 4 columns (`TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`) powered by `@dnd-kit`. Persists via API, handles optimistic updates, auto-rollback on error, and includes accessible keyboard controls.
4. **Real-Time Notifications (Socket.IO)**: Authenticated Socket.IO connection over HttpOnly cookie/JWT. Private per-user rooms (`user:${userId}`). Emits real-time alerts for assignments, reviews, approvals, rejections, and due-soon warnings. Fully backed by persistent MongoDB notifications for offline sync.
5. **Task File Attachments**: Upload, view, and delete attachments (max 10 MB). Validates actual binary content (magic bytes) to prevent disguised executables. Protected by task-level RBAC (Employees can only delete their own uploaded files).
6. **CSV Export**: Backend endpoint (`/api/tasks/export/csv`) respecting role scoping. Sanitizes fields against CSV formula injection (`=`, `+`, `-`, `@`, `\t`, `\r`).
7. **Automated Testing**: Supertest API integration tests and Vitest unit tests covering auth, RBAC, workflow, rejection reason, terminal DONE, team isolation, concurrent OCC updates, attachment authorization, and CSV export.
8. **Docker & Containerization**: Production-ready multi-stage `client/Dockerfile`, `server/Dockerfile`, and `docker-compose.yml` with persistent MongoDB storage.
9. **Live Deployment**: Deployed public frontend and backend with production database, secure cookies, CORS, and Socket.IO.

---

## Technical Stack

### Frontend
- React 18, Vite, TypeScript
- React Router, Tailwind CSS, Lucide icons
- TanStack Query, Axios
- React Hook Form, Zod
- Drag & Drop: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
- Real-time Client: `socket.io-client`

### Backend
- Node.js, Express, TypeScript
- MongoDB, Mongoose, Zod, bcrypt, JWT
- Real-time Server: `socket.io`
- File Handling: `multer`, `file-type` (magic bytes validation)
- CSV Generation: `fast-csv` or `csv-stringify`
- Security: `helmet`, `cors`, `express-rate-limit`

### DevOps & Testing
- Containerization: Docker, Docker Compose
- API Testing: Supertest
- Unit Testing: Vitest or Jest

---

## Delivery Priorities

- **P0**: Authentication, database models, RBAC, projects, tasks, and centralized task workflow (Atomic transactions + OCC).
- **P1**: Functional Kanban board (@dnd-kit), task comments, activity history, and persistent notifications.
- **P2**: Socket.IO real-time notification delivery, task attachments (binary validation), and CSV export (anti-injection).
- **P3**: Automated test suite (Supertest/Vitest), Docker containerization, and live production deployment.

All P0–P3 items are required for final project completion.

---

## Non-Negotiable Engineering Rules

- Maintain a **modular monolith**; no microservices.
- Enforce authentication and authorization on the backend. Hiding a button is not security.
- Scope Managers to their own team; scope Employees to their assigned tasks.
- Validate that a task's project and team agree, and that the assignee is an active Employee in that team.
- Centralize all status transitions in `TaskWorkflowService`.
- Couple task mutations and `Activity` records inside atomic MongoDB sessions.
- Dispatch notifications post-commit with isolated error handling so failures never roll back valid transitions.
- Validate incoming data with Zod. Never trust role, teamId, createdBy, or actorId from client.
- Use secure HttpOnly, SameSite, Secure cookie handling. Never commit secrets.
