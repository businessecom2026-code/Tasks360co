# CLAUDE.md — Ecom360 Task Management App

## Project Overview

**Ecom360** (Tasks360co) is a task/project management web application built with React + TypeScript on the frontend and an Express.js + PostgreSQL backend. The app features user authentication, Kanban-style task boards, meeting management, and multi-company support. The UI uses Tailwind CSS with a dark theme.

The frontend is currently in a "reset" state — the `App.tsx` is a minimal placeholder ready for rebuilding. The backend (`server.js`) contains a functional API with login, database initialization, and static file serving.

## Tech Stack

| Layer       | Technology                              |
|-------------|-----------------------------------------|
| Frontend    | React 18, TypeScript, Vite              |
| Styling     | Tailwind CSS 3.4, PostCSS, Autoprefixer |
| Icons       | lucide-react                            |
| Backend     | Express.js (ES modules)                 |
| Database    | PostgreSQL (via `pg` / `pg.Pool`)       |
| Auth        | bcryptjs for password hashing           |
| Config      | dotenv (`.env` files)                   |

## Project Structure

```
Tasks360co/
├── index.html           # Vite HTML entry point
├── package.json         # Dependencies and scripts
├── server.js            # Express production server (API + static serving)
├── vite.config.ts       # Vite dev server config (proxy /api to backend)
├── tailwind.config.js   # Tailwind CSS configuration
├── postcss.config.js    # PostCSS with Tailwind + Autoprefixer
├── src/
│   ├── main.tsx         # React entry point (renders <App />)
│   ├── App.tsx          # Root component (currently placeholder)
│   └── index.css        # Tailwind directives (@tailwind base/components/utilities)
└── dist/                # Production build output (served by Express)
```

## Development Commands

```bash
npm install         # Install dependencies
npm run dev         # Start Vite dev server (port 3000)
npm run build       # TypeScript check + Vite production build (outputs to dist/)
npm run lint        # ESLint with TypeScript rules (zero warnings policy)
npm run preview     # Preview production build locally
```

## Backend / Server

- **server.js** is an Express server using ES modules (`"type": "module"` in package.json).
- Serves the built frontend from `dist/` and handles API routes.
- Uses a PostgreSQL connection pool when `DATABASE_URL` env var is set; otherwise, in-memory mock arrays are available (but login only works with Postgres).
- On startup, `initDB()` creates tables (`users`, `tasks`, `meetings`, `password_resets`) and upserts a super admin user.

### Database Schema

| Table             | Key Columns                                                           |
|-------------------|-----------------------------------------------------------------------|
| `users`           | id, name, email (unique), password (bcrypt hash), role, company, avatar |
| `tasks`           | id, title, description, status (default PENDING), assignee, due_date, image, color, company |
| `meetings`        | id, title, date, time, participants (TEXT[]), link, platform, company  |
| `password_resets`  | email (PK), token, expires_at (TIMESTAMP)                            |

### User Roles

- `SUPER_ADMIN` — System-level admin created on startup

### API Endpoints

- `POST /api/login` — Authenticate with email/password, returns user object on success

## Environment Variables

| Variable       | Required | Description                                |
|----------------|----------|--------------------------------------------|
| `DATABASE_URL` | Yes      | PostgreSQL connection string               |
| `SUPER_ADMIN`  | Yes      | Password for the default admin user        |
| `ADMIN_EMAIL`  | No       | Admin email (default: `admin@ecom360.co`)  |
| `PORT`         | No       | Server port (default: `3000`)              |

**Never commit `.env` files or secrets to the repository.**

## Conventions & Guidelines

### Code Style
- **TypeScript** for all frontend code (`.tsx` / `.ts` files).
- **ES Modules** throughout — use `import`/`export`, no `require()`.
- **React functional components** with `React.FC` type annotations.
- **Tailwind CSS utility classes** for styling — avoid custom CSS unless absolutely necessary.
- Commit messages follow conventional format: `feat:`, `fix:`, `refactor:`, etc.

### Frontend Patterns
- Entry point: `src/main.tsx` renders `<App />` inside `React.StrictMode`.
- Tailwind is configured to scan `index.html` and all `src/**/*.{js,ts,jsx,tsx}` files.
- Vite proxies `/api` requests to the backend during development.
- Dark theme: the app uses `bg-gray-900` with white/gray text as the base UI palette.

### Backend Patterns
- All server code lives in a single `server.js` file.
- The server wraps everything in an `async startServer()` to allow top-level `await`.
- Parameterized queries (`$1`, `$2`, ...) are used for all SQL — never concatenate user input.
- The fallback route `app.get('*')` serves `dist/index.html` for client-side routing.

### Security
- Passwords are hashed with `bcrypt` (10 salt rounds).
- SQL uses parameterized queries to prevent injection.
- SSL is configured for external PostgreSQL connections (`rejectUnauthorized: false`).
- The `SUPER_ADMIN` secret must be set via environment variable, never hardcoded.

## Build & Deploy

1. `npm run build` — compiles TypeScript and bundles the frontend into `dist/`.
2. `node server.js` — starts the production server, serving `dist/` and API routes.
3. The server binds to `0.0.0.0` on the configured `PORT` for container/cloud deployment.

## Language Notes

- Some code comments and UI strings are in **Portuguese (Brazilian)**, reflecting the project's origin. Maintain consistency with existing language when modifying nearby code.
