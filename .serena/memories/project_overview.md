# Project Overview

**Purpose:** Web UI for Samba4 Active Directory administration, modeled after Microsoft RSAT ADUC (Active Directory Users and Computers). Manages users, groups, and computer objects — no DNS, no GPOs.

**Tech Stack:**
- **Monorepo:** npm workspaces (`shared/`, `server/`, `client/`)
- **Frontend:** React + Vite + shadcn/ui (Radix UI + Tailwind CSS), TanStack Query + Zustand
- **Backend:** Node.js / Express
- **LDAP Client:** ldapts (TypeScript-native)
- **Auth:** JWT with AES-256-GCM encrypted AD credentials (hybrid bind — no service account)
- **Language:** TypeScript throughout, ES modules
- **Runtime:** Docker container connecting to external Samba4 DC

**Architecture:** User action → React REST request → Express backend → LDAP operations via ldapts → JSON response → UI update. All LDAP operations run under the logged-in user's identity (hybrid bind).

**Structure:**
- `shared/src/types/` — shared TypeScript types
- `client/src/` — React frontend (components, pages, api, hooks, stores)
- `server/src/` — Express backend (routes, services, middleware, utils)
- `docker/` — Dockerfile & Docker Compose