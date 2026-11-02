# System Architecture — Actowiz Task Management System

## 1. Architectural Style & Monolith Boundaries

The Actowiz Task Management System is implemented as a **modular monolith** with two primary workspaces:
- `client/`: Single-Page Application (SPA) built with React 18, Vite, TypeScript, React Router, TanStack Query, Tailwind CSS, `@dnd-kit`, and `socket.io-client`.
- `server/`: RESTful API and WebSocket service built with Node.js, Express, TypeScript, Socket.IO, and MongoDB (via Mongoose).

Distributed microservices and redundant distributed message brokers are strictly avoided. All real-time, file handling, export, and transaction services operate within the single Express + Socket.IO process, backed directly by MongoDB.

```
                      ┌────────────────────────────────────────┐
                      │              Browser / SPA             │
                      │  React + Vite + TanStack Query + dnd   │
                      │  Socket.IO Client (Auto-Reconnect)     │
                      └──────────────────┬─────────────────────┘
                                         │ HTTPS / WSS
                                         │ HttpOnly Cookies (Access & Refresh)
                                         │ Custom Header (X-Requested-With)
                                         ▼
                      ┌────────────────────────────────────────┐
                      │          Express + Socket.IO Server    │
                      │ ┌────────────────────────────────────┐ │
                      │ │ Security: Helmet, CORS, Rate Limit │ │
                      │ │ Handshake Cookie Auth (HTTP & WS)  │ │
                      │ └──────────────────┬─────────────────┘ │
                      │                    ▼                   │
                      │ ┌────────────────────────────────────┐ │
                      │ │ Controllers (Zod Validation)       │ │
                      │ │ Multer + Magic-Bytes Inspection    │ │
                      │ └──────────────────┬─────────────────┘ │
                      │                    ▼                   │
                      │ ┌────────────────────────────────────┐ │
                      │ │ Domain Services:                   │ │
                      │ │ • TaskWorkflowService (OCC + Txn)  │ │
                      │ │ • TeamScopeService / RBAC          │ │
                      │ │ • SocketNotifier (Post-Commit)     │ │
                      │ │ • CsvExportService (Anti-Formula)  │ │
                      │ └──────────────────┬─────────────────┘ │
                      │                    ▼                   │
                      │ ┌────────────────────────────────────┐ │
                      │ │ Mongoose Models (Audited / Indexed)│ │
                      │ └──────────────────┬─────────────────┘ │
                      └────────────────────┼───────────────────┘
                                           │
                                           ▼
                      ┌────────────────────────────────────────┐
                      │             MongoDB Database           │
                      │ (Atomic Sessions for Task & Activity)  │
                      └────────────────────────────────────────┘
```

---

## 2. Directory Structure

