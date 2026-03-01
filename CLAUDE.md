# CLAUDE.md — Task 360 Engine

## Project Overview

**Task360 Engine** is a multi-tenant B2B Task Management SaaS built with React + TypeScript (Vite) on the frontend and Express.js + Prisma + PostgreSQL on the backend. Key features include:

- **Multi-tenant workspaces** with role-based access (SUPER_ADMIN, GESTOR, COLABORADOR, CLIENTE)
- **Kanban task board** with drag-and-drop, color coding, and versioned optimistic locking
- **Google Tasks bi-directional sync** with "Last Write Wins" conflict resolution (2s threshold)
- **AI Meeting Minutes** (Gemini 1.5 Flash) — upload recordings, get summaries + suggested tasks
- **Revolut dynamic billing** — Base plan (5.00 EUR) + per-seat charges (3.00 EUR/invite)
- **Invite system** gated by Revolut payment — membership activates only after `payment_success` webhook

## Tech Stack

| Layer         | Technology                                         |
|---------------|----------------------------------------------------|
| Frontend      | React 18, TypeScript, Vite, React Router 6         |
| State         | Zustand (persisted stores)                         |
| Styling       | Tailwind CSS 3.4, PostCSS, Autoprefixer            |
| Icons         | lucide-react                                       |
| Backend       | Express.js (ES modules), Node.js                   |
| ORM           | Prisma (PostgreSQL)                                |
| Auth          | JWT (jsonwebtoken) + bcryptjs                      |
| AI            | Gemini 1.5 Flash (stub — ready for integration)    |
| Payments      | Revolut API (stub — ready for integration)         |

## Project Structure

```
Tasks360co/
├── prisma/
│   └── schema.prisma          # Database schema (User, Workspace, Membership, Task, Meeting, Subscription)
├── server.js                  # Express entry point — mounts routes, seeds admin, serves dist/
├── server/
│   ├── middleware/
│   │   ├── auth.js            # JWT generation + verification middleware
│   │   └── tenantGuard.js     # Multi-tenant workspace isolation guard
│   ├── routes/
│   │   ├── auth.js            # POST /login, /register, GET/PATCH /me
│   │   ├── workspaces.js      # CRUD workspaces, invite members, list members
│   │   ├── tasks.js           # CRUD tasks with optimistic locking (version field)
│   │   ├── meetings.js        # CRUD meetings, POST /process (AI stub)
│   │   ├── billing.js         # Subscription management, billing overview, manual charges
│   │   └── webhooks.js        # Revolut payment + Google Tasks push notification handlers
│   └── services/
│       ├── syncEngine.js      # Debounced Google Tasks sync, conflict resolution
│       ├── ai.js              # Gemini 1.5 Flash meeting processing stub
│       └── billing.js         # Billing calculation logic, Revolut checkout stub
├── src/
│   ├── main.tsx               # React entry (StrictMode)
│   ├── App.tsx                # BrowserRouter with routes
│   ├── index.css              # Tailwind directives + custom scrollbar + utilities
│   ├── types/
│   │   └── index.ts           # All TypeScript interfaces (User, Task, Workspace, etc.)
│   ├── lib/
│   │   └── api.ts             # Fetch wrapper with JWT + X-Workspace-Id headers
│   ├── stores/
│   │   ├── useAuthStore.ts    # Auth state (login, logout, fetchMe) — persisted
│   │   ├── useWorkspaceStore.ts # Workspace list + switching — persisted
│   │   └── useTaskStore.ts    # Task CRUD + optimistic moves + AI injection
│   ├── components/
│   │   ├── common/
│   │   │   ├── ErrorBoundary.tsx   # React Error Boundary with retry button
│   │   │   └── LoadingSpinner.tsx  # Animated loader
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx       # Protected layout (Sidebar + Outlet)
│   │   │   ├── Sidebar.tsx         # Nav links + WorkspaceSwitcher + user info
│   │   │   └── Header.tsx          # Page title + search + notifications
│   │   ├── workspace/
│   │   │   ├── WorkspaceSwitcher.tsx  # Select dropdown (only accepted memberships)
│   │   │   └── InviteModal.tsx       # Email + role → Revolut checkout flow
│   │   ├── kanban/
│   │   │   ├── KanbanBoard.tsx   # 4-column board + add/edit modals
│   │   │   ├── KanbanColumn.tsx  # Droppable column with drag-and-drop
│   │   │   └── TaskCard.tsx      # Draggable card with sync lock indicator
│   │   ├── meetings/
│   │   │   ├── MeetingList.tsx   # Meeting cards with AI summary badge
│   │   │   └── MeetingUpload.tsx # File upload + 60-min banner + AI results + "Approve Tasks"
│   │   └── admin/
│   │       ├── BillingDashboard.tsx  # Revenue overview + per-gestor billing table
│   │       └── UserManagement.tsx    # Member list with role badges and actions
│   └── pages/
│       ├── LoginPage.tsx        # Email/password auth form
│       ├── DashboardPage.tsx    # Stats cards + upcoming meetings + subscription info
│       ├── KanbanPage.tsx       # Wraps KanbanBoard
│       ├── MeetingsPage.tsx     # Meeting CRUD + AI upload
│       ├── AdminPage.tsx        # Tabs: Billing | Members + Invite button
│       └── SettingsPage.tsx     # Profile edit, auto-renew toggle, Google sync config
├── tasks/
│   └── todo.md                # Implementation roadmap checklist
├── index.html                 # Vite HTML entry
├── package.json               # Dependencies + scripts
├── tsconfig.json              # Frontend TS config (strict, react-jsx)
├── tsconfig.node.json         # Vite config TS
├── vite.config.ts             # Vite dev server (port 5173, proxy /api → :3000)
├── tailwind.config.js         # Scans index.html + src/**/*.{ts,tsx}
├── postcss.config.js          # Tailwind + Autoprefixer
└── .gitignore                 # node_modules, dist, .env, prisma migrations
```

