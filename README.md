# Actowiz Task Management System

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React_18-20232A?logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?logo=mongodb&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?logo=socketdotio&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=white)

A production-grade, CRM-style task management web application built for **Actowiz**. Designed around strict **Role-Based Access Control (RBAC)**, centralized status workflow enforcement, atomic MongoDB transactions with Optimistic Concurrency Control (OCC), real-time WebSocket communication, and an **Editorial Minimalism** design system.

---

## Table of Contents
- [1. Tech Stack](#1-tech-stack)
- [2. System Overview & RBAC Permissions](#2-system-overview--rbac-permissions)
- [3. Seed Credentials for Each Role](#3-seed-credentials-for-each-role)
- [4. Reviewer Notes & Testing Guide](#4-reviewer-notes--testing-guide)
- [5. Setup & Running Instructions](#5-setup--running-instructions)
  - [Prerequisites](#prerequisites)
  - [Option A: Docker Containerization (Recommended)](#option-a-docker-containerization-recommended)
  - [Option B: Local Node.js Development](#option-b-local-nodejs-development)
  - [Environment Variables](#environment-variables)
  - [Running the Automated Test Suite](#running-the-automated-test-suite)
- [6. Assumptions & Architectural Decisions](#6-assumptions--architectural-decisions)
- [7. Architecture & Documentation Links](#7-architecture--documentation-links)
- [8. Production Deployment](#8-production-deployment)

---

## 1. Tech Stack

### Frontend
- **Framework**: React 18, Vite, TypeScript
- **State Management & Data Fetching**: TanStack Query (React Query v5), Axios with centralized interceptors
- **Routing**: React Router v6 (role-guarded layouts & auth redirect wrappers)
- **Styling & UI**: Tailwind CSS, Lucide React icons, Editorial Minimalism design system
- **Drag & Drop**: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` with optimistic updates, rollback, and keyboard accessibility
- **Real-Time Client**: `socket.io-client` with toast alerts and notification drop-down
- **Date Utilities**: `date-fns` with fail-safe formatting helpers

### Backend
- **Runtime & Language**: Node.js 20+, Express.js, TypeScript (ES Modules)
- **Database & ODM**: MongoDB, Mongoose 8
- **Authentication**: JWT (short-lived access tokens, long-lived refresh tokens) stored in secure `HttpOnly`, `SameSite` cookies with server-side session revocation
- **Authorization**: Custom RBAC middleware with strict IDOR prevention and team scoping
- **Input Validation**: Zod runtime schema validation on query, params, and body
- **Real-Time Server**: Socket.IO with per-user private rooms (`user:${userId}`)
- **File Uploads**: `multer` with binary magic-bytes verification (`file-type`)
- **CSV Generation**: `fast-csv` stream with spreadsheet formula injection defense
- **Security**: `helmet`, `cors`, `express-rate-limit`, double-submit CSRF cookie token

### DevOps & Testing
- **Containerization**: Multi-stage `client/Dockerfile`, `server/Dockerfile`, and `docker-compose.yml`
- **Testing**: Supertest and Vitest with in-memory MongoDB runner (39 integration & unit tests)
- **Package Management**: Monorepo root npm orchestration

---

## 2. System Overview & RBAC Permissions

The system implements strict server-side authorization across three distinct enterprise roles:

```
[ Admin ]  ─── Global Oversight (All teams, projects, users, workflow approvals)
   │
[ Manager ]─── Scoped strictly to assigned teams & projects (Task assignment, IN_REVIEW -> DONE or Rejection)
   │
[ Employee ]── Scoped strictly to assigned tasks (TODO -> IN_PROGRESS -> IN_REVIEW)
```

### Authorization Matrix

| Operation | Admin | Manager | Employee |
|---|:---:|:---:|:---:|
| **Manage Users & Teams** (Create, edit, assign, deactivate) | Full System | No | No |
| **Add / Remove Team Members** | Yes | No | No |
| **View Projects** | All Projects | Assigned Team / Projects | Permitted Assigned Task Context |
| **Create / Edit / Delete Projects** | All Teams | Assigned Team Only | No |
| **Create Tasks** | All Teams | Assigned Team / Projects | No |
| **View Tasks** | All Tasks | Assigned Team / Projects | Assigned Tasks Only |
| **Edit Task Details & Reassign** | All Tasks | Assigned Team Only | No |
| **Start Task (`TODO` -> `IN_PROGRESS`)** | Yes | Assigned Team / Projects | Assigned Tasks Only |
| **Submit for Review (`IN_PROGRESS` -> `IN_REVIEW`)** | Yes | Assigned Team / Projects | Assigned Tasks Only |
| **Approve Task to `DONE` (Terminal)** | Yes | Assigned Team Only | **Forbidden (403)** |
| **Reject Review (`IN_REVIEW` -> `IN_PROGRESS`)** | Yes (with reason) | Assigned Team (with reason) | **Forbidden (403)** |
| **Add Comments** | All Tasks | Assigned Team / Projects | Assigned Tasks Only |
| **File Attachments (Upload / View)** | All Tasks | Assigned Team / Projects | Assigned Tasks Only |
| **File Attachments (Delete)** | Any Attachment | Team Attachments | Own Uploaded Files Only |
| **CSV Export** | Global Export | Team Tasks Only | Assigned Tasks Only |

---

## 3. Seed Credentials for Each Role

The database comes pre-configured with realistic accounts across 2 business units: **Team Alpha (Engineering)** and **Team Beta (Design & Research)**.

> [!CAUTION]
> The seed credentials below are for local development, demonstration, and automated test environments only. Change all passwords in production!

| Role | Name | Email | Password | Team Assignment | Permissions & Access Scope |
|---|---|---|---|---|---|
| **Admin** | Sarah Admin | `admin@actowiz.com` | `AdminPass123!` | Global System Admin (All Teams) | Complete system administration, user provisioning, global team/project control, review approvals, and company-wide analytics. |
| **Manager** | Alex River | `manager.alpha@actowiz.com` | `ManagerPass123!` | Developer & QA Teams | Creates and manages projects in Developer & QA, assigns tasks, approves submitted tasks to `DONE`, or rejects back with feedback. |
| **Manager** | Marcus Vance | `manager.beta@actowiz.com` | `ManagerPass123!` | UI/UX Design Team | Manages UI/UX Design tasks and projects. Cannot view, edit, or approve other teams' tasks (strict cross-team isolation). |
| **Employee** | Elena Rostova | `elena@actowiz.com` | `EmployeePass123!` | Developer Team | Full-stack engineering tasks in Developer Team. Progresses tasks (`TODO` -> `IN_PROGRESS` -> `IN_REVIEW`). |
| **Employee** | David Kim | `david@actowiz.com` | `EmployeePass123!` | Developer Team | Backend engineering tasks. Full comment and attachment capabilities on his assigned tasks. |
| **Employee** | Liam Chen | `liam@actowiz.com` | `EmployeePass123!` | Developer Team | Frontend engineering tasks. Scoped strictly to his assigned tasks. |
| **Employee** | Priya Sharma | `priya@actowiz.com` | `EmployeePass123!` | Developer Team | API and integration tasks in Developer Team. |
| **Employee** | Maya Patel | `maya@actowiz.com` | `EmployeePass123!` | UI/UX Design Team | UI design tasks. Cannot access tasks from other teams (IDOR prevention returns 404). |
| **Employee** | Lucas Moreau | `lucas@actowiz.com` | `EmployeePass123!` | UI/UX Design Team | Design system and prototype tasks. |
| **Employee** | Sophia Bennett | `sophia@actowiz.com` | `EmployeePass123!` | QA & Testing Team | Test plan and QA automation tasks. |
| **Employee** | Arjun Nair | `arjun@actowiz.com` | `EmployeePass123!` | QA & Testing Team | Manual and regression testing tasks. |

---

## 4. Reviewer Notes & Testing Guide

> [!IMPORTANT]
> **Key Guidance for Evaluators & Code Reviewers**
> This section outlines critical testing tips, security design decisions, and architectural assumptions to ensure a smooth evaluation experience.

### 1. Demo Credentials Disclaimer
* **Demonstration & Testing Only**: The seeded credentials in Section 3 and the quick-fill login buttons in the UI are provided **strictly for testing, local evaluation, and automated CI test suites (`npm test`)**.
* **Zero Production Intent**: No default or hardcoded credentials are ever intended for production environments. All passwords stored in the database are salted and hashed using `bcrypt` (work factor 12). Production deployments require unique credentials and rotated environment secrets.

### 2. Browser Cookie Storage & Incognito Testing
* **HttpOnly Cookie Architecture**: For enterprise-grade security against Cross-Site Scripting (XSS), JWT access and refresh tokens are stored exclusively in **`HttpOnly` and `SameSite` cookies** rather than vulnerable `localStorage`.
* **Chrome Incognito Third-Party Cookie Flag**: Google Chrome Incognito mode enables *"Block third-party cookies"* by default. When running locally (`http://localhost:5173` talking to `http://localhost:5000`), Chrome's strict incognito heuristic may misclassify cross-port cookies as third-party and silently block them from being stored, causing instant 401 / `"Refresh token required"` errors.
* **Recommended Reviewer Setup**:
  * **Option A (Recommended)**: Use **Separate Chrome Profiles** (e.g., Profile 1 for Admin, Profile 2 for Manager, Profile 3 for Employee). Each profile maintains an isolated cookie jar without Incognito's aggressive cookie-blocking rules.
  * **Option B**: Test different roles concurrently using multiple browsers (e.g., Chrome for Admin, Microsoft Edge for Manager, Firefox for Employee) to see real-time updates and notifications side-by-side.
  * **Option C**: If testing in Incognito, click the **Eye / Shield icon** in the address bar and select **"Allow third-party cookies for this site"** (or disable protection for `localhost`).

### 3. Role-Based Scoping & Project Ownership Rules
* **Strict Server-Side Derivation**: User identity, role, and team scopes are derived strictly from the authenticated server-side session. Client-supplied IDs in request bodies are ignored.
* **Project-Level Manager Assignment**: When an Admin assigns a project to a specific Manager, only that designated manager has project-level oversight, task creation, and transition approval rights for that project. If an Admin reassigns the project to another manager, the previous manager's visibility is immediately revoked—even if both managers belong to the same team.
* **Terminal `DONE` State**: Employees can only move tasks `TODO -> IN_PROGRESS -> IN_REVIEW`. Marking tasks `DONE` is strictly restricted to Managers and Admins on the backend.
* **Mandatory Rejection Reason**: Reverting a task `IN_REVIEW -> IN_PROGRESS` strictly requires a mandatory rejection reason (min. 5 chars) which is permanently recorded in the task's audit history and dispatched via WebSocket alerts to the assigned employee.

### 4. Concurrency & Defensive Engineering Practices
* **Optimistic Concurrency Control (OCC)**: Collaborative Kanban updates inspect document version keys (`__v`). Concurrent modifications return `409 Conflict`, prompting the UI to automatically roll back optimistic changes and fetch fresh state.
* **Adaptive MongoDB Transactions**: The system inspects connection topology at runtime—executing multi-document transactions inside `session.startTransaction()` on Replica Sets (production/Atlas), while falling back gracefully to atomic document updates on single-node standalone MongoDB instances.
* **Binary Magic-Bytes File Validation**: File uploads inspect binary header signatures via `file-type` rather than trusting client-sent MIME types or file extensions, defending against disguised executables.
* **Spreadsheet Formula Injection Defense**: All exported CSV cells are sanitized against spreadsheet formula execution (`=`, `+`, `-`, `@`, `\t`, `\r`) to ensure safe opening in Excel and Google Sheets.

---

## 5. Setup & Running Instructions

### Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9+
- **Docker & Docker Compose**: (Optional, for containerized run)
- **MongoDB**: v6.0+ (Local community edition or MongoDB Atlas URI)

---

### Option A: Docker Containerization (Recommended)

Run the full multi-tier stack (React Client, Express API, and persistent MongoDB service) with a single command:

```bash
# 1. Build and start containers in background
docker compose up --build -d

# 2. Seed the database with sample users, teams, projects, and tasks
docker compose exec server node dist/scripts/seed.js

# 3. Check live container logs
docker compose logs -f

# 4. Stop containers when done
docker compose down
```

#### Docker Service Endpoints:
- **Frontend Web UI**: [`http://localhost:80`](http://localhost:80) (or `http://localhost:5173` if running dev)
- **Backend REST API**: [`http://localhost:5000/api`](http://localhost:5000/api)
- **Socket.IO Real-Time Server**: `ws://localhost:5000`
- **MongoDB**: `localhost:27017`

---

### Option B: Local Node.js Development

#### 1. Repository Setup & Dependencies
Install dependencies for root, server, and client:
```bash
npm install
npm --prefix server install
npm --prefix client install
```

#### 2. Backend Setup
```bash
# Navigate to server
cd server

# Create .env from template
cp .env.example .env

# Seed initial database
npm run seed

# Start server in watch mode
npm run dev
```
*Backend runs on `http://localhost:5000`.*

#### 3. Frontend Setup
In a separate terminal:
```bash
# Navigate to client
cd client

# Create .env from template
cp .env.example .env

# Start Vite dev server
npm run dev
```
*Frontend runs on `http://localhost:5173`.*

---

### Environment Variables

#### Server (`server/.env`):
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

#### Client (`client/.env`):
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

---

### Running the Automated Test Suite

The test suite covers RBAC permissions, concurrency locks, state transitions, attachment validation, and CSV export:

```bash
# Run all integration and unit tests from root
npm test

# Run tests directly in server with detailed output
cd server
npm test
```

**Test Coverage Summary (50/50 passing across 8 suites):**
- `tests/integration/auth.test.ts` (Login, refresh token rotation, logout revocation, inactive user block)
- `tests/integration/rbac-and-workflow.test.ts` (Cross-team IDOR isolation, workflow terminal `DONE`, rejection mandatory reason, OCC conflict detection)
- `tests/integration/admin-permissions.test.ts` (Team creation/deletion, project manager assignment, multi-team membership)
- `tests/integration/attachments.test.ts` (Binary magic-bytes validation, executable spoofing defense, delete RBAC)
- `tests/integration/features.test.ts` (Comment threading, CSV formula sanitization, due-soon 24h cron alerts)
- `tests/integration/date-validation.test.ts` (Due date validation, disallow past dates on task and project creation)
- `tests/unit/dateValidator.test.ts` (Date boundary and unit validation)
- `tests/unit/seed.test.ts` (Verification of seed script data integrity)

---

## 6. Assumptions & Architectural Decisions

During the implementation of this system, the following deliberate design decisions and domain assumptions were made:

### 1. Workflow State Machine & Terminal State
- **Strict Linear Flow**: `TODO -> IN_PROGRESS -> IN_REVIEW -> DONE`.
- **Terminal `DONE`**: Once a task reaches `DONE`, it cannot be modified, reopened, or deleted by standard employees. Only Admins can reassign or adjust archived tasks.
- **Mandatory Rejection Reason**: Reverting `IN_REVIEW -> IN_PROGRESS` requires a minimum 5-character reason provided by the Manager or Admin. This reason is permanently recorded in the task's activity history and sent via notification to the assignee.

### 2. Multi-Team Membership & Task Assignment
- While each task belongs to one Project and one Team, **Employees and Managers can participate in multiple teams** (`teamIds: [ObjectId]`).
- **Flexible Assignee**: Tasks can be assigned to either an active Employee or an active Manager of that project/team.
- When an Admin creates a project, they explicitly designate the project's Team and assigned Project Manager.

### 3. Dynamic MongoDB Transaction Handling
- MongoDB multi-document transactions require a Replica Set cluster or Sharded deployment.
- To maintain high flexibility between local standalone development (Docker / local single mongod) and staging/production replica sets (Atlas / RS0), the centralized `TaskWorkflowService` **dynamically inspects connection topology**. It executes transactions inside `session.startTransaction()` on replica sets, while falling back gracefully to atomic document updates on single-node environments.

### 4. Binary Magic-Bytes File Validation
- To defend against disguised executables (e.g. `malware.exe` renamed to `invoice.pdf`), the server does not rely on the client-sent `Content-Type` or file extension.
- Instead, the first 4100 bytes of uploaded files are inspected using `file-type` to detect the **actual binary header signature** (supporting `pdf`, `png`, `jpg`, `webp`, `docx`, `xlsx`, `csv`, and `txt`). Disguised or unknown file signatures are rejected with `400 Bad Request`.

### 5. CSV Spreadsheet Formula Injection Defense
- When exporting tasks to CSV (`/api/tasks/export/csv`), malicious task titles or descriptions could attempt formula injection in Microsoft Excel or Google Sheets.
- Every string cell is passed through `sanitizeCsvValue()`. Any value beginning with `=`, `+`, `-`, `@`, `\t`, or `\r` is automatically prepended with a single quote (`'`), neutralizing executable spreadsheet commands.

### 6. Optimistic Concurrency Control (OCC)
- Fast-paced collaborative Kanban boards risk race conditions if two managers review or move the same card concurrently.
- The system checks document versioning (`__v`) upon status change. If another user moved the card in the interim, the API responds with `409 Conflict`, prompting the frontend to automatically roll back the card and refetch the latest state.

### 7. Dual-Layer Real-Time & Offline Sync
- Real-time updates utilize Socket.IO rooms partitioned by user ID (`user:${userId}`).
- Emitting occurs **strictly post-transaction commit** with isolated try/catch handlers, ensuring that a socket network glitch never rolls back a successful database update.
- All real-time notifications are backed by persistent `Notification` documents in MongoDB, guaranteeing that offline users receive their unread alerts upon logging back in.

### 8. Double-Submit Cookie & Secure Session Strategy
- Authentication uses secure `HttpOnly` cookies for JWT storage (avoiding `localStorage` XSS vulnerabilities).
- Cookies dynamically configure `SameSite: 'none'` and `Secure: true` in HTTPS production environments, while utilizing `SameSite: 'lax'` for local localhost development.
- A double-submit `X-CSRF-Token` cookie header check safeguards state-changing mutations (`POST`, `PUT`, `PATCH`, `DELETE`).

---

## 7. Architecture & Documentation Links

Complete engineering specifications are maintained in the [`docs/`](./docs/) directory:

- [**System Architecture & Topology** (`docs/ARCHITECTURE.md`)](./docs/ARCHITECTURE.md): Monolithic structure, module boundaries, WebSocket pipeline, file handling, and Docker setup.
- [**Database Schemas & Indexes** (`docs/DATABASE.md`)](./docs/DATABASE.md): Entity relationships, Mongoose schemas, compound indexes, and audit logs.
- [**Role-Based Access Control** (`docs/RBAC.md`)](./docs/RBAC.md): Complete authorization rules, team scoping logic, and IDOR defense.
- [**Centralized Task Workflow** (`docs/TASK-WORKFLOW.md`)](./docs/TASK-WORKFLOW.md): State transition rules, atomic execution, rejection protocol, and OCC concurrency.
- [**REST API Documentation** (`docs/API.md`)](./docs/API.md): Comprehensive endpoint catalog, request payloads, response schemas, and WebSocket events.
- [**Editorial Minimalist Design System** (`docs/DESIGN-SYSTEM.md`)](./docs/DESIGN-SYSTEM.md): Color tokens, typography, component styling guidelines, and Anti-AI UI principles.

---

## 8. Production Deployment

- **Frontend Production URL**: `https://actowiz-task-management-system.vercel.app`
- **Backend API URL**: `https://actowiz-task-management-system.onrender.com/api`
- **Docker Production Image**: Multi-stage Nginx + Node production build available via `docker-compose.yml`.

---

*Authored by Patel Dhairya Jigneshkumar for the Actowiz Full-Stack Engineering Assignment.*
