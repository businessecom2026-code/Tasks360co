# CLAUDE.md — Task 360 Engine

## Project Overview

**Task360 Engine** is a multi-tenant B2B Task Management SaaS built with React + TypeScript (Vite) on the frontend and Express.js + Prisma + PostgreSQL on the backend. Key features include:

- **Multi-tenant workspaces** with role-based access (SUPER_ADMIN, GESTOR, COLABORADOR, CLIENTE)
- **Kanban task board** with drag-and-drop, color coding, checklist, attachments, and versioned optimistic locking
- **Google Tasks bi-directional sync** with "Last Write Wins" conflict resolution (2s threshold)
- **AI Meeting Minutes** (Gemini 1.5 Flash) — upload recordings, get summaries + suggested tasks
- **Revolut dynamic billing** — Base plan (5.00 EUR) + per-seat charges (3.00 EUR/invite)
- **Invite system** gated by Revolut payment — membership activates only after `payment_success` webhook
- **Real-time notifications** via SSE (Server-Sent Events) with auto-reconnect
- **PWA / Offline support** — service worker, manifest, offline banner
- **Dark/Light mode** toggle with localStorage persistence

## Tech Stack

| Layer         | Technology                                         |
|---------------|----------------------------------------------------|
| Frontend      | React 18, TypeScript, Vite, React Router 6         |
| State         | Zustand (persisted stores)                         |
| Styling       | Tailwind CSS 3.4, PostCSS, Autoprefixer            |
| Icons         | lucide-react                                       |
| DnD           | @dnd-kit/core + @dnd-kit/sortable                  |
| Charts        | Recharts                                           |
| Backend       | Express.js (ES modules), Node.js                   |
| ORM           | Prisma (PostgreSQL)                                |
| Auth          | JWT (jsonwebtoken) + bcryptjs                      |
| AI            | Gemini 1.5 Flash (@google/generative-ai)           |
| Payments      | Revolut API (stub — ready for integration)         |
| Google Sync   | googleapis (OAuth2 + Tasks API)                    |
| File Upload   | multer (multipart)                                 |
| Testing       | Vitest + Testing Library + jsdom                   |
| Deploy        | Replit-ready (.replit + setup scripts)             |

## Project Structure

