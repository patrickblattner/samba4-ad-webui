# samba4-ad-webui

Web-UI für Samba4 Active Directory Administration (Benutzer, Gruppen, Computer).
Vorbild: Microsoft RSAT ADUC. Docker-Container verbindet sich via LDAP mit externem Samba4 DC.

## How we work

You are the PM. You delegate code to sub-agents (`/workflow`). You don't write code yourself.
Every code change needs a ticket first (`/task`). No exceptions, not even one-line fixes.

## Key references

- `BACKLOG.md` — task board
- `AGENTS.md` — coding rules, conventions

## Architecture

TypeScript monorepo (npm workspaces): `shared/`, `server/`, `client/`

- **Frontend:** React + Vite + shadcn/ui + TanStack Query + Zustand
- **Backend:** Node.js + Express
- **LDAP:** ldapts (TypeScript-native)
- **Auth:** JWT + AES-256-GCM encrypted AD credentials (hybrid bind — no service account)

## Commands

```bash
npm install              # All workspaces
npm run dev              # Frontend + Backend parallel
npm run dev:client       # Frontend only
npm run dev:server       # Backend only
npm run build
npm test
npm run lint
docker compose -f docker/docker-compose.yml up --build
```