### 2.1 Backend (`server/`)
```text
server/
├── src/
│   ├── app.ts                 # Express initialization, security middleware pipeline, error handling
│   ├── server.ts              # HTTP server & Socket.IO initialization, DB connection, scheduler
│   ├── config/
│   │   ├── env.ts             # Zod-validated environment variables
│   │   ├── db.ts              # Mongoose connection & pool settings
│   │   └── constants.ts       # Status, Priority, Role, and Notification enums
│   ├── middleware/
│   │   ├── auth.middleware.ts # JWT verification & user attachment
│   │   ├── activeUser.middleware.ts # Blocks deactivated users on all protected routes
│   │   ├── rbac.middleware.ts # Role guard (requireRole)
│   │   ├── csrf.middleware.ts # Origin/Referer and custom header validation for mutations
│   │   ├── validate.ts        # Zod request validator middleware (body, query, params)
│   │   ├── upload.middleware.ts # Multer config (memory/disk buffer, 10MB limit, magic-bytes check)
│   │   ├── rateLimiter.ts     # Express rate limiters (login, export, general API)
│   │   └── errorHandler.ts    # Centralized Express error handling
│   ├── modules/
│   │   ├── auth/              # Auth & session management
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.schema.ts
│   │   │   └── session.model.ts (RefreshToken with rotation & revocation)
│   │   ├── users/             # User management (Admin only)
│   │   ├── teams/             # Team management (Admin CRUD; Manager read self)
│   │   ├── projects/          # Projects (Admin all, Manager own team, Employee assigned context)
│   │   ├── tasks/             # Task CRUD, Centralized Status Workflow, OCC, Attachments, CSV Export
│   │   │   ├── task.controller.ts
│   │   │   ├── task.service.ts
│   │   │   ├── taskWorkflow.service.ts # Atomic Txn + OCC + Post-commit notifications
│   │   │   ├── taskExport.service.ts   # Sanitized CSV generation & streaming
│   │   │   ├── task.routes.ts
│   │   │   ├── task.schema.ts
│   │   │   └── task.model.ts
│   │   ├── comments/          # Task Comments
│   │   ├── activity/          # Server-generated append-only audit trail
│   │   ├── notifications/     # In-app notifications & due-soon scheduler
│   │   │   ├── notification.controller.ts
│   │   │   ├── notification.service.ts
│   │   │   ├── notification.scheduler.ts # Background job for TASK_DUE_SOON
│   │   │   ├── notification.routes.ts
│   │   │   └── notification.model.ts
│   │   └── dashboard/         # Aggregated metrics for Admin, Manager, Employee
│   ├── socket/
│   │   ├── index.ts           # Socket.IO server initialization & handshake auth
│   │   └── socketEmitter.ts   # Targeted room emitters (user:${userId})
│   ├── shared/
│   │   ├── types/             # Shared TypeScript interfaces
│   │   └── errors/            # AppError, NotFoundError, ForbiddenError, ConflictError
│   └── utils/
│       ├── tokens.ts          # Access & Refresh token signing and hashing
│       ├── cookies.ts         # Secure cookie options helper
│       ├── fileValidator.ts   # Magic-bytes binary content inspection (file-type)
│       ├── csvSanitizer.ts    # Formula injection defense helper
│       └── logger.ts          # Structured logger
├── scripts/
│   └── seed.ts                # Database seeder (1 Admin, 2 Managers, 3 Employees, Projects, Tasks)
├── tests/
│   ├── integration/           # Supertest API tests (RBAC, Workflow, IDOR, Attachments, CSV)
│   └── unit/                  # Service unit tests
├── Dockerfile                 # Multi-stage production container build
├── package.json
└── tsconfig.json
```

### 2.2 Frontend (`client/`)
```text
client/
├── src/
│   ├── app/
│   │   ├── App.tsx            # Root component with QueryClientProvider, AuthProvider, SocketProvider
│   │   ├── routes.tsx         # Role-aware route definitions
│   │   └── main.tsx           # Application entry point
│   ├── components/
│   │   ├── layout/            # AppShell, Sidebar (collapsible), Header, MobileNav
│   │   ├── ui/                # Button, Input, Modal, Drawer, Badge, Table, Tooltip
│   │   └── feedback/          # LoadingSkeleton, EmptyState, ErrorBoundary, Toast
│   ├── features/
│   │   ├── auth/              # LoginPage, AuthContext, useAuth, authApi
│   │   ├── dashboard/         # Admin, Manager, and Employee dashboard metrics
│   │   ├── users/             # Admin User tables & create/edit modals
│   │   ├── teams/             # Team management & member assignment
│   │   ├── projects/          # Project list, client metadata, dates & progress
│   │   ├── tasks/             # Task details drawer, attachments, CSV export trigger, history
│   │   ├── kanban/            # 4-column Board, Column, TaskCard, @dnd-kit logic, Rollback
│   │   ├── comments/          # Task comment list and input form
│   │   └── notifications/     # Real-time drawer, unread counter badge, socket listener
│   ├── hooks/                 # useSocket, useDebounce, useMediaQuery, useKanbanFilters
│   ├── lib/
│   │   ├── axios.ts           # Axios instance with credentials and CSRF custom header
│   │   ├── socket.ts          # Configured Socket.IO client instance with auth
│   │   └── queryClient.ts     # TanStack Query client configuration
│   └── types/                 # Shared TypeScript domain contracts
├── Dockerfile                 # Multi-stage production container build (Nginx)
├── index.html
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## 3. Real-Time Socket.IO Architecture

1. **Server Initialization**: Socket.IO binds directly to the HTTP server created by Express in `server.ts`.
2. **Handshake Authentication**:
   - The Socket.IO connection handshake extracts the access token cookie from the incoming WebSocket request headers.
   - Decodes JWT, verifies user exists, and confirms `isActive === true`. Unauthenticated or deactivated connections are rejected immediately (`next(new Error('Unauthorized'))`).
3. **Private User Rooms**:
   - Upon connection, the socket automatically joins a single private room named `user:${user._id}`.
   - Sockets never join broadcast channels that could leak cross-team or cross-user data.
4. **Post-Commit Real-Time Emission**:
   - Workflow state changes commit to MongoDB first.
   - Only after successful commit, `socketEmitter.toUser(userId, 'notification:new', payload)` dispatches real-time alerts.
   - If the user is offline, the persistent notification in MongoDB ensures zero missed alerts upon subsequent login.

---

## 4. Task Attachments Architecture

1. **Upload Pipeline**:
   - Express route uses `multer` configured with `limits: { fileSize: 10 * 1024 * 1024 }` (10 MB).
   - Temporary file or buffer passes through `file-type` inspection to verify true binary magic bytes (e.g. preventing `.exe` renamed to `.pdf` or disguised `.php`).
   - Generates a collision-resistant UUID filename for storage.
2. **Task-Level Authorization & Storage**:
   - Files are stored in a protected server directory (`uploads/attachments/`) not exposed publicly.
   - Access to view or download an attachment requires hitting `GET /api/tasks/:id/attachments/:attachmentId/download`, which verifies:
     - Admin: Global read.
     - Manager: Task belongs to manager's team.
     - Employee: Task is assigned to employee.
   - Deletion: Only Admin, Manager (own team), or the specific Employee who uploaded the file can delete it.

---

## 5. CSV Export Architecture

1. **Endpoint**: `GET /api/tasks/export/csv` with filter query params (`status`, `priority`, `projectId`, `assigneeId`, `overdue`).
2. **RBAC & Team Scoping**:
   - Admin: Exports company-wide or filters by team.
   - Manager: Strictly scoped to tasks belonging to their team.
   - Employee: Strictly scoped to tasks assigned directly to them.
3. **Formula Injection Sanitization (CSV Injection Defense)**:
   - Any cell value beginning with dangerous spreadsheet formula characters (`=`, `+`, `-`, `@`, `\t`, `\r`) is prepended with a single quote (`'`).
   - Prevents execution of malicious DDE commands when opened in Microsoft Excel or Google Sheets.
