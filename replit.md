# Task 360.co OS

## Overview
Task 360.co is a full-stack task management and team collaboration platform built with React (frontend) and Express (backend) using PostgreSQL for data storage.

## Project Architecture
- **Frontend**: React 18 with Vite, Tailwind CSS (CDN), Lucide React icons, Recharts
- **Backend**: Express.js API server on port 3001
- **Database**: PostgreSQL (Replit built-in, uses DATABASE_URL env var)
- **Authentication**: bcryptjs for password hashing, session-based auth

## Project Structure
```
/                     # Root
├── index.html        # Entry HTML (Tailwind CDN, Inter font)
├── index.tsx         # React entry point
├── App.tsx           # Main app component (routing, auth, state)
├── types.ts          # TypeScript type definitions
├── i18n.ts           # Internationalization (pt, en, es, it)
├── vite.config.ts    # Vite config (port 5000, proxy to backend 3001)
├── tsconfig.json     # TypeScript config
├── server.js         # Express backend (port 3001)
├── init.sql          # Database initialization script (reference only)
├── components/       # React components
│   ├── Dashboard.tsx
│   ├── KanbanBoard.tsx
│   ├── LandingPage.tsx
│   ├── MeetingRoom.tsx
│   ├── ChatWindow.tsx
│   └── UserManagement.tsx
└── services/
    └── liveClient.ts # Gemini AI Live Client for meetings
```

## Key Configuration
- **Frontend (Vite)**: Runs on port 5000, proxies `/api` to Express on port 3001
- **Backend (Express)**: Runs on port 3001, serves API routes under `/api`
- **Database**: Auto-initializes tables (users, tasks, meetings) and seeds super admin on startup

## Running
The workflow runs both servers: `node server.js & npx vite --host 0.0.0.0 --port 5000`

## Default Login
- Email: admin@ecom360.co
- Password: Admin2026*

## Recent Changes
- Configured for Replit environment (port 5000, allowed hosts, proxy setup)
- Removed conflicting importmap from index.html
- Fixed process.env reference for browser compatibility
