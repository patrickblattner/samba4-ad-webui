#!/bin/bash
# ============================================================================
# Samba4 AD WebUI — Setup Wizard
# Supports two deployment modes:
#   1) Combined  — Samba4 DC + Web UI (for development/testing)
#   2) Standalone — Web UI only (connects to an existing Samba4 DC)
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ── Preflight checks ────────────────────────────────────────────────────────

command -v docker >/dev/null 2>&1 || error "Docker is not installed."
docker info >/dev/null 2>&1     || error "Docker is not running. Please start Docker Desktop."

# Check for docker compose (v2 plugin)
if ! docker compose version >/dev/null 2>&1; then
  error "Docker Compose v2 is not available. Install it via: https://docs.docker.com/compose/install/"
fi

# ── Mode selection ───────────────────────────────────────────────────────────

echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  Samba4 AD WebUI — Setup Wizard${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo "  Deployment modes:"
echo ""
echo "  [1] Combined   — Samba4 DC + Web UI"
echo "      Full AD test environment. Includes a Samba4 Domain Controller,"
echo "      the Web UI, and optional test data (users, groups, OUs)."
echo ""
echo "  [2] Standalone — Web UI only"
echo "      Connects to your existing Samba4 DC via LDAP/LDAPS."
echo ""
read -rp "Select mode [1]: " MODE_CHOICE
MODE_CHOICE="${MODE_CHOICE:-1}"

case "${MODE_CHOICE}" in
  1) DEPLOY_MODE="combined" ;;
  2) DEPLOY_MODE="standalone" ;;
  *) error "Invalid selection." ;;
esac

# ── Common variables ─────────────────────────────────────────────────────────

JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | xxd -p -c 32)
CREDENTIAL_ENCRYPTION_KEY=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | xxd -p -c 32)

# ── Combined mode configuration ─────────────────────────────────────────────

if [ "${DEPLOY_MODE}" = "combined" ]; then

  echo ""
  echo -e "${CYAN}── Domain Configuration ──────────────────${NC}"
  echo ""

  read -rp "Domain name (e.g. lab.dev): " DOMAIN_FQDN
  [ -z "${DOMAIN_FQDN}" ] && error "Domain name is required."

  # Validate domain has exactly two parts
  IFS='.' read -ra DOMAIN_PARTS <<< "${DOMAIN_FQDN}"
  [ "${#DOMAIN_PARTS[@]}" -ne 2 ] && error "Domain must have exactly two parts (e.g. lab.dev)"

  LDAP_BASE_DN="DC=${DOMAIN_PARTS[0]},DC=${DOMAIN_PARTS[1]}"
  SAMBA_REALM="$(echo "${DOMAIN_FQDN}" | tr '[:lower:]' '[:upper:]')"
  SAMBA_REALM_LOWER="$(echo "${DOMAIN_FQDN}" | tr '[:upper:]' '[:lower:]')"
  SAMBA_DOMAIN="$(echo "${DOMAIN_PARTS[0]}" | tr '[:lower:]' '[:upper:]')"

  while true; do
    read -rsp "Admin password (min 8 chars, upper+lower+number+special): " SAMBA_ADMIN_PASS
    echo ""
    if [ "${#SAMBA_ADMIN_PASS}" -lt 8 ]; then
      warn "Password must be at least 8 characters."
      continue
    fi
    read -rsp "Confirm password: " ADMIN_PASS_CONFIRM
    echo ""
    if [ "${SAMBA_ADMIN_PASS}" != "${ADMIN_PASS_CONFIRM}" ]; then
      warn "Passwords do not match."
      continue
    fi
    break
  done

  echo ""
  echo -e "${CYAN}── Network Binding ──────────────────────${NC}"
  echo ""
  echo "  1) Internal only (127.0.0.1) — accessible only from this machine"
  echo "  2) External (0.0.0.0) — accessible from the local network"
  echo ""
  read -rp "Binding mode [1]: " BIND_MODE
  BIND_MODE="${BIND_MODE:-1}"

  case "${BIND_MODE}" in
    2)
      BIND_IP="0.0.0.0"
      warn "External binding selected — DC will be accessible from the network!"
      warn "This is a lab server. Do NOT expose to untrusted networks."
      echo ""
      ;;
    *)
      BIND_IP="127.0.0.1"
      ;;
  esac

  read -rp "Install test data (users, groups, OUs)? [Y/n]: " INSTALL_SEED
  INSTALL_SEED="${INSTALL_SEED:-Y}"

  LDAP_URL="ldap://samba-ad:389"
  LDAPS_URL="ldaps://samba-ad:636"

fi

# ── Standalone mode configuration ────────────────────────────────────────────

