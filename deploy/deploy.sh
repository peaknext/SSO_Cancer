#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

echo "=== SSO Cancer Care — Production Deployment ==="
echo ""

# Check .env.production exists
if [ ! -f .env.production ]; then
  echo "ERROR: .env.production not found."
  echo "Copy .env.production.example to .env.production and fill in values."
  exit 1
fi

# Check SSL certificates exist
if [ ! -f deploy/nginx/ssl/cert.pem ] || [ ! -f deploy/nginx/ssl/key.pem ]; then
  echo "WARNING: SSL certificates not found in deploy/nginx/ssl/"
  echo "Generate self-signed cert with:"
  echo "  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \\"
  echo "    -keyout deploy/nginx/ssl/key.pem \\"
  echo "    -out deploy/nginx/ssl/cert.pem \\"
  echo "    -subj '/CN=sso-cancer.hospital.local'"
  echo ""
  read -p "Continue without SSL? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

echo "1/4 — Building Docker images..."
docker compose -f docker-compose.prod.yml build

echo "2/4 — Running database migrations..."
docker compose -f docker-compose.prod.yml run --rm api \
  npx prisma migrate deploy --config prisma/prisma.config.ts

echo "3/4 — Starting services..."
docker compose -f docker-compose.prod.yml --env-file .env.production up -d

echo "4/4 — Waiting for health checks..."
sleep 15

if curl -sf -k https://localhost/api/v1/health > /dev/null 2>&1; then
  echo ""
  echo "=== Deployment successful! ==="
  echo "API health: OK"
else
  echo ""
  echo "=== WARNING: Health check failed ==="
  echo "Check logs with: docker compose -f docker-compose.prod.yml logs"
fi

echo ""
docker compose -f docker-compose.prod.yml ps
