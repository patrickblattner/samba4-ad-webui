# Suggested Commands

## Development
- `npm install` — Install all workspace dependencies
- `npm run dev` — Run frontend + backend concurrently
- `npm run dev:client` — Frontend only (Vite, http://localhost:5174/)
- `npm run dev:server` — Backend only

## Build & Quality
- `npm run build` — Build all workspaces (shared → server → client)
- `npm run lint` — ESLint across server + client
- `npm test` — Run tests across all workspaces

## Docker
- `docker compose -f docker/docker-compose.yml up --build`

## Git
- Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`
- Always `git add .` (not selective staging)
- Push to `main` after each commit

## System (macOS/Darwin)
- `git`, `ls`, `cd`, `grep`, `find` — standard unix commands available