```
Tasks360co/
├── prisma/
│   └── schema.prisma              # Database schema (all models + enums)
├── server.js                      # Express entry — mounts routes, seeds admin, serves dist/
├── server/
│   ├── middleware/
│   │   ├── auth.js                # JWT generation + verification (Bearer + query param)
│   │   ├── tenantGuard.js         # Multi-tenant workspace isolation guard
│   │   └── roleGuard.js           # Role-based access (requireRole, requireWorkspaceRole)
│   ├── routes/
│   │   ├── auth.js                # POST /login, /register, GET/PATCH /me, Google OAuth
│   │   ├── workspaces.js          # CRUD workspaces, invite members, list/remove members
│   │   ├── tasks.js               # CRUD tasks with optimistic locking (version field)
│   │   ├── meetings.js            # CRUD meetings, POST /process (AI)
│   │   ├── billing.js             # Subscription management, billing overview, manual charges
│   │   ├── notifications.js       # SSE stream, list, unread-count, mark-read, delete
│   │   ├── attachments.js         # File upload/delete for task attachments (multer)
│   │   └── webhooks.js            # Revolut payment + Google Tasks push handlers
│   └── services/
│       ├── syncEngine.js          # Debounced Google Tasks sync, conflict resolution
│       ├── googleAuth.js          # Google OAuth2 + token management
│       ├── ai.js                  # Gemini 1.5 Flash meeting processing
│       ├── billing.js             # Billing calculation logic, Revolut checkout
│       └── notifications.js       # SSE connection manager + push helpers
├── src/
│   ├── main.tsx                   # React entry (StrictMode + SW registration)
│   ├── App.tsx                    # BrowserRouter with public + protected routes
│   ├── index.css                  # Tailwind directives + dark/light mode base
│   ├── types/
│   │   └── index.ts               # All TypeScript interfaces + enums
│   ├── lib/
│   │   └── api.ts                 # Fetch wrapper with JWT + X-Workspace-Id headers
│   ├── stores/
│   │   ├── useAuthStore.ts        # Auth state (login, logout, fetchMe) — persisted
│   │   ├── useWorkspaceStore.ts   # Workspace list + switching — persisted
│   │   ├── useTaskStore.ts        # Task CRUD + optimistic moves + AI injection
│   │   └── useNotificationStore.ts # SSE connection + notification state
│   ├── components/
│   │   ├── common/
│   │   │   ├── ErrorBoundary.tsx   # React Error Boundary with retry
│   │   │   ├── LoadingSpinner.tsx  # Animated loader
│   │   │   ├── OfflineBanner.tsx   # Yellow banner when offline
│   │   │   └── ThemeToggle.tsx     # Sun/Moon dark/light toggle
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx       # Protected layout (Sidebar + MobileNav + Outlet)
│   │   │   ├── Sidebar.tsx         # Desktop nav + WorkspaceSwitcher + ThemeToggle
│   │   │   ├── MobileNav.tsx       # Mobile app-grid nav (iOS/Android style)
│   │   │   └── Header.tsx          # Page title + search + notifications + ThemeToggle
│   │   ├── workspace/
│   │   │   ├── WorkspaceSwitcher.tsx  # Select dropdown (only accepted+paid memberships)
│   │   │   └── InviteModal.tsx       # Email + role → Revolut checkout flow
│   │   ├── kanban/
│   │   │   ├── KanbanBoard.tsx    # 4-column board + add/edit modals + list view toggle
│   │   │   ├── KanbanColumn.tsx   # Droppable column with drag-and-drop
│   │   │   ├── TaskCard.tsx       # Draggable card with sync lock indicator
│   │   │   ├── TaskModal.tsx      # Unified create + edit modal
│   │   │   ├── TaskDetailModal.tsx # Read-only task detail view
│   │   │   ├── ListView.tsx       # Table/list view alternative to Kanban
│   │   │   └── TaskStatusChart.tsx # Recharts pie/bar for task distribution
│   │   ├── meetings/
│   │   │   ├── MeetingList.tsx    # Meeting cards with AI summary badge
│   │   │   └── MeetingUpload.tsx  # File upload + 60-min banner + AI results
│   │   ├── notifications/
│   │   │   └── NotificationPanel.tsx # Dropdown from bell icon with live updates
│   │   └── admin/
│   │       ├── BillingDashboard.tsx  # Revenue overview + per-gestor billing table
│   │       └── UserManagement.tsx    # Member list with role badges and actions
│   └── pages/
│       ├── LandingPage.tsx        # Public landing (hero, features, pricing, CTA)
│       ├── LoginPage.tsx          # Email/password auth form
│       ├── RegisterPage.tsx       # Registration with validation
│       ├── DashboardPage.tsx      # Stats cards + meetings + subscription info
│       ├── KanbanPage.tsx         # Wraps KanbanBoard
│       ├── MeetingsPage.tsx       # Meeting CRUD + AI upload
│       ├── AdminPage.tsx          # Tabs: Billing | Members + Invite button
│       └── SettingsPage.tsx       # Profile, auto-renew, Google sync config
├── public/
│   ├── manifest.json              # PWA manifest
│   ├── sw.js                      # Service Worker (precache + stale-while-revalidate)
│   └── icons/icon-192.svg         # PWA icon
├── scripts/
│   ├── replit-setup.sh            # First-run: install, generate, create both DBs, build
│   ├── replit-start.sh            # Start: sync schema + launch server
│   └── db.js                      # getPrisma(env) factory + cleanTestDb()
├── tasks/
│   └── todo.md                    # Implementation roadmap (all phases complete)
├── .replit                        # Replit run/build/deploy config
├── replit.nix                     # Nix dependencies (Node 20, OpenSSL)
├── .env.example                   # Environment variable template
├── index.html                     # Vite HTML entry
├── package.json                   # Dependencies + scripts
├── tsconfig.json                  # Frontend TS config (strict, react-jsx)
├── tsconfig.node.json             # Vite config TS
├── vitest.config.ts               # Vitest configuration
├── vite.config.ts                 # Vite dev server (port 5173, proxy /api → :3000)
├── tailwind.config.js             # Scans index.html + src/**/*.{ts,tsx}
├── postcss.config.js              # Tailwind + Autoprefixer
├── .eslintrc.cjs                  # ESLint config
└── .gitignore                     # node_modules, dist, .env, uploads, Replit cache
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
npm run db:push          # Push schema to production database
npm run db:push:test     # Push schema to test database
npm run db:push:all      # Push schema to both databases
npm run db:migrate       # Create and apply migrations
npm run db:studio        # Open Prisma Studio GUI (production)
npm run db:studio:test   # Open Prisma Studio GUI (test)

# Testing
npm test                 # Vitest (NODE_ENV=test, uses test DB)
npm run test:watch       # Vitest watch mode
npm run test:coverage    # Vitest with coverage

# Replit
npm run replit:setup     # First-time setup (install + DBs + build)
npm run replit:start     # Start server (auto-sync schema)
npm run replit:build     # Install + generate + build
```

