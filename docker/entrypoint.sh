#!/bin/sh
set -e

# Generate self-signed certificate if needed
if [ "$SSL_MODE" = "self-signed" ]; then
  CERT_DIR="/app/certs"
  CERT_FILE="$CERT_DIR/server.crt"
  KEY_FILE="$CERT_DIR/server.key"

  if [ ! -f "$CERT_FILE" ] || [ ! -f "$KEY_FILE" ]; then
    echo "Generating self-signed SSL certificate..."
    mkdir -p "$CERT_DIR"
    apk add --no-cache openssl > /dev/null 2>&1 || true
    openssl req -x509 -newkey rsa:4096 -keyout "$KEY_FILE" -out "$CERT_FILE" \
      -days 365 -nodes -subj "/CN=${SSL_DOMAIN:-localhost}" \
      -addext "subjectAltName=DNS:${SSL_DOMAIN:-localhost},DNS:localhost,IP:127.0.0.1" 2>/dev/null
    echo "SSL certificate generated for ${SSL_DOMAIN:-localhost}"
  else
    echo "SSL certificate already exists, skipping generation"
  fi
fi

exec node server/dist/index.js
