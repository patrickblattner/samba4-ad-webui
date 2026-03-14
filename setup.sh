#!/bin/bash
set -e

echo ""
echo "╔═══════════════════════════════════════════╗"
echo "║   Samba4 AD WebUI – Ersteinrichtung       ║"
echo "╚═══════════════════════════════════════════╝"
echo ""

# ── docker-compose.yml erstellen (falls nicht vorhanden) ─────────────────────
if [ -f docker-compose.yml ]; then
  echo "ℹ docker-compose.yml existiert bereits – übersprungen"
else
  cat > docker-compose.yml <<'COMPOSE'
services:
  samba4-ad-webui:
    container_name: samba4-ad-webui
    image: ghcr.io/patrickblattner/samba4-ad-webui:latest
    # build:
    #   context: .
    #   dockerfile: docker/Dockerfile
    env_file: .env
    ports:
      - "${APP_PORT:-443}:${APP_INTERNAL_PORT:-443}"
    volumes:
      - ./certs:/app/certs
    restart: unless-stopped
COMPOSE
  echo "✓ docker-compose.yml erstellt"
fi

# ── Samba4 DC Hostname ──────────────────────────────────────────────────────
echo ""
read -p "Samba4 Domain Controller (Hostname/IP) [dc01.example.local]: " DC_HOST
DC_HOST="${DC_HOST:-dc01.example.local}"

# ── LDAP Base DN ────────────────────────────────────────────────────────────
echo ""
read -p "LDAP Base DN [DC=example,DC=local]: " BASE_DN
BASE_DN="${BASE_DN:-DC=example,DC=local}"

# ── LDAP Protokoll ──────────────────────────────────────────────────────────
echo ""
echo "LDAP-Protokoll:"
echo "  [1] LDAPS – verschlüsselt (empfohlen)"
echo "  [2] LDAP  – unverschlüsselt"
echo ""
read -p "Auswahl [1]: " LDAP_CHOICE
LDAP_CHOICE="${LDAP_CHOICE:-1}"

case "$LDAP_CHOICE" in
  1)
    LDAP_URL="ldap://$DC_HOST:389"
    LDAPS_URL="ldaps://$DC_HOST:636"
    ;;
  2)
    LDAP_URL="ldap://$DC_HOST:389"
    LDAPS_URL=""
    ;;
  *)
    echo "Ungültige Auswahl, LDAPS wird verwendet."
    LDAP_URL="ldap://$DC_HOST:389"
    LDAPS_URL="ldaps://$DC_HOST:636"
    ;;
esac

# ── SSL-Modus (Web-UI) ─────────────────────────────────────────────────────
echo ""
echo "SSL-Modus (Web-UI):"
echo "  [1] Self-signed  – automatisch generiertes Zertifikat (empfohlen intern)"
echo "  [2] Kein SSL     – nur HTTP"
echo ""
read -p "Auswahl [1]: " SSL_CHOICE
SSL_CHOICE="${SSL_CHOICE:-1}"

case "$SSL_CHOICE" in
  1)
    SSL_MODE="self-signed"
    DEFAULT_PORT=443
    INTERNAL_PORT=443
    PROTOCOL="https"
    ;;
  2)
    SSL_MODE="none"
    DEFAULT_PORT=3000
    INTERNAL_PORT=3000
    PROTOCOL="http"
    ;;
  *)
    echo "Ungültige Auswahl, Self-signed wird verwendet."
    SSL_MODE="self-signed"
    DEFAULT_PORT=443
    INTERNAL_PORT=443
    PROTOCOL="https"
    ;;
esac

# ── Domain/Hostname (nur bei Self-signed) ───────────────────────────────────
DOMAIN=""
if [ "$SSL_MODE" = "self-signed" ]; then
  echo ""
  read -p "Hostname für Zertifikat [samba4-ad-webui.local]: " DOMAIN
  DOMAIN="${DOMAIN:-samba4-ad-webui.local}"
fi

# ── Port ────────────────────────────────────────────────────────────────────
echo ""
read -p "Port [$DEFAULT_PORT]: " APP_PORT
APP_PORT="${APP_PORT:-$DEFAULT_PORT}"

# ── Secrets generieren ──────────────────────────────────────────────────────
JWT_SECRET=$(openssl rand -base64 48 2>/dev/null || head -c 48 /dev/urandom | base64)
ENCRYPTION_KEY=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | xxd -p -c 32)

# ── .env schreiben ──────────────────────────────────────────────────────────
cat > .env <<EOF
# Samba4 AD Connection
LDAP_URL=$LDAP_URL
LDAPS_URL=$LDAPS_URL
LDAP_BASE_DN=$BASE_DN

# SSL
SSL_MODE=$SSL_MODE
SSL_DOMAIN=$DOMAIN

# Security (auto-generated)
JWT_SECRET=$JWT_SECRET
CREDENTIAL_ENCRYPTION_KEY=$ENCRYPTION_KEY

# Server
PORT=3000
NODE_ENV=production
APP_PORT=$APP_PORT
APP_INTERNAL_PORT=$INTERNAL_PORT
EOF
echo "✓ .env erstellt"

# ── Benötigte Verzeichnisse anlegen ─────────────────────────────────────────
mkdir -p certs
echo "✓ Verzeichnis angelegt (certs)"

# ── Zusammenfassung ─────────────────────────────────────────────────────────
echo ""
echo "✓ Setup abgeschlossen!"
echo ""
echo "  Nächste Schritte:"
echo "    1. docker compose up -d"

if [ "$SSL_MODE" = "self-signed" ]; then
  echo "    2. Öffne $PROTOCOL://$DOMAIN:$APP_PORT"
else
  echo "    2. Öffne $PROTOCOL://localhost:$APP_PORT"
fi

echo "    3. Mit AD-Zugangsdaten einloggen"

if [ "$SSL_MODE" = "self-signed" ]; then
  echo ""
  echo "  Hinweis: Browser zeigen eine Sicherheitswarnung beim Self-signed Zertifikat."
  echo "  Zum Akzeptieren: Zertifikat im Browser als Ausnahme hinzufügen"
  echo "  oder unter certs/server.crt in der Firmen-CA importieren."
fi

echo ""