if [ "${DEPLOY_MODE}" = "standalone" ]; then

  echo ""
  echo -e "${CYAN}── Samba4 DC Connection ──────────────────${NC}"
  echo ""

  read -rp "Samba4 Domain Controller (hostname/IP) [dc01.example.local]: " DC_HOST
  DC_HOST="${DC_HOST:-dc01.example.local}"

  read -rp "LDAP Base DN [DC=example,DC=local]: " LDAP_BASE_DN
  LDAP_BASE_DN="${LDAP_BASE_DN:-DC=example,DC=local}"

  echo ""
  echo "  LDAP Protocol:"
  echo "  [1] LDAPS — encrypted (recommended)"
  echo "  [2] LDAP  — unencrypted"
  echo ""
  read -rp "Selection [1]: " LDAP_CHOICE
  LDAP_CHOICE="${LDAP_CHOICE:-1}"

  case "${LDAP_CHOICE}" in
    1)
      LDAP_URL="ldap://${DC_HOST}:389"
      LDAPS_URL="ldaps://${DC_HOST}:636"
      ;;
    2)
      LDAP_URL="ldap://${DC_HOST}:389"
      LDAPS_URL=""
      ;;
    *)
      warn "Invalid selection, using LDAPS."
      LDAP_URL="ldap://${DC_HOST}:389"
      LDAPS_URL="ldaps://${DC_HOST}:636"
      ;;
  esac

fi

# ── SSL mode (Web UI) ───────────────────────────────────────────────────────

echo ""
echo -e "${CYAN}── SSL Mode (Web UI) ────────────────────${NC}"
echo ""
echo "  [1] None        — HTTP only (no certificate)"
echo "  [2] Self-signed — auto-generated certificate"
echo ""
read -rp "Selection [1]: " SSL_CHOICE
SSL_CHOICE="${SSL_CHOICE:-1}"

case "${SSL_CHOICE}" in
  1)
    SSL_MODE="none"
    DEFAULT_PORT=3000
    INTERNAL_PORT=3000
    PROTOCOL="http"
    ;;
  2)
    SSL_MODE="self-signed"
    DEFAULT_PORT=443
    INTERNAL_PORT=443
    PROTOCOL="https"
    ;;
  *)
    warn "Invalid selection, using none."
    SSL_MODE="none"
    DEFAULT_PORT=3000
    INTERNAL_PORT=3000
    PROTOCOL="http"
    ;;
esac

SSL_DOMAIN=""
if [ "${SSL_MODE}" = "self-signed" ]; then
  echo ""
  read -rp "Hostname for certificate [samba4-ad-webui.local]: " SSL_DOMAIN
  SSL_DOMAIN="${SSL_DOMAIN:-samba4-ad-webui.local}"
fi

echo ""
read -rp "Web UI port [${DEFAULT_PORT}]: " APP_PORT
APP_PORT="${APP_PORT:-${DEFAULT_PORT}}"

# ── Write .env ───────────────────────────────────────────────────────────────

info "Writing .env file..."

cat > "${SCRIPT_DIR}/.env" <<EOF
# === Deployment Mode ===
DEPLOY_MODE=${DEPLOY_MODE}

# === Web UI ===
LDAP_URL=${LDAP_URL}
LDAPS_URL=${LDAPS_URL}
LDAP_BASE_DN=${LDAP_BASE_DN}
LDAP_TLS_REJECT_UNAUTHORIZED=false
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRY=8h
CREDENTIAL_ENCRYPTION_KEY=${CREDENTIAL_ENCRYPTION_KEY}
SSL_MODE=${SSL_MODE}
SSL_DOMAIN=${SSL_DOMAIN}
APP_PORT=${APP_PORT}
APP_INTERNAL_PORT=${INTERNAL_PORT}
EOF

if [ "${DEPLOY_MODE}" = "combined" ]; then
  cat >> "${SCRIPT_DIR}/.env" <<EOF

# === Samba4 DC (combined mode only) ===
SAMBA_DOMAIN=${SAMBA_DOMAIN}
SAMBA_REALM=${SAMBA_REALM}
SAMBA_REALM_LOWER=${SAMBA_REALM_LOWER}
SAMBA_ADMIN_PASS=${SAMBA_ADMIN_PASS}
BIND_IP=${BIND_IP}
DNS_FORWARDER=8.8.8.8
EOF
fi

ok ".env created"

# ── Create directories ───────────────────────────────────────────────────────

mkdir -p "${SCRIPT_DIR}/docker/certs"
ok "Created docker/certs/ directory"

# ── Summary ──────────────────────────────────────────────────────────────────

echo ""
echo -e "${CYAN}── Configuration Summary ──────────────────${NC}"
echo ""
echo "  Mode:            ${DEPLOY_MODE}"

if [ "${DEPLOY_MODE}" = "combined" ]; then
  echo "  Domain:          ${DOMAIN_FQDN}"
  echo "  Realm:           ${SAMBA_REALM}"
  echo "  NetBIOS:         ${SAMBA_DOMAIN}"
  echo "  Base DN:         ${LDAP_BASE_DN}"
  echo "  Binding:         ${BIND_IP} ($([ "${BIND_IP}" = "127.0.0.1" ] && echo "internal only" || echo "external"))"
  echo "  Test data:       ${INSTALL_SEED}"
else
  echo "  DC:              ${DC_HOST}"
  echo "  Base DN:         ${LDAP_BASE_DN}"
  echo "  LDAP URL:        ${LDAP_URL}"
  echo "  LDAPS URL:       ${LDAPS_URL:-none}"