## Environment Variables

| Variable           | Required | Description                               |
|--------------------|----------|-------------------------------------------|
| `DATABASE_URL`     | Yes      | PostgreSQL connection string (production) |
| `DATABASE_URL_TEST`| No       | PostgreSQL connection string (test DB)    |
| `SUPER_ADMIN`      | Yes      | Password for the default admin user       |
| `ADMIN_EMAIL`      | No       | Admin email (default: `admin@ecom360.co`) |
| `PORT`             | No       | Server port (default: `3000`)             |
| `JWT_SECRET`       | No       | JWT signing key (set in production!)      |
| `GEMINI_API_KEY`   | No       | Google Gemini API key for meeting AI      |
| `REVOLUT_API_KEY`  | No       | Revolut Merchant API key for billing      |
| `APP_URL`          | No       | Public app URL for Revolut redirects      |

**Never commit `.env` files or secrets to the repository.**

## Database Schema (Prisma)

### Models

| Model          | Key Fields                                                                     |
|----------------|--------------------------------------------------------------------------------|
| `User`         | id, name, email (unique), password, role, avatar, activeWorkspaceId, googleAccessToken, googleRefreshToken, emailVerified |
| `Workspace`    | id, name, slug (unique), memberships[], tasks[], meetings[], subscription      |
| `Membership`   | userId + workspaceId (unique), roleInWorkspace, inviteAccepted, paymentStatus, costPerSeat (3.00), invitedEmail, revolutOrderId |
| `Task`         | id, title, status, priority, labels (JSON), checklist (JSON), coverColor, assigneeId, workspaceId, dueDate, image, color, googleTaskId, lastSyncedAt, version, attachments[] |
| `Attachment`   | id, taskId, fileName, fileUrl, fileType, fileSize, thumbnailUrl, uploadedById  |
| `Meeting`      | id, title, date, time, participants[], link, platform, workspaceId, recordingUrl, summary, suggestedTasks (JSON) |
| `Subscription` | workspaceId (unique), basePrice (5.00), seatCount, totalMonthlyValue, autoRenew, status, currentPeriodEnd |
| `Notification` | id, userId, workspaceId, type, title, body, read, data (JSON)                 |
| `PasswordReset`| email (unique), token, expiresAt                                               |

### Enums

- **Role**: `SUPER_ADMIN`, `GESTOR`, `COLABORADOR`, `CLIENTE`
- **WorkspaceRole**: `GESTOR`, `COLABORADOR`, `CLIENTE`
- **TaskStatus**: `PENDING`, `IN_PROGRESS`, `REVIEW`, `DONE`
- **SubStatus**: `ACTIVE`, `PAST_DUE`, `CANCELLED`, `TRIAL`
- **PaymentStatus**: `PENDING`, `PAID`, `FAILED`, `REFUNDED`

