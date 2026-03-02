# Task 360 Engine — Implementation Plan

## Phase 0: Architecture & Data Safety
- [x] Prisma schema with all models (User, Workspace, Membership, Task, Meeting, Subscription, PasswordReset)
- [x] Enums: Role, WorkspaceRole, TaskStatus, SubStatus
- [x] TypeScript type definitions (`src/types/index.ts`)
- [x] tsconfig.json for frontend
- [x] Zustand stores: useAuthStore, useWorkspaceStore, useTaskStore
- [x] API client utility (`src/lib/api.ts`)

## Phase 1: Workspace Switching & Invite System
- [x] React Router setup with protected routes
- [x] AppLayout with Sidebar + Header
- [x] WorkspaceSwitcher component (Select, filters by inviteAccepted)
- [x] LoginPage with email/password
- [x] DashboardPage with overview cards
- [x] InviteModal component (email input → Revolut checkout stub)
- [x] Backend: Auth routes (login, register, me)
- [x] Backend: Workspace routes (CRUD, switch, invite)
- [x] Backend: Auth middleware (JWT)
- [x] Backend: Tenant guard middleware (workspace isolation)

## Phase 2: Google Tasks Bi-directional Sync
- [x] TaskCard with sync lock/loading visual
- [x] SyncEngine service (debounced updates, last-write-wins)
- [x] Backend: Task routes (CRUD, scoped by workspace)
- [x] Backend: Google Tasks webhook endpoint (stub)
- [x] Conflict resolution logic (updatedAt comparison, 2s threshold)

## Phase 3: AI Meeting Module (Gemini 1.5 Flash)
- [x] MeetingList component
- [x] MeetingUpload with 60-min banner constraint
- [x] Backend: Meeting routes (CRUD, upload, AI process)
- [x] AI service stub (Gemini 1.5 Flash integration point)
- [x] "Approve Tasks" flow (suggested tasks → Kanban injection)

## Phase 4: Dynamic Billing & Admin Dashboard
- [x] BillingDashboard (global view by Gestor)
- [x] UserManagement component
- [x] SettingsPage with auto-renew toggle
- [x] Backend: Billing routes (subscription, manual charge)
- [x] Backend: Revolut webhook handler (stub)
- [x] Billing calculation: Base(5.00) + (Active_Invites × 3.00)

## Phase 5: Landing Page & Mobile UX
- [x] Public Landing Page at `/` (hero, features grid, pricing teaser, CTA, footer)
- [x] Mobile navigation as app dashboard grid (3-column icon grid, overlay panel)
- [x] Desktop sidebar hidden on mobile (`hidden md:flex`)
- [x] Header responsiveness (compact on mobile, search icon toggle)
- [x] Route restructure: `/` → Landing, `/dashboard` → Dashboard (protected)
- [x] LoginPage redirects to `/dashboard` after auth

## Infrastructure
- [x] .gitignore
- [x] Updated package.json with all dependencies
- [x] ErrorBoundary component
- [x] Updated CLAUDE.md with new architecture
