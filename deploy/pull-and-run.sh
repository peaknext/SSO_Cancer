#!/bin/bash
# ─── Pull images from Docker Hub and start services ─────────────────────────
#
# Prerequisites:
#   1. Docker + Docker Compose installed
#   2. .env.production configured (with IMAGE_REGISTRY set to your Docker Hub username)
#   3. SSL certificates at deploy/nginx/ssl/
#   4. Internet access to Docker Hub (or hospital's private registry)
#
# Usage:
#   bash deploy/pull-and-run.sh              # pulls :latest
#   bash deploy/pull-and-run.sh v1.2.0       # pulls :v1.2.0
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

TAG="${1:-latest}"
COMPOSE_FILE="docker-compose.deploy.yml"
ENV_FILE=".env.production"

echo "=== SSO Cancer Care — Pull & Deploy ==="
echo "Image tag: ${TAG}"
echo ""

# ── Pre-flight checks ───────────────────────────────────────────────────────

if [ ! -f "${ENV_FILE}" ]; then
  echo "ERROR: ${ENV_FILE} not found."
  echo "Copy .env.production.example to .env.production and configure."
  exit 1
fi

# Load IMAGE_REGISTRY from env file
REGISTRY=$(grep -E '^IMAGE_REGISTRY=' "${ENV_FILE}" 2>/dev/null | cut -d= -f2- | tr -d '"' || true)
if [ -z "${REGISTRY}" ]; then
  echo "ERROR: IMAGE_REGISTRY is not set in ${ENV_FILE}"
  echo "Set it to your Docker Hub username, e.g.:"
  echo "  IMAGE_REGISTRY=yourusername/"
  echo ""
  echo "Note the trailing slash — this produces image names like:"
  echo "  yourusername/sso-cancer-api:${TAG}"
  exit 1
fi

echo "Registry: ${REGISTRY}"
echo "Images:   ${REGISTRY}sso-cancer-api:${TAG}"
echo "          ${REGISTRY}sso-cancer-web:${TAG}"
echo ""

# SSL check
if [ ! -f deploy/nginx/ssl/cert.pem ] || [ ! -f deploy/nginx/ssl/key.pem ]; then
  echo "WARNING: SSL certificates not found in deploy/nginx/ssl/"
  read -p "Generate self-signed cert now? (Y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    mkdir -p deploy/nginx/ssl
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout deploy/nginx/ssl/key.pem \
      -out deploy/nginx/ssl/cert.pem \
      -subj '/CN=sso-cancer.hospital.local' 2>/dev/null
    echo "SSL certificates generated."
  fi
fi

# ── Step 1: Pull images ─────────────────────────────────────────────────────
echo ""
echo "1/4 — Pulling images from registry..."
IMAGE_TAG="${TAG}" docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" pull api web

# ── Step 2: Stop existing services ──────────────────────────────────────────
echo ""
echo "2/4 — Stopping existing services (if any)..."
IMAGE_TAG="${TAG}" docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" down 2>/dev/null || true

# ── Step 3: Database + migrations ────────────────────────────────────────────
echo ""
echo "3/4 — Starting database and running migrations..."
IMAGE_TAG="${TAG}" docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" up -d db
echo "Waiting for database to be ready..."
sleep 10

IMAGE_TAG="${TAG}" docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" \
  run --rm api npx prisma migrate deploy --config dist/prisma/prisma.config.ts || {
    echo ""
    echo "WARNING: Migration failed. Check logs above for details."
  }

echo "Running database seed..."
IMAGE_TAG="${TAG}" docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" \
  run --rm api npx ts-node --transpile-only prisma/seed.ts || {
    echo ""
    echo "WARNING: Seed failed. Check logs above for details."
  }

# ── Step 4: Start all services ──────────────────────────────────────────────
echo ""
echo "4/4 — Starting all services..."
IMAGE_TAG="${TAG}" docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" up -d

# ── Health check ─────────────────────────────────────────────────────────────
echo ""
echo "Waiting for services to start (30s)..."
sleep 30

echo ""
echo "Service status:"
IMAGE_TAG="${TAG}" docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" ps

echo ""
if curl -sf -k https://localhost/api/v1/health > /dev/null 2>&1; then
  echo "=== Deployment successful! ==="
  echo ""
  echo "Access: https://$(hostname -f 2>/dev/null || echo 'your-server-ip')"
elif curl -sf http://localhost/api/v1/health > /dev/null 2>&1; then
  echo "=== Deployment successful (HTTP only) ==="
else
  echo "=== WARNING: Health check failed ==="
  echo "Check logs: IMAGE_TAG=${TAG} docker compose -f ${COMPOSE_FILE} --env-file ${ENV_FILE} logs"
fi
