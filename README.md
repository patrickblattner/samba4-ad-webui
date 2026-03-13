# samba4-ad-webui

[![Build and Push Docker Image](https://github.com/patrickblattner/samba4-ad-webui/actions/workflows/docker.yml/badge.svg)](https://github.com/patrickblattner/samba4-ad-webui/actions/workflows/docker.yml)
[![Docker Image](https://img.shields.io/badge/ghcr.io-patrickblattner%2Fsamba4--ad--webui-blue?logo=docker)](https://ghcr.io/patrickblattner/samba4-ad-webui)

A web-based administration interface for Samba4 Active Directory, modeled after Microsoft RSAT "Active Directory Users and Computers" (ADUC).

## Features

- Manage **Users**, **Groups**, **Computers**, and **Organizational Units** via a familiar tree-based UI
- Properties dialogs with the same tab structure and attributes as Microsoft ADUC
- Built-in **Attribute Editor** for advanced AD object editing
- **Hybrid Bind authentication** -- all LDAP operations run under the logged-in user's identity (no service account required)
- LDAP and LDAPS support with configurable TLS settings
- Per-user rate limiting on API endpoints
- Runs as a single Docker container connecting to an external Samba4 Domain Controller
- Multi-architecture Docker images (amd64, arm64)

## Screenshots

Screenshots coming soon.

## Quick Start (Docker)

Pull and run the pre-built image from GitHub Container Registry:

```bash
docker pull ghcr.io/patrickblattner/samba4-ad-webui:latest

docker run -d \
  -p 3000:3000 \
  -e LDAP_URL=ldap://your-dc:389 \
  -e LDAPS_URL=ldaps://your-dc:636 \
  -e LDAP_BASE_DN=DC=example,DC=com \
  -e JWT_SECRET=your-secret-here \
  -e CREDENTIAL_ENCRYPTION_KEY=your-64-char-hex-key \
  ghcr.io/patrickblattner/samba4-ad-webui:latest
```

Open `http://localhost:3000` and log in with your AD credentials.

## Quick Start (Docker Compose)

1. Clone the repository:
   ```bash
   git clone https://github.com/patrickblattner/samba4-ad-webui.git
   cd samba4-ad-webui
   ```

2. Create a `.env` file in the project root (see [Environment Variables](#environment-variables)):
   ```bash
   cp .env.example .env
   # Edit .env with your Samba4 DC connection details
   ```

3. Start the application:
   ```bash
   docker compose -f docker/docker-compose.yml up --build
   ```

4. Open `http://localhost:3000`.

## Development Setup

### Prerequisites

- Node.js 22+
- npm 10+
- A Samba4 Domain Controller accessible via LDAP

### Setup

1. Clone and install dependencies:
   ```bash
   git clone https://github.com/patrickblattner/samba4-ad-webui.git
   cd samba4-ad-webui
   npm install
   ```

2. Configure environment:
   ```bash
   cp .env.example .env
   # Edit .env with your LDAP connection details
   ```

3. Start the development servers (frontend + backend):
   ```bash
   npm run dev
   ```

   This runs the Express backend and Vite dev server concurrently. The frontend is available at `http://localhost:5174` and proxies API requests to the backend on port 3001.

## Build

```bash
# Build all workspaces (shared, server, client)
npm run build

# Run tests
npm test

# Lint
npm run lint
```

## Tech Stack

| Layer            | Technology                                    |
|------------------|-----------------------------------------------|
| Frontend         | React, Vite, shadcn/ui (Radix UI + Tailwind CSS) |
| State Management | TanStack Query (server state), Zustand (UI state) |
| Backend          | Node.js, Express                              |
| LDAP Client      | ldapts (TypeScript-native)                    |
| Authentication   | JWT with AES-256-GCM encrypted credentials   |
| Language         | TypeScript (ES modules throughout)            |
| Monorepo         | npm workspaces (`shared/`, `server/`, `client/`) |
| Runtime          | Docker (Node 22 Alpine, multi-stage build)    |

## Architecture

```
Browser (React SPA)
    |
    | REST API (JSON)
    v
Express Backend
    |
    | LDAP/LDAPS (ldapts)
    v
Samba4 Domain Controller
```

1. The user performs an action in the web UI (e.g., create a user).
2. React sends a REST request to the Express backend.
3. Express translates the request into LDAP operations via `ldapts`.
4. LDAP operations execute under the identity of the logged-in user (Hybrid Bind).
5. The backend returns the result as JSON.
6. The frontend displays the result.

## Auth Model

**Hybrid Bind** -- no service account is needed.

- On login, the user provides AD credentials. The backend binds to the DC via LDAP to verify them. On success, a JWT is issued.
- The JWT contains the user's DN and AES-256-GCM-encrypted credentials.
- On every API request, the middleware decrypts the credentials, creates a fresh LDAP client, and binds as the user.
- All operations run under the logged-in user's AD permissions.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `LDAP_URL` | LDAP connection URL | `ldap://localhost:389` |
| `LDAPS_URL` | LDAPS connection URL | `ldaps://localhost:636` |
| `LDAP_BASE_DN` | Base DN for LDAP searches | `DC=lab,DC=dev` |
| `LDAP_TLS_REJECT_UNAUTHORIZED` | Reject untrusted TLS certificates | `true` (production) |
| `LDAP_CA_CERT_PATH` | Path to custom CA certificate (PEM) | -- |
| `JWT_SECRET` | Secret for signing JWTs | -- (required) |
| `JWT_EXPIRY` | JWT token expiry duration | `15m` |
| `CREDENTIAL_ENCRYPTION_KEY` | 32-byte hex key for credential encryption | -- (required) |
| `RATE_LIMIT_WRITE_WINDOW_MS` | Rate limit window for write operations (ms) | `60000` |
| `RATE_LIMIT_WRITE_MAX` | Max write operations per window | `30` |
| `RATE_LIMIT_READ_WINDOW_MS` | Rate limit window for read operations (ms) | `60000` |
| `RATE_LIMIT_READ_MAX` | Max read operations per window | `60` |
| `PORT` | Server port | `3001` (dev) / `3000` (Docker) |
| `NODE_ENV` | Environment mode | `development` |

## License

MIT