## Development Commands

```bash
# Frontend
npm install              # Install all dependencies
npm run dev              # Vite dev server (port 5173, proxies /api to :3000)
npm run build            # tsc + vite build → dist/
npm run lint             # ESLint (zero warnings policy)

# Backend
npm run server           # Start Express production server (port 3000)

# Database (Prisma)
npm run db:generate      # Generate Prisma client from schema
npm run db:push          # Push schema to database (dev)
npm run db:migrate       # Create and apply migrations
npm run db:studio        # Open Prisma Studio GUI
```

## Environment Variables

| Variable         | Required | Description                               |
|------------------|----------|-------------------------------------------|
| `DATABASE_URL`   | Yes      | PostgreSQL connection string              |
| `SUPER_ADMIN`    | Yes      | Password for the default admin user       |
| `ADMIN_EMAIL`    | No       | Admin email (default: `admin@ecom360.co`) |
| `PORT`           | No       | Server port (default: `3000`)             |
| `JWT_SECRET`     | No       | JWT signing key (set in production!)      |
| `GEMINI_API_KEY` | No       | Google Gemini API key for meeting AI      |
| `REVOLUT_API_KEY`| No       | Revolut Merchant API key for billing      |
| `APP_URL`        | No       | Public app URL for Revolut redirects      |

**Never commit `.env` files or secrets to the repository.**

## Database Schema (Prisma)

### Models

| Model          | Key Fields                                                                     |
|----------------|--------------------------------------------------------------------------------|
| `User`         | id, name, email (unique), password, role (enum), avatar, activeWorkspaceId     |
| `Workspace`    | id, name, slug (unique), memberships[], tasks[], meetings[], subscription      |
| `Membership`   | userId + workspaceId (unique), roleInWorkspace, inviteAccepted, costPerMonth (3.00) |
| `Task`         | id, title, status (enum), assigneeId, workspaceId, googleTaskId, lastSyncedAt, version |
| `Meeting`      | id, title, date, time, participants[], workspaceId, recordingUrl, summary, suggestedTasks (JSON) |
| `Subscription` | workspaceId (unique), basePrice (5.00), seatCount, totalMonthlyValue, autoRenew, status |
| `PasswordReset`| email (unique), token, expiresAt                                               |

### Enums

- **Role**: `SUPER_ADMIN`, `GESTOR`, `COLABORADOR`, `CLIENTE`
- **WorkspaceRole**: `GESTOR`, `COLABORADOR`, `CLIENTE`
- **TaskStatus**: `PENDING`, `IN_PROGRESS`, `REVIEW`, `DONE`
- **SubStatus**: `ACTIVE`, `PAST_DUE`, `CANCELLED`, `TRIAL`

## API Endpoints

### Auth (`/api/auth`)
| Method | Endpoint    | Auth | Description                    |
|--------|-------------|------|--------------------------------|
| POST   | /login      | No   | Login with email/password      |
| POST   | /register   | No   | Register new user              |
| GET    | /me         | Yes  | Get current user profile       |
| PATCH  | /me         | Yes  | Update name/activeWorkspaceId  |

### Workspaces (`/api/workspaces`)
| Method | Endpoint      | Auth | Description                          |
|--------|---------------|------|--------------------------------------|
| GET    | /             | Yes  | List user's workspaces (accepted)    |
| POST   | /             | Yes  | Create new workspace                 |
| POST   | /invite       | Yes  | Invite member (generates checkout)   |
| GET    | /members      | Yes  | List workspace members               |
| DELETE | /members/:id  | Yes  | Remove member (GESTOR only)          |

