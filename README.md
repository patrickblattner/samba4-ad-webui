# samba4-ad-webui

[![Build and Push Docker Image](https://github.com/patrickblattner/samba4-ad-webui/actions/workflows/docker.yml/badge.svg)](https://github.com/patrickblattner/samba4-ad-webui/actions/workflows/docker.yml)
[![Docker Image](https://img.shields.io/badge/ghcr.io-patrickblattner%2Fsamba4--ad--webui-blue?logo=docker)](https://ghcr.io/patrickblattner/samba4-ad-webui)

Lightweight web UI for managing a Samba4 Active Directory, modeled after Microsoft RSAT "Active Directory Users and Computers" (ADUC).

**Not a full AD management suite.** This tool is designed for developers and teams who need a simple directory service for testing AD-like operations — without spinning up a Windows Server. Pair it with a Samba4 DC (runs on any Linux box or in Docker) and you get a familiar ADUC-style interface for managing test users, groups, and OUs.

**What it manages:**

- Users, Groups, Computers, Organizational Units
- Properties dialogs with the same tab structure as ADUC
- Built-in Attribute Editor for advanced AD object editing

---

## Installation via Docker (recommended)

### Prerequisites

- Docker + Docker Compose v2
- Linux/macOS host (or WSL2 on Windows)
- [GitHub CLI (`gh`)](https://cli.github.com/) -- for authenticating with the private repo and container registry

### Authenticate (one-time)

```bash
gh auth login
echo $(gh auth token) | docker login ghcr.io -u $(gh api user -q .login) --password-stdin
```

### Option 1: Combined Mode (DC + Web UI)

A complete AD test environment — includes a Samba4 Domain Controller, the Web UI, and optional test data (users, groups, OUs). Ideal for development and testing.

```bash
mkdir samba4-ad-webui && cd samba4-ad-webui
gh api repos/patrickblattner/samba4-ad-webui/contents/setup.sh -q .content | base64 -d > setup.sh
gh api repos/patrickblattner/samba4-ad-webui/contents/docker/docker-compose.yml -q .content | base64 -d > docker/docker-compose.yml
bash setup.sh
```

The wizard will ask for:

- **Domain name** — e.g. `lab.dev`
- **Admin password** — for the AD Administrator account
- **Network binding** — internal only (127.0.0.1) or external (0.0.0.0)
- **Test data** — optionally create sample users, groups, and OUs
- **SSL mode** — `self-signed` (recommended) or `none`
- **Port** — HTTPS (443) or HTTP (3000)

Select **[1] Combined** when prompted.

### Option 2: Standalone Mode (Web UI only)

Connects to your existing Samba4 Domain Controller via LDAP/LDAPS.

```bash
mkdir samba4-ad-webui && cd samba4-ad-webui
gh api repos/patrickblattner/samba4-ad-webui/contents/setup.sh -q .content | base64 -d > setup.sh
bash setup.sh
```

The wizard will ask for:

- **DC hostname/IP** — your Samba4 Domain Controller (e.g. `dc01.example.local`)
- **LDAP Base DN** — e.g. `DC=example,DC=local`
- **LDAP protocol** — LDAPS (recommended) or LDAP
- **SSL mode** — `self-signed` (recommended) or `none`
- **Port** — HTTPS (443) or HTTP (3000)

Select **[2] Standalone** when prompted.

### Updating

```bash
# Combined mode
docker compose -f docker/docker-compose.yml pull
docker compose -f docker/docker-compose.yml up -d

# Standalone mode
docker compose -f docker/docker-compose.standalone.yml pull
docker compose -f docker/docker-compose.standalone.yml up -d
```

### Teardown

Remove all containers, volumes, and generated configuration:

```bash
bash teardown.sh
```

### Auth Model

**Hybrid Bind** -- no service account is needed.

- On login, provide your AD credentials. The backend binds to the DC via LDAP to verify them.
- A JWT is issued containing the user's DN and AES-256-GCM-encrypted credentials.
- All LDAP operations run under the logged-in user's AD permissions.

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DEPLOY_MODE` | Deployment mode (`combined` or `standalone`) | `combined` |
| `LDAP_URL` | LDAP connection URL | `ldap://samba-ad:389` |
| `LDAPS_URL` | LDAPS connection URL | `ldaps://samba-ad:636` |
| `LDAP_BASE_DN` | Base DN for LDAP searches | `DC=lab,DC=dev` |
| `LDAP_TLS_REJECT_UNAUTHORIZED` | Reject untrusted TLS certificates | `false` |
| `LDAP_CA_CERT_PATH` | Path to custom CA certificate (PEM) | -- |
| `JWT_SECRET` | Secret for signing JWTs | -- (required) |
| `JWT_EXPIRY` | JWT token expiry duration | `8h` |
| `CREDENTIAL_ENCRYPTION_KEY` | 32-byte hex key for credential encryption | -- (required) |
| `SSL_MODE` | SSL mode for the web UI (`self-signed` or `none`) | `none` |
| `SSL_DOMAIN` | Hostname for the self-signed certificate | -- |
| `APP_PORT` | External port (host-side) | `443` or `3000` |
| `APP_INTERNAL_PORT` | Internal container port | `443` or `3000` |
| `SAMBA_DOMAIN` | NetBIOS domain name (combined mode only) | `LAB` |
| `SAMBA_REALM` | Kerberos realm (combined mode only) | `LAB.DEV` |
| `SAMBA_REALM_LOWER` | Lowercase realm (combined mode only) | `lab.dev` |
| `SAMBA_ADMIN_PASS` | AD admin password (combined mode only) | -- |
| `BIND_IP` | Network bind address (combined mode only) | `127.0.0.1` |
| `DNS_FORWARDER` | DNS forwarder for the DC (combined mode only) | `8.8.8.8` |
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

To build the Docker image locally instead of pulling it, uncomment the `build` section in the compose file:

```bash
docker compose -f docker/docker-compose.yml build
docker compose -f docker/docker-compose.yml up -d
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
