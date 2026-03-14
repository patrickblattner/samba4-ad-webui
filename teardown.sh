#!/bin/bash
# ============================================================================
# Samba4 AD WebUI — Teardown Script
# Removes all containers, volumes, and generated configuration
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }

echo ""
echo -e "${RED}This will remove all containers, volumes, and generated configuration.${NC}"
echo -e "${RED}All AD data will be permanently deleted.${NC}"
echo ""
read -rp "Are you sure? [y/N]: " CONFIRM
[[ "${CONFIRM}" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 0; }

# Stop and remove containers + volumes (combined mode)
if [ -f "${SCRIPT_DIR}/docker/docker-compose.yml" ]; then
  info "Stopping containers (combined mode)..."
  cd "${SCRIPT_DIR}"
  docker compose --env-file .env -f docker/docker-compose.yml --profile seed down -v 2>/dev/null || true
fi

# Stop and remove containers + volumes (standalone mode)
if [ -f "${SCRIPT_DIR}/docker/docker-compose.standalone.yml" ]; then
  info "Stopping containers (standalone mode)..."
  cd "${SCRIPT_DIR}"
  docker compose --env-file .env -f docker/docker-compose.standalone.yml down -v 2>/dev/null || true
fi

# Remove .env
if [ -f "${SCRIPT_DIR}/.env" ]; then
  info "Removing .env..."
  rm -f "${SCRIPT_DIR}/.env"
fi

# Remove generated certs
if [ -d "${SCRIPT_DIR}/docker/certs" ]; then
  info "Removing docker/certs/..."
  rm -rf "${SCRIPT_DIR}/docker/certs"
fi

ok "Teardown complete. All containers, volumes, and generated files removed."
echo ""