### Tasks (`/api/tasks`)
| Method | Endpoint | Auth | Description                              |
|--------|----------|------|------------------------------------------|
| GET    | /        | Yes  | List workspace tasks                     |
| POST   | /        | Yes  | Create task                              |
| PATCH  | /:id     | Yes  | Update task (with version-based locking) |
| DELETE | /:id     | Yes  | Delete task                              |

### Meetings (`/api/meetings`)
| Method | Endpoint  | Auth | Description                     |
|--------|-----------|------|---------------------------------|
| GET    | /         | Yes  | List workspace meetings         |
| POST   | /         | Yes  | Create meeting                  |
| POST   | /process  | Yes  | Process recording with AI       |
| DELETE | /:id      | Yes  | Delete meeting                  |

### Billing (`/api/billing`)
| Method | Endpoint       | Auth | Description                          |
|--------|----------------|------|--------------------------------------|
| GET    | /subscription  | Yes  | Get workspace subscription           |
| PATCH  | /subscription  | Yes  | Toggle autoRenew                     |
| GET    | /overview      | Yes  | Billing overview (admin/gestor)      |
| POST   | /manual-charge | Yes  | Generate manual charge (SUPER_ADMIN) |

### Webhooks (`/api/webhooks`)
| Method | Endpoint      | Auth | Description                            |
|--------|---------------|------|----------------------------------------|
| POST   | /revolut      | No   | Revolut payment events → activate membership |
| POST   | /google-tasks | No   | Google Tasks push notifications → sync |

## Architecture Patterns

### Multi-tenancy
- Every API request includes an `X-Workspace-Id` header (set by the frontend API client).
- `tenantGuard` middleware verifies the user has an accepted membership before processing.
- WorkspaceSwitcher only shows workspaces where `inviteAccepted === true`.

### State Management (Zustand)
- `useAuthStore` — login/logout, JWT persistence in localStorage.
- `useWorkspaceStore` — workspace list, current workspace, switch context (persisted).
- `useTaskStore` — task CRUD, optimistic status moves, sync tracking, AI task injection.

### Billing Formula
```
Total = Base_Plan (5.00 EUR) + (Active_Invites × 3.00 EUR)
```
Owner seat is free. Recalculated on every invite/removal.

### Google Tasks Sync
- **Debounced** — rapid edits within 1.5s are batched into one sync request.
- **Conflict resolution** — if Google and local differ by < 2s, local wins ("Quem cria vai na frente").
- **Visual lock** — `TaskCard` shows a spinner overlay while syncing.

### AI Meeting Processing
- **Constraint**: 60 minutes max per recording.
- **Flow**: Upload → Gemini 1.5 Flash → JSON `{ summary, suggestedTasks }` → "Approve" → inject into Kanban.

## Conventions & Guidelines

### Code Style
- **TypeScript** for all frontend code (`.tsx` / `.ts`).
- **JavaScript** (ES modules) for backend code (`.js`).
- **React functional components** — no class components (except ErrorBoundary).
- **Tailwind CSS** utility classes — avoid custom CSS.
- Commit messages: `feat:`, `fix:`, `refactor:`, `docs:`.

### Frontend
- Dark theme: `bg-gray-950` base, `bg-gray-900` cards, `bg-gray-800` inputs.
- All API calls go through `src/lib/api.ts` which auto-attaches JWT and workspace headers.
- ErrorBoundary wraps the Kanban board and the main content area.

### Backend
- All routes are modular in `server/routes/*.js`, receiving a `prisma` instance via closure.
- Wrap external integrations (Revolut, Google, Gemini) in `try-catch` with detailed `console.error`.
- Use Prisma for all database operations — never write raw SQL.

### Security
- Passwords hashed with bcrypt (10 rounds).
- JWT auth with Bearer tokens (7-day expiry).
- Tenant isolation enforced at middleware level.
- Never expose `password` field in API responses (destructured out).
- `SUPER_ADMIN` password from environment variable only.

## Stub Integrations (Ready for Production)

The following are implemented as stubs with clear integration points:

1. **Revolut Payments** — `server/services/billing.js` + `server/routes/webhooks.js`
2. **Google Tasks API** — `server/services/syncEngine.js` + `server/routes/webhooks.js`
3. **Gemini 1.5 Flash** — `server/services/ai.js` + `server/routes/meetings.js`

Each stub has commented production code showing the exact API calls needed.

## Language Notes

- UI strings and some comments are in **Portuguese (Brazilian)**. Maintain consistency when modifying nearby code.