## API Endpoints

### Auth (`/api/auth`)
| Method | Endpoint          | Auth | Description                    |
|--------|-------------------|------|--------------------------------|
| POST   | /login            | No   | Login with email/password      |
| POST   | /register         | No   | Register new user              |
| GET    | /me               | Yes  | Get current user profile       |
| PATCH  | /me               | Yes  | Update name/activeWorkspaceId  |
| GET    | /google           | Yes  | Start Google OAuth2 flow       |
| GET    | /google/callback  | No   | Google OAuth2 callback         |
| DELETE | /google           | Yes  | Disconnect Google account      |
| POST   | /google/sync      | Yes  | Trigger full Google Tasks sync |

### Workspaces (`/api/workspaces`)
| Method | Endpoint      | Auth | Description                          |
|--------|---------------|------|--------------------------------------|
| GET    | /             | Yes  | List user's workspaces (accepted+paid) |
| POST   | /             | Yes  | Create new workspace                 |
| POST   | /invite       | Yes  | Invite member (Revolut checkout)     |
| GET    | /members      | Yes  | List workspace members               |
| DELETE | /members/:id  | Yes  | Remove member (GESTOR only)          |

### Tasks (`/api/tasks`)
| Method | Endpoint | Auth | Description                              |
|--------|----------|------|------------------------------------------|
| GET    | /        | Yes  | List workspace tasks                     |
| POST   | /        | Yes  | Create task                              |
| PATCH  | /:id     | Yes  | Update task (with version-based locking) |
| DELETE | /:id     | Yes  | Delete task                              |

### Attachments (`/api/tasks/:taskId/attachments`)
| Method | Endpoint | Auth | Description                              |
|--------|----------|------|------------------------------------------|
| GET    | /        | Yes  | List task attachments                    |
| POST   | /        | Yes  | Upload files (max 10, 50MB each)         |
| DELETE | /:id     | Yes  | Delete attachment                        |

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
| PATCH  | /subscription  | Yes  | Toggle autoRenew (GESTOR)            |
| GET    | /overview      | Yes  | Billing overview (SUPER_ADMIN)       |
| POST   | /manual-charge | Yes  | Generate manual charge (SUPER_ADMIN) |

### Notifications (`/api/notifications`)
| Method | Endpoint      | Auth | Description                          |
|--------|---------------|------|--------------------------------------|
| GET    | /stream       | Yes  | SSE real-time stream (30s heartbeat) |
| GET    | /             | Yes  | List notifications (paginated)       |
| GET    | /unread-count | Yes  | Get unread badge count               |
| PATCH  | /:id/read     | Yes  | Mark one as read                     |
| PATCH  | /read-all     | Yes  | Mark all as read                     |
| DELETE | /:id          | Yes  | Delete notification                  |

### Webhooks (`/api/webhooks`)
| Method | Endpoint      | Auth | Description                            |
|--------|---------------|------|----------------------------------------|
| POST   | /revolut      | No   | Revolut payment → activate membership  |
| POST   | /google-tasks | No   | Google Tasks push → sync               |

## Architecture Patterns

### Multi-tenancy
- Every API request includes an `X-Workspace-Id` header (set by `api.ts`).
- `tenantGuard` middleware verifies user has accepted+paid membership before processing.
- WorkspaceSwitcher only shows workspaces where `inviteAccepted === true && paymentStatus === 'PAID'`.

### State Management (Zustand)
- `useAuthStore` — login/logout, JWT in localStorage (`auth-storage`).
- `useWorkspaceStore` — workspace list, current workspace (`workspace-storage`).
- `useTaskStore` — task CRUD, optimistic status moves, sync tracking, AI task injection.
- `useNotificationStore` — SSE connection, notifications, unread count.

