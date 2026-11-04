# Actowiz Task Management System

A role-based, CRM-style task management web application built for Actowiz teams following strict Role-Based Access Control (RBAC), centralized status workflow enforcement, real-time WebSocket communication, and Editorial Minimalism design standards.

---

## 1. System Overview & Roles

The system enforces three distinct user roles:

1. **Admin**: Global system oversight. Manages users, teams, and assignments; views company-wide projects and tasks; reviews/approves any task; global CSV export and attachment access.
2. **Manager**: Scoped strictly to their single team. Manages team projects and tasks, assigns work to team employees, reviews submitted tasks (`IN_REVIEW -> DONE` or rejects back to `IN_PROGRESS` with a mandatory reason), exports team CSV.
3. **Employee**: Scoped strictly to assigned tasks. Progresses assigned tasks (`TODO -> IN_PROGRESS -> IN_REVIEW`), adds comments, uploads attachments, and exports personal assigned tasks. Cannot mark tasks `DONE`.

Workflow: `TODO -> IN_PROGRESS -> IN_REVIEW -> DONE` (Terminal).

---

## 2. Core & Mandatory Deliverables

All former bonus features are **MANDATORY** core requirements:

1. **Role-Based Access Control (RBAC)**: Strict server-side enforcement, zero client trust, team scoping, and IDOR prevention.
2. **Centralized Task Workflow & OCC**: Atomic MongoDB transactions for task mutations and activity logging; optimistic concurrency control via document `__v`.
3. **Functional 4-Column Kanban Board**: Powered by `@dnd-kit` with persisted status transitions, optimistic updates, rollback on error, and accessible keyboard alternatives.
4. **Real-Time Notifications (Socket.IO)**: Cookie-authenticated WebSocket connection, isolated user rooms (`user:${userId}`), post-commit event emissions, and offline sync via MongoDB persistence.
5. **Task File Attachments**: Upload, view, download, and delete attachments (max 10MB) with true binary magic-bytes validation (preventing disguised executables) and role-scoped permissions.
6. **CSV Export**: Role-scoped task export (`/api/tasks/export/csv`) with spreadsheet formula injection defense (sanitizing `=`, `+`, `-`, `@`, `\t`, `\r`).
7. **Automated Testing Suite**: Full integration test suite with Supertest covering authentication, RBAC, workflow state machine, OCC concurrency, attachments, and CSV exports.
8. **Docker Containerization**: Multi-stage `Dockerfile` for frontend and backend, with `docker-compose.yml` orchestrating client, server, and persistent MongoDB.
9. **Live Cloud Deployment**: Publicly accessible deployment on cloud infrastructure with production cookies, CORS, and Socket.IO.

---

## 3. Seed Credentials (Local Development Only)

> [!CAUTION]
> These credentials are for local development and demonstration only. Change all passwords in staging/production environments.

| Role | Name | Email | Password | Team Assignment |
|---|---|---|---|---|
| **Admin** | Sarah Admin | `admin@actowiz.com` | `AdminPass123!` | Global (All Teams) |
| **Manager** | Alex River | `manager.alpha@actowiz.com` | `ManagerPass123!` | Team Alpha (Engineering) |
| **Manager** | Marcus Vance | `manager.beta@actowiz.com` | `ManagerPass123!` | Team Beta (Design & Research) |
| **Employee** | Elena Rostova | `elena@actowiz.com` | `EmployeePass123!` | Team Alpha |
| **Employee** | David Kim | `david@actowiz.com` | `EmployeePass123!` | Team Alpha |
| **Employee** | Maya Patel | `maya@actowiz.com` | `EmployeePass123!` | Team Beta |

---

## 4. Environment Variables

Create `.env` inside `server/`:

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb://localhost:27017/actowiz_task_manager
JWT_ACCESS_SECRET=your_jwt_access_secret_key_min_32_chars_123456
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_min_32_chars_123456
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
COOKIE_DOMAIN=localhost
```

Create `.env` inside `client/`:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

---

## 5. Getting Started & Run Commands

### Option A: Local Development (Node.js & MongoDB)

#### Backend Setup
```bash
cd server
npm install
npm run seed       # Seeds 1 Admin, 2 Managers, 3 Employees, sample projects & tasks
npm run dev        # Starts Express & Socket.IO API at http://localhost:5000
npm test           # Runs Supertest integration test suite
```

#### Frontend Setup
```bash
cd client
npm install
npm run dev        # Starts Vite dev server at http://localhost:5173
npm run build      # Verifies TypeScript types and builds production bundle
```

### Option B: Docker Containerization

Run the entire application stack (frontend, backend, and MongoDB with persistent volume) in Docker:

```bash
# Build and launch all services in detached mode
docker compose up --build -d

# Seed the containerized database (or run `npm run docker:seed` from host)
docker compose exec server node dist/scripts/seed.js

# View logs
docker compose logs -f

# Shutdown
docker compose down
```

The application will be accessible at:
- **Frontend**: `http://localhost:80` (or `http://localhost:5173` if running dev)
- **Backend API**: `http://localhost:5000/api`
- **Socket.IO**: `ws://localhost:5000`

---

## 6. Architecture & Planning Documentation

Complete technical specifications are located in [`docs/`](./docs/):
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md): Module boundaries, Socket.IO architecture, file uploads, CSV export, Docker topology.
- [`docs/DATABASE.md`](./docs/DATABASE.md): Mongoose schemas, relationships, indexes, deduplication strategy.
- [`docs/RBAC.md`](./docs/RBAC.md): Permission matrix, team scoping, IDOR prevention, export permissions.
- [`docs/TASK-WORKFLOW.md`](./docs/TASK-WORKFLOW.md): State machine, OCC concurrency, review rejection protocol, atomic sessions.
- [`docs/API.md`](./docs/API.md): Endpoint list, query filters, request/response contracts, Socket.IO events.
- [`docs/DESIGN-SYSTEM.md`](./docs/DESIGN-SYSTEM.md): Editorial Minimalism tokens, typography, responsive breakpoints.

---

## 7. Live Deployed URL

- **Production Frontend**: `[Live Deployed URL - To be inserted upon deployment]`
- **Production Backend API**: `[Live Deployed API URL - To be inserted upon deployment]`
