# samba4-ad-webui

## What this project does

Web-UI für Samba4 Active Directory Administration. Das Frontend (React + shadcn/ui) kommuniziert mit einem Node.js/Express-Backend, das per LDAP/LDAPS direkt mit dem Samba4 AD kommuniziert (`ldapts`). Die App läuft als eigenständiger Docker-Container und verbindet sich mit einem externen Samba4 DC.

**Scope:** Benutzer, Gruppen und Computerobjekte verwalten — kein DNS, keine GPOs.

**Vorbild:** Microsoft RSAT "Active Directory Users and Computers" (ADUC/MMC Snap-in). Die Web-UI soll sich möglichst nahe am Original anfühlen — gleiche Attribute, gleiche Tab-Struktur in den Properties-Dialogen, inkl. Attribute Editor.

## Key references

- `BACKLOG.md` — Kanban board with all open tasks, features, and bugs
- `AGENTS.md` — coding rules, conventions, build commands

## ⛔ MANDATORY — Task & Workflow Rules (NO EXCEPTIONS)

**You MUST follow these rules for ALL work, no matter how small. Violations are unacceptable.**

### Rule 1: You are the PM — you NEVER write code

You are the Project Manager. You orchestrate work by spawning sub-agents. You MUST NOT:
- Edit, create, or modify any source code files, config files, or test files
- Use the Edit, Write, or NotebookEdit tools on any project source files
- "Quickly fix" something yourself instead of delegating

The ONLY files you may modify directly: BACKLOG.md, worklog files, CLAUDE.md.
See `/workflow` skill for full orchestration details, task type classification, and worklog format.

### Rule 2: NEVER code without a ticket

Before ANY code is written (by a sub-agent), a ticket MUST exist and be in "In Progress" state.
- No ticket exists? → `/task create` first, then `/task start`
- Ticket exists? → `/task start` before any work begins
- This applies to one-line fixes, typo corrections, and trivial changes.
- See `/task` skill for ticket creation, lifecycle commands, and GitHub sync.

### Rule 3: Two-Phase Pipeline — Implementation per ticket, Review as batch

Work is split into two phases. Both are mandatory.

**PHASE 1 — Implementation (per ticket):**

For non-bug tickets (feature, enhancement, refactor, etc.):
```
/task create → /task start
→ Spawn Planner (read ~/.claude/agents/planner.md) → receives plan
→ Spawn Coder(s) (read ~/.claude/agents/coder.md) → implement + commit
→ Quick build check (run build + lint to verify nothing is broken)
→ /task done
→ next ticket
```

For simple changes (any type, skip Planner if ALL criteria met: ≤3 files, no new patterns/deps, request IS the plan):
```
/task create → /task start
→ PM writes instructions directly (no Planner needed)
→ Spawn Coder (read ~/.claude/agents/coder.md) → implement + commit
→ Quick build check
→ /task done
→ next ticket
```

For bugs (`type: bug` only — no Planner):
```
/task create (type: bug) → /task start
→ Spawn Coder (read ~/.claude/agents/coder.md) → debug, fix, commit
→ Quick build check
→ /task done
→ next ticket
```

**PHASE 2 — Review (only for complex changes or on request):**

The Review Phase does NOT run for simple changes or single bug fixes — Quick Build Check is sufficient.
It runs automatically for standard flow (with Planner) or multiple tickets, and on manual request via `/workflow review`.

```
→ Spawn QA agent (read ~/.claude/agents/qa.md) → tests + verification suite
→ Spawn Security agent (read ~/.claude/agents/security.md) → security review
→ Spawn Reviewer agent (read ~/.claude/agents/reviewer.md) → code review
→ Findings? → Spawn Coder to fix → re-run QA + Security + Reviewer (max 2 cycles)
→ Improvement suggestions? → create new backlog tickets (do NOT fix now)
→ git push
→ Wait for GitHub Actions workflow → if failed: Coder fixes + push (max 2 cycles)
→ Report to user (summary + CI status)
```

**Self-check before reporting to user:**
- [ ] Did every ticket go through Implementation (Planner + Coder, or Coder for bugs/simple changes)?
- [ ] Did I run `/task done` for every ticket?
- [ ] Did I NOT code anything myself? All code was written by Coder agents?
- [ ] If Review Phase was required: did I run it (QA + Security + Reviewer)?
- [ ] Did I push after completion?

If ANY checkbox is NO → go back and complete the missing step.

See `/workflow` skill for detailed pipeline logic, fix-loop limits, worktree merge procedure, and git strategy.

### Rule 4: ALWAYS close tickets before the Review Phase

Each ticket gets `/task done` after its Coder finishes. The Review Phase runs after all tickets are closed.
NEVER tell the user "it's done" before the Review Phase has passed.

### Rule 5: Dual tracking

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
