# samba4-ad-webui

## What this project does

Web-UI für Samba4 Active Directory Administration. Das Frontend (React + shadcn/ui) kommuniziert mit einem Node.js/Express-Backend, das per LDAP/LDAPS direkt mit dem Samba4 AD kommuniziert (`ldapts`). Die App läuft als eigenständiger Docker-Container und verbindet sich mit einem externen Samba4 DC.

**Scope:** Benutzer, Gruppen und Computerobjekte verwalten — kein DNS, keine GPOs.

**Vorbild:** Microsoft RSAT "Active Directory Users and Computers" (ADUC/MMC Snap-in). Die Web-UI soll sich möglichst nahe am Original anfühlen — gleiche Attribute, gleiche Tab-Struktur in den Properties-Dialogen, inkl. Attribute Editor.

## Key references

- `BACKLOG.md` — Kanban board with all open tasks, features, and bugs
- `AGENTS.md` — coding rules, conventions, build commands

## Project management — dual tracking rule

Tasks are tracked in **two places simultaneously** — always keep both in sync:

1. **`BACKLOG.md`** (local) — Kanban columns: Backlog / Todo / In Progress / Done
2. **GitHub Issues + Project Board**

Use `/task setup` to configure GitHub integration for this project.

## Architecture

### Tech Stack
- **Frontend:** React + Vite + shadcn/ui (Radix UI + Tailwind CSS)
- **State Management:** TanStack Query (Server-State) + Zustand (UI-State)
- **Backend:** Node.js / Express
- **LDAP Client:** ldapts (TypeScript-native)
- **Auth:** JWT with AES-256-GCM encrypted AD credentials (hybrid bind)
- **Target Runtime:** Docker-Container (App only, connects to external Samba4 DC via LDAP)
- **Monorepo:** npm workspaces: `shared/`, `server/`, `client/`
- **Language:** TypeScript throughout, ES modules

### Folder Structure
```
samba4-ad-webui/
├── shared/              # Shared TypeScript types (@samba-ad/shared)
│   └── src/types/       # API, Auth, User, Group, Computer, OU, Tree, LDAP types
├── client/              # React Frontend (Vite + shadcn/ui)
│   └── src/
│       ├── components/  # React Components (ui/, layout/, tree/, objects/, users/, ...)
│       ├── pages/       # LoginPage, DirectoryPage
│       ├── api/         # API Client / Fetch-Wrapper
│       ├── hooks/       # TanStack Query hooks
│       ├── stores/      # Zustand stores
│       └── App.tsx
├── server/              # Node.js/Express Backend
│   └── src/
│       ├── routes/      # Express Route Handler
│       ├── services/    # LDAP operations (ldapts wrapper)
│       ├── middleware/   # Auth, Error Handler
│       └── utils/       # DN parsing, UAC helpers, password encoding
├── docker/              # Dockerfile & Docker Compose (App container)
├── CLAUDE.md
├── AGENTS.md
├── BACKLOG.md
└── package.json         # Root package.json (Workspaces)
```

### Wie es funktioniert
1. User führt eine Aktion im Web-UI aus (z.B. "Benutzer erstellen")
2. React sendet REST-Request an Express-Backend
3. Express übersetzt den Request in LDAP-Operationen via `ldapts`
4. LDAP-Operationen werden unter der Identität des eingeloggten Users ausgeführt (Hybrid Bind)
5. Backend gibt das Ergebnis als JSON zurück
6. Frontend zeigt Ergebnis an

### Auth: Hybrid Bind
- Login: User gibt AD-Credentials ein → Backend bindet via LDAP → bei Erfolg JWT ausgestellt
- JWT enthält User-DN + AES-256-GCM-verschlüsselte Credentials
- Jede API-Anfrage: Middleware entschlüsselt Credentials, erstellt frischen LDAP-Client, bindet als User
- Kein Service Account — alle Operationen laufen unter der Identität des eingeloggten Users

## Build & Development Commands

```bash
# Install dependencies (alle Workspaces)
npm install

# Development (Frontend + Backend parallel)
npm run dev

# Nur Frontend
npm run dev:client

# Nur Backend
npm run dev:server

# Build
npm run build

# Tests
npm test

# Lint
npm run lint

# Docker
docker compose -f docker/docker-compose.yml up --build
```
