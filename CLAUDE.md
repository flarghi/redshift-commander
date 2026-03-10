# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Redshift Commander is a single-container full-stack webapp for managing Amazon Redshift permissions (GRANT/REVOKE for tables, schemas, databases, default privileges, and roles). No local database — connects directly to Redshift via `pg`.

## Commands

```bash
npm run dev              # Run backend (nodemon+ts-node) and frontend (vite) concurrently
npm run dev:backend      # Backend only (port 3000 by default)
npm run dev:frontend     # Frontend only (cd src/frontend && vite)
npm run build            # Full production build (installs frontend deps, compiles TS, builds Vite, copies to public/)
npm start                # Run production server (node dist/server.js)
cd src/frontend && npm run lint   # ESLint for frontend
```

Docker build: `deployment/build.sh` builds multi-arch (amd64/arm64) and pushes to Docker Hub (`flarghi/redshift-commander`).

## Architecture

**Monorepo with two TypeScript projects:**

- **Backend** (`src/`): Express server compiled with `tsc` to `dist/`. Root `tsconfig.json` excludes `src/frontend`.
- **Frontend** (`src/frontend/`): React + Vite app with its own `package.json`, `tsconfig.json`, and `node_modules`. Built output is copied to `public/` and served as static files by Express.

### Backend Structure (`src/`)

- `server.ts` — Express app setup, mounts all route groups under `/api/*`, serves `public/` as static + SPA fallback
- `types.ts` — Shared TypeScript interfaces (`RedshiftConnection`, `GrantRequest`, `ApiResponse`, etc.)
- `routes/` — Express routers, one per domain:
  - `connect.ts` — Connection management (connect/disconnect/test)
  - `objects.ts` — Schemas, tables, views discovery
  - `users.ts` — User/group/role CRUD
  - `permissions.ts` — Current privilege queries
  - `grants.ts` — GRANT/REVOKE execution (transaction-wrapped)
  - `preview.ts` — SQL preview generation (largest file, handles all 5 grant types)
- `utils/`
  - `serverSessionManager.ts` — In-memory session store (singleton, 1h timeout, no password stored)
  - `sqlUtils.ts` — SQL injection prevention: `quoteIdentifier()`, safe query builders
  - `validationSchemas.ts` — Zod schemas for all API inputs
  - `validationMiddleware.ts` — Express middleware wrappers (`validateBody`, `validateQuery`, `validateParams`)

### Frontend Structure (`src/frontend/src/`)

- `App.tsx` — Root component: shows `ConnectionForm` or `MainInterface`
- `store/store.ts` — Zustand store (single store for all app state: connection, selections, identities, objects, preview)
- `api.ts` — Axios-based API client for all backend endpoints
- `types.ts` — Frontend-specific TypeScript types
- `components/` — UI components (Chakra UI v2):
  - `ConnectionForm.tsx`, `MainInterface.tsx`, `IdentitiesSection.tsx`, `ObjectsSection.tsx`, `PreviewSection.tsx`, `PreviewModal.tsx`, `BottomBar.tsx`
- `theme.ts` — Chakra UI theme customization
- `utils/` — UI helpers (badge styling, session management, text measurement, string utils)

### Key Patterns

- **Session-based connections**: Backend creates a session ID on connect, frontend sends it with every request. Password is never stored server-side.
- **Zod validation on all routes**: Every route uses `validateBody`/`validateQuery` middleware with schemas from `validationSchemas.ts`.
- **SQL safety**: All identifiers go through `quoteIdentifier()` in `sqlUtils.ts`. SQL injection patterns are blocked at the Zod validation layer.
- **Transaction safety**: Grant/revoke operations in `grants.ts` are wrapped in BEGIN/COMMIT/ROLLBACK.
- **5 action types**: Table privileges, default privileges, schema privileges, database privileges, and role assignments — each with distinct SQL generation logic in `preview.ts`.
