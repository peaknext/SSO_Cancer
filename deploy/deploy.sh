#!/bin/bash
# ─── Build-in-place production deployment ─────────────────────────────────
#
# This script uses docker-compose.prod.yml which expects an EXTERNAL
# PostgreSQL database (no embedded db service). Ensure DATABASE_URL in
# .env.production points to a running PostgreSQL instance before deploying.
#
# For self-contained deployment (embedded PostgreSQL), use:
#   bash deploy/import-and-run.sh   (air-gapped)
#   bash deploy/pull-and-run.sh     (registry pull)
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.production"

echo "=== SSO Cancer Care — Production Deployment (build-in-place) ==="
echo ""

# ── Pre-flight checks ─────────────────────────────────────────────────────

if [ ! -f .env.production ]; then
  echo "ERROR: .env.production not found."
  echo "Copy .env.production.example to .env.production and fill in values."
  exit 1
fi

# Validate DATABASE_URL is set
if ! grep -qE '^DATABASE_URL=' .env.production 2>/dev/null; then
  echo "ERROR: DATABASE_URL is not set in .env.production."
  echo "docker-compose.prod.yml expects an external PostgreSQL database."
  echo ""
  echo "Set DATABASE_URL=postgresql://user:pass@host:5432/sso_cancer?schema=public"
  echo ""
  echo "For self-contained deployment with embedded PostgreSQL, use instead:"
  echo "  bash deploy/import-and-run.sh"
  exit 1
fi

# Check SSL certificates
if [ ! -f deploy/nginx/ssl/cert.pem ] || [ ! -f deploy/nginx/ssl/key.pem ]; then
  echo "WARNING: SSL certificates not found in deploy/nginx/ssl/"
  echo "Generate self-signed cert with:"
  echo "  mkdir -p deploy/nginx/ssl"
  echo "  openssl req -x509 -nodes -days 90 -newkey rsa:4096 \\"
  echo "    -keyout deploy/nginx/ssl/key.pem \\"
  echo "    -out deploy/nginx/ssl/cert.pem \\"
  echo "    -subj '/CN=sso-cancer.hospital.local'"
  echo ""
  read -p "Generate self-signed cert now? (Y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    mkdir -p deploy/nginx/ssl
    openssl req -x509 -nodes -days 90 -newkey rsa:4096 \
      -keyout deploy/nginx/ssl/key.pem \
      -out deploy/nginx/ssl/cert.pem \
      -subj '/CN=sso-cancer.hospital.local' 2>/dev/null
    echo "SSL certificates generated (90-day validity)."
  else
    read -p "Continue without SSL? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      exit 1
    fi
  fi
fi

# ── Step 1/5: Build Docker images ────────────────────────────────────────
echo ""
echo "1/5 — Building Docker images..."
${COMPOSE} build

# ── Step 2/5: Run database migrations ────────────────────────────────────
echo ""
echo "2/5 — Running database migrations..."
${COMPOSE} run --rm api \
  npx prisma migrate deploy --config prisma/prisma.config.ts

# ── Step 3/5: Run database seed ──────────────────────────────────────────
echo ""
echo "3/5 — Running database seed..."
${COMPOSE} run --rm api \
  node prisma/seed.js || {
    echo ""
    echo "WARNING: Seed failed! This is expected if data already exists."
    echo "Check logs above for unexpected errors."
  }

# ── Step 4/5: Start services ─────────────────────────────────────────────
echo ""
echo "4/5 — Starting services..."
${COMPOSE} up -d

# ── Step 5/5: Health check ────────────────────────────────────────────────
echo ""
echo "5/5 — Waiting for health checks..."
sleep 15

if curl -sf -k https://localhost/api/v1/health > /dev/null 2>&1; then
  echo ""
  echo "=== Deployment successful! ==="
  echo "API health: OK"
elif curl -sf http://localhost/api/v1/health > /dev/null 2>&1; then
  echo ""
  echo "=== Deployment successful (HTTP only) ==="
else
  echo ""
  echo "=== WARNING: Health check failed ==="
  echo "Check logs with: ${COMPOSE} logs"
fi

echo ""
${COMPOSE} ps