fi

echo "  SSL:             ${SSL_MODE}"
if [ -n "${SSL_DOMAIN}" ]; then
  echo "  SSL Domain:      ${SSL_DOMAIN}"
fi
echo "  Web UI:          ${PROTOCOL}://localhost:${APP_PORT}"
echo ""

# ── Start? ───────────────────────────────────────────────────────────────────

read -rp "Start now? [Y/n]: " START_NOW
START_NOW="${START_NOW:-Y}"

if [[ ! "${START_NOW}" =~ ^[Yy]$ ]]; then
  echo ""
  ok "Setup complete. Start manually with:"
  if [ "${DEPLOY_MODE}" = "combined" ]; then
    echo "    cd ${SCRIPT_DIR} && docker compose -f docker/docker-compose.yml up -d"
  else
    echo "    cd ${SCRIPT_DIR} && docker compose -f docker/docker-compose.standalone.yml up -d"
  fi
  echo ""
  exit 0
fi

# ── Start services ───────────────────────────────────────────────────────────

cd "${SCRIPT_DIR}"

if [ "${DEPLOY_MODE}" = "combined" ]; then

  info "Starting Samba AD DC..."
  docker compose -f docker/docker-compose.yml up -d samba-ad

  info "Waiting for Samba AD to become healthy (this takes ~60-90s on first run)..."
  RETRIES=0
  MAX_RETRIES=30
  until [ "$(docker inspect samba-ad --format '{{.State.Health.Status}}' 2>/dev/null)" = "healthy" ]; do
    RETRIES=$((RETRIES + 1))
    if [ "${RETRIES}" -ge "${MAX_RETRIES}" ]; then
      error "Samba AD did not become healthy after ${MAX_RETRIES} attempts. Check: docker logs samba-ad"
    fi
    sleep 5
  done
  ok "Samba AD is healthy"

  if [[ "${INSTALL_SEED}" =~ ^[Yy]$ ]]; then
    info "Running seed (creating test users and groups)..."
    docker compose -f docker/docker-compose.yml --profile seed up -d ldap-seed

    # Wait for seed to complete
    RETRIES=0
    until [ "$(docker inspect ldap-seed --format '{{.State.Status}}' 2>/dev/null)" = "exited" ]; do
      RETRIES=$((RETRIES + 1))
      if [ "${RETRIES}" -ge 60 ]; then
        warn "Seed container is still running after 60 attempts."
        break
      fi
      sleep 3
    done

    SEED_EXIT=$(docker inspect ldap-seed --format '{{.State.ExitCode}}' 2>/dev/null)
    if [ "${SEED_EXIT}" = "0" ]; then
      ok "Seed completed successfully"
    else
      warn "Seed exited with code ${SEED_EXIT}. Check: docker logs ldap-seed"
    fi
  fi

  info "Starting Web UI..."
  docker compose -f docker/docker-compose.yml up -d app
  ok "Web UI started"

else

  info "Starting Web UI (standalone)..."
  docker compose -f docker/docker-compose.standalone.yml up -d
  ok "Web UI started"

fi

# ── Done ─────────────────────────────────────────────────────────────────────

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Setup complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "  Web UI:  ${PROTOCOL}://localhost:${APP_PORT}"

if [ "${DEPLOY_MODE}" = "combined" ]; then
  echo ""
  echo "  AD Services (on ${BIND_IP}):"
  echo "    LDAP:    ldap://${BIND_IP}:389"
  echo "    LDAPS:   ldaps://${BIND_IP}:636"
  echo "    DNS:     ${BIND_IP}:53"
  echo ""
  echo "  Login:   CN=Administrator,CN=Users,${LDAP_BASE_DN}"
  echo "  Password: (as configured)"

  if [[ "${INSTALL_SEED}" =~ ^[Yy]$ ]]; then
    echo ""
    echo "  Test users (password: Test1234!):"
    echo "    - patrick.blattner  (Engineering)"
    echo "    - angela.mueller    (Management)"
    echo "    - max.tester        (QA)"
    echo "    - svc.app           (Service Account)"
    echo ""
    echo "  Groups:"
    echo "    - Engineers       (patrick.blattner, max.tester)"
    echo "    - Managers        (angela.mueller)"
    echo "    - QA              (max.tester)"
    echo "    - AllStaff        (nested: Engineers + Managers + QA)"
    echo "    - AppAccess       (patrick.blattner, angela.mueller)"
  fi
fi

if [ "${SSL_MODE}" = "self-signed" ]; then
  echo ""
  echo "  Note: Browsers will show a security warning for self-signed certificates."
  echo "  Add an exception or import docker/certs/server.crt into your trust store."
fi

echo ""
echo "  Teardown:  bash teardown.sh"
echo "  Updating:  docker compose -f docker/docker-compose$([ "${DEPLOY_MODE}" = "standalone" ] && echo ".standalone").yml pull && \\"
echo "             docker compose -f docker/docker-compose$([ "${DEPLOY_MODE}" = "standalone" ] && echo ".standalone").yml up -d"
echo ""