### Billing Formula
```
Total = Base_Plan (5.00 EUR) + (Active_Seats - 1) x 3.00 EUR
```
Owner seat is free. Recalculated on every invite/removal.

### Payment Flow
```
Invite → Revolut Checkout (3.00 EUR) → Webhook payment_success → Membership activated
```
Membership stays `inviteAccepted: false, paymentStatus: PENDING` until webhook confirms.

### Google Tasks Sync
- **Debounced** — rapid edits within 1.5s are batched into one sync request.
- **Conflict resolution** — if Google and local differ by < 2s, local wins.
- **Visual lock** — `TaskCard` shows a spinner overlay while syncing.
- **OAuth2** — `server/services/googleAuth.js` manages tokens + refresh.

### AI Meeting Processing
- **Constraint**: 60 minutes max per recording.
- **Flow**: Upload → Gemini 1.5 Flash → JSON `{ summary, suggestedTasks }` → "Approve" → inject into Kanban.

### Notifications (SSE)
- Server-Sent Events with 30s heartbeat.
- Auto-reconnect on connection loss (5s backoff).
- Types: `task_assigned`, `task_moved`, `invite_received`, `meeting_created`, `payment_success`.
- JWT passed via query param for EventSource compatibility.

### Optimistic Locking
- Tasks have a `version` field; updates must pass current version.
- Conflict returns 409 with `currentVersion` for client retry.

## Conventions & Guidelines

### Code Style
- **TypeScript** for all frontend code (`.tsx` / `.ts`).
- **JavaScript** (ES modules) for backend code (`.js`).
- **React functional components** — no class components (except ErrorBoundary).
- **Tailwind CSS** utility classes — avoid custom CSS.
- Commit messages: `feat:`, `fix:`, `refactor:`, `docs:`.

### Frontend
- Supports dark/light mode: `dark:` prefix classes throughout.
- Light: `bg-gray-100` base, `bg-white` cards. Dark: `bg-gray-950` base, `bg-gray-900` cards.
- All API calls go through `src/lib/api.ts` which auto-attaches JWT and workspace headers.
- ErrorBoundary wraps the Kanban board and the main content area.

### Backend
- All routes are modular in `server/routes/*.js`, receiving a `prisma` instance via closure.
- Wrap external integrations (Revolut, Google, Gemini) in `try-catch` with detailed `console.error`.
- Use Prisma for all database operations — never write raw SQL.
- Role guards: `requireRole()` for global roles, `requireWorkspaceRole()` for workspace roles.

### Security
- Passwords hashed with bcrypt (10 rounds).
- JWT auth with Bearer tokens (7-day expiry).
- Tenant isolation enforced at middleware level.
- Never expose `password` field in API responses (destructured out).
- `SUPER_ADMIN` password from environment variable only.
- File uploads: type validation, 50MB limit per file, 10 files max per request.

## Replit Deployment

### First-time setup
```bash
npm run replit:setup
```
Creates both DBs (prod + test), installs deps, generates Prisma, builds frontend.

### Secrets required in Replit
| Secret | Value |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (prod) |
| `DATABASE_URL_TEST` | PostgreSQL connection string (test) — auto-derived if omitted |
| `SUPER_ADMIN` | Admin password |
| `JWT_SECRET` | Secure signing key |

### Dual Database
- **Production**: `DATABASE_URL` — main app data
- **Test**: `DATABASE_URL_TEST` — isolated test data, auto-derived from prod URL if not set
- Helper: `scripts/db.js` exports `getPrisma(env)` and `cleanTestDb()`

## Stub Integrations (Ready for Production)

1. **Revolut Payments** — `server/services/billing.js` + `server/routes/webhooks.js`
2. **Google Tasks API** — `server/services/syncEngine.js` + `server/services/googleAuth.js`
3. **Gemini 1.5 Flash** — `server/services/ai.js` + `server/routes/meetings.js`

Each stub has commented production code showing the exact API calls needed.

## Language Notes

- UI strings and some comments are in **Portuguese (Brazilian/European)**. Maintain consistency when modifying nearby code.
