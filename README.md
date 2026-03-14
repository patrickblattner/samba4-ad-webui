# samba4-ad-webui

[![Build and Push Docker Image](https://github.com/patrickblattner/samba4-ad-webui/actions/workflows/docker.yml/badge.svg)](https://github.com/patrickblattner/samba4-ad-webui/actions/workflows/docker.yml)
[![Docker Image](https://img.shields.io/badge/ghcr.io-patrickblattner%2Fsamba4--ad--webui-blue?logo=docker)](https://ghcr.io/patrickblattner/samba4-ad-webui)

Web-based administration interface for Samba4 Active Directory, modeled after Microsoft RSAT "Active Directory Users and Computers" (ADUC).

**What it manages:**

- Users, Groups, Computers, Organizational Units
- Properties dialogs with the same tab structure as ADUC
- Built-in Attribute Editor for advanced AD object editing

---

## Installation via Docker (recommended)

### Prerequisites

- Docker + Docker Compose
- Linux/macOS host (or WSL2 on Windows)
- [GitHub CLI (`gh`)](https://cli.github.com/) -- for authenticating with the private repo and container registry

### Setup

No need to clone the repository. Run each step separately:

**Step 1 -- Authenticate GitHub CLI** (one-time, interactive)

```bash
gh auth login
```

**Step 2 -- Authenticate Docker with the GitHub Container Registry**

```bash
echo $(gh auth token) | docker login ghcr.io -u $(gh api user -q .login) --password-stdin
```

**Step 3 -- Download `setup.sh` and run the wizard**

```bash
mkdir samba4-ad-webui && cd samba4-ad-webui
gh api repos/patrickblattner/samba4-ad-webui/contents/setup.sh -q .content | base64 -d > setup.sh
bash setup.sh
```

**Step 4 -- Start the application**

```bash
docker compose up -d
```

The setup script creates `docker-compose.yml`, the `.env` file, and all required directories -- no additional downloads needed.

The setup wizard will ask for:

- **Samba4 DC Hostname** -- the domain controller to connect to (e.g. `dc01.example.local`)
- **LDAP Base DN** -- the base DN for searches (e.g. `DC=example,DC=local`)
- **LDAP Protocol** -- `LDAPS` (recommended) or `LDAP` (unencrypted)
- **SSL mode** -- `self-signed` (recommended for internal use) or `none` (HTTP only)
- **Port** -- HTTPS port (default `443`) or HTTP port (default `3000`)

After the first start with self-signed SSL, the app generates a certificate automatically. Browsers will show a security warning -- add an exception or import `certs/server.crt` into your company CA.

### Updating

```bash
docker compose pull
docker compose up -d
```

### Auth Model

**Hybrid Bind** -- no service account is needed.

- On login, provide your AD credentials. The backend binds to the DC via LDAP to verify them.
- A JWT is issued containing the user's DN and AES-256-GCM-encrypted credentials.
- All LDAP operations run under the logged-in user's AD permissions.

### Environment Variables

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
| `SSL_MODE` | SSL mode for the web UI (`self-signed` or `none`) | `none` |
| `SSL_DOMAIN` | Hostname for the self-signed certificate | -- |
| `SSL_CERT_PATH` | Path to custom SSL certificate | `./certs/server.crt` |
| `SSL_KEY_PATH` | Path to custom SSL key | `./certs/server.key` |
| `APP_PORT` | External port (host-side) | `443` or `3000` |
| `APP_INTERNAL_PORT` | Internal container port | `443` or `3000` |
| `RATE_LIMIT_WRITE_WINDOW_MS` | Rate limit window for write operations (ms) | `60000` |
| `RATE_LIMIT_WRITE_MAX` | Max write operations per window | `30` |
| `RATE_LIMIT_READ_WINDOW_MS` | Rate limit window for read operations (ms) | `60000` |
| `RATE_LIMIT_READ_MAX` | Max read operations per window | `60` |
| `PORT` | Server port | `3001` (dev) / `3000` (Docker) |
| `NODE_ENV` | Environment mode | `development` |

---

## Local development

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

### Build

```bash
# Build all workspaces (shared, server, client)
npm run build

# Run tests
npm test

# Lint
npm run lint
```

---

## For developers

Clone the repository and build the image locally:

```bash
git clone https://github.com/patrickblattner/samba4-ad-webui.git
cd samba4-ad-webui
```

To build the Docker image locally instead of pulling it, uncomment the `build` section in `docker-compose.yml`:

```bash
docker compose build
docker compose up -d
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

## License

MIT