4. **Streaming Response**: Generated via `csv-stringify` or `fast-csv` and streamed directly to `res` with headers `Content-Type: text/csv` and `Content-Disposition: attachment; filename="tasks-export-<date>.csv"`.

---

## 6. Docker Containerization Topology

`docker-compose.yml` orchestrates three containerized services:

```text
               ┌────────────────────────────────────────────────────────┐
               │                     Host Machine                       │
               │                                                        │
               │   Port 80/443              Port 5000                   │
               │        │                        │                      │
               │        ▼                        ▼                      │
               │  ┌───────────┐            ┌───────────┐                │
               │  │  client   │            │  server   │                │
               │  │  (Nginx)  │───────────▶│ (Node.js) │                │
               │  └───────────┘            └─────┬─────┘                │
               │                                 │                      │
               │                                 ▼                      │
               │                           ┌───────────┐                │
               │                           │  mongodb  │                │
               │                           │ (MongoDB) │                │
               │                           └─────┬─────┘                │
               │                                 ▼                      │
               │                           ┌───────────┐                │
               │                           │ mongo-data│ (Volume)       │
               │                           └───────────┘                │
               └────────────────────────────────────────────────────────┘
```

1. **`client`**: Multi-stage Dockerfile compiling React with Vite and serving production static assets via Nginx on port 80.
2. **`server`**: Multi-stage Dockerfile running compiled Node.js Express + Socket.IO server on port 5000.
3. **`mongodb`**: Official `mongo:7` image with persistent named volume `mongo-data` mounted at `/data/db`.
4. **Environment Configuration**: Docker variables passed via `.env.docker` with zero hardcoded credentials committed to Git.

---

## 7. Live Deployment Architecture

- **Frontend**: Hosted on modern static CDN / PaaS (e.g. Vercel, Netlify, or container on Render/Railway).
- **Backend & Socket.IO**: Hosted on Node.js container runtime (Render, Railway, Fly.io, or VPS) supporting WebSocket upgrade headers (`Upgrade: websocket`, `Connection: Upgrade`).
- **Database**: Managed MongoDB Atlas replica set (enabling production MongoDB transactions).
- **Production Cookies & CORS**:
  - `SameSite: 'none'`, `Secure: true` if frontend and backend reside on separate subdomains.
  - Strict CORS allowlisting of the production frontend domain.
  - Live URL updated in `README.md` upon successful verified deployment.